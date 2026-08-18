import pool from '../../db/connection.js';
import { getAllRooms, getConnectedPlayers, deleteRoom } from './gameStore.js';
import { clearPhaseTimer, cancelRoomAbandon } from './phaseManager.js';
import { clearVoting } from './voteManager.js';
import { getSetting } from '../services/gameSettingsService.js';

export async function teardownRoom(roomId) {
  clearPhaseTimer(roomId);
  cancelRoomAbandon(roomId);
  clearVoting(roomId);
  deleteRoom(roomId);
  await pool.query(`DELETE FROM rooms WHERE id = ?`, [roomId]);
}

export async function purgeStaleRoomsOnStartup() {
  const [result] = await pool.query(
    `DELETE FROM rooms WHERE status IN ('waiting', 'in_progress')`
  );
  if (result.affectedRows > 0) {
    console.log(`🧹 ล้างห้องค้างจากรอบก่อน ${result.affectedRows} ห้อง`);
  }
}

export function startRoomSweep() {
  const SWEEP_INTERVAL_MS = getSetting('room.sweep_interval_ms', 30000);
  const EMPTY_ROOM_GRACE_MS = getSetting('room.empty_grace_ms', 60000);

  const timer = setInterval(() => {
    const now = Date.now();
    for (const room of getAllRooms()) {
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

      if (room.status === 'in_progress') continue;

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

  timer.unref?.();
  return timer;
}
