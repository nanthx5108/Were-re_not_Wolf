import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection.js';
import {
  createRoom,
  addPlayerToRoom,
  getRoom,
  serializeRoom,
} from '../game/gameStore.js';
import { PLAYER_LIMITS } from '../game/constants.js';

export async function createRoomService({ hostNickname, roomName, userId }) {
  const roomId = generateRoomCode();
  const hostId = userId || uuidv4(); // ถ้า login อยู่ ใช้ user.id เป็น playerId เพื่อให้ผูกสถิติ (games_played) กับ account ได้

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO rooms (id, name, host_id, max_players) VALUES (?, ?, ?, ?)`,
      [roomId, roomName.trim(), hostId, PLAYER_LIMITS.MAX]
    );
    await conn.query(
      `INSERT INTO players (id, room_id, nickname) VALUES (?, ?, ?)`,
      [hostId, roomId, hostNickname.trim()]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  createRoom({ id: roomId, name: roomName.trim(), hostId });

  return { roomId, playerId: hostId };
}

export async function getRoomService(roomId) {
  const [rows] = await pool.query(
    `SELECT r.id, r.name, r.host_id, r.status, r.max_players,
            p.id AS player_id, p.nickname, p.is_alive
     FROM rooms r
     LEFT JOIN players p ON p.room_id = r.id
     WHERE r.id = ?`,
    [roomId.toUpperCase()]
  );

  if (!rows.length) return null;

  const first = rows[0];
  return {
    id:         first.id,
    name:       first.name,
    hostId:     first.host_id,
    status:     first.status,
    maxPlayers: first.max_players,
    players: rows
      .filter(r => r.player_id)
      .map(r => ({ id: r.player_id, nickname: r.nickname, isAlive: !!r.is_alive })),
  };
}

export async function joinRoomService({ roomId, nickname, userId }) {
  const upperRoomId = roomId.toUpperCase();

  const [roomRows] = await pool.query(
    `SELECT id, status FROM rooms WHERE id = ?`,
    [upperRoomId]
  );
  if (!roomRows.length) throw Object.assign(new Error('Room not found.'), { status: 404 });
  if (roomRows[0].status !== 'waiting') throw Object.assign(new Error('Game already in progress.'), { status: 409 });

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM players WHERE room_id = ?`,
    [upperRoomId]
  );
  if (countRows[0].cnt >= PLAYER_LIMITS.MAX) {
    throw Object.assign(new Error(`Room is full (max ${PLAYER_LIMITS.MAX} players).`), { status: 409 });
  }

  const playerId = userId || uuidv4();
  await pool.query(
    `INSERT INTO players (id, room_id, nickname) VALUES (?, ?, ?)`,
    [playerId, upperRoomId, nickname.trim()]
  );

  return { roomId: upperRoomId, playerId };
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}