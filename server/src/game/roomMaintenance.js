// การกวาดล้างห้อง — กันไม่ให้ห้องที่ไม่มีใครอยู่ค้างอยู่ทั้งใน memory และ DB
//
// ที่มาของ "ห้องค้าง":
//  1. สร้างห้องผ่าน REST แล้วปิดแท็บก่อน socket จะ connect — ไม่มี disconnect event ให้จับ
//  2. server restart — memory ล้างหมด แต่ row ห้องใน DB ยังอยู่ กลายเป็นห้องผีที่ join ไม่ได้
//
// วิธีจัดการ:
//  - startup: ลบห้องที่ยังไม่จบทั้งหมดใน DB ทิ้ง (พอ server เพิ่งเริ่ม memory ว่าง = ทุกห้องใน DB คือผี)
//  - sweep เป็นระยะ: ห้องรอเล่นที่ไม่มีใคร connect เกิน grace → ปิดทิ้ง
//    (ห้องกำลังเล่นปล่อยให้ abandon timer 5 นาทีใน phaseManager จัดการ เผื่อคนกลับมาต่อ)

import pool from '../../db/connection.js';
import { getAllRooms, getConnectedPlayers, deleteRoom } from './gameStore.js';
import { clearPhaseTimer, cancelRoomAbandon } from './phaseManager.js';
import { clearVoting } from './voteManager.js';
import { getSetting } from '../services/gameSettingsService.js';

// ปิดห้อง + เก็บกวาด timer/vote ให้เรียบ แล้วลบทั้งใน memory และ DB
// ใช้ร่วมกับ socketHandlers.destroyRoom เพื่อไม่ให้ logic การปิดห้องแตกเป็นสองที่
export async function teardownRoom(roomId) {
  clearPhaseTimer(roomId);
  cancelRoomAbandon(roomId);
  clearVoting(roomId);
  deleteRoom(roomId);
  await pool.query(`DELETE FROM rooms WHERE id = ?`, [roomId]);
}

// เรียกครั้งเดียวตอน server boot — ล้างห้องผีที่ค้างจาก process ก่อนหน้า
export async function purgeStaleRoomsOnStartup() {
  const [result] = await pool.query(
    `DELETE FROM rooms WHERE status IN ('waiting', 'in_progress')`
  );
  if (result.affectedRows > 0) {
    console.log(`🧹 ล้างห้องค้างจากรอบก่อน ${result.affectedRows} ห้อง`);
  }
}

// เดินตรวจเป็นระยะ ลบห้องรอเล่นที่ไม่มีใคร connect อยู่จริง
export function startRoomSweep() {
  const SWEEP_INTERVAL_MS = getSetting('room.sweep_interval_ms', 30000);
  const EMPTY_ROOM_GRACE_MS = getSetting('room.empty_grace_ms', 60000);

  const timer = setInterval(() => {
    const now = Date.now();
    for (const room of getAllRooms()) {
      // ไม่มีผู้เล่นเหลือเลย — ปิดได้ทันที ไม่ต้องรอ grace
      if (room.players.size === 0) {
        console.log(`[Room Sweep] Tearing down room ${room.id} (no players).`);
        teardownRoom(room.id).catch(err => console.error('[room sweep]', err));
        continue;
      }

      const connected = getConnectedPlayers(room.id).length;
      if (connected > 0) {
        room._emptySince = null;
        continue;
      }

      // ห้องกำลังเล่นที่คนหลุดหมด: ปล่อยให้ abandon timer (5 นาที) จัดการ เผื่อคนกลับมา
      if (room.status === 'in_progress') continue;

      // ห้องรอเล่นที่ไม่มีใคร connect — เริ่มจับเวลา grace ก่อนปิด
      if (!room._emptySince) {
        room._emptySince = now;
        continue;
      }
      if (now - room._emptySince >= EMPTY_ROOM_GRACE_MS) {
        console.log(`[Room Sweep] Tearing down room ${room.id} (empty grace period expired).`);
        teardownRoom(room.id).catch(err => console.error('[room sweep]', err));
      }
    }
  }, SWEEP_INTERVAL_MS);

  // interval ไม่ควรกันไม่ให้ process ปิดตัวตอน shutdown
  timer.unref?.();
  return timer;
}
