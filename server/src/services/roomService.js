
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection.js';
import {
  createRoom,
  addPlayerToRoom,
  getRoom,
  serializeRoom,
} from '../game/gameStore.js';
import { PLAYER_LIMITS } from '../game/constants.js';
import { getRoomPlayerLimit } from '../game/roomCapacity.js';
import { buildDefaultRoomConfig } from '../game/roomConfig.js';

export async function createRoomService({ hostNickname, roomName, userId, maxPlayers, isPrivate, config }) {
  const roomId = generateRoomCode();
  const hostId = userId || uuidv4();

  const safeMaxPlayers = clampMaxPlayers(maxPlayers);
  const safeIsPrivate  = !!isPrivate;
  const safeConfig     = config || buildDefaultRoomConfig(safeMaxPlayers);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO rooms (id, name, host_id, max_players, is_private, config) VALUES (?, ?, ?, ?, ?, ?)`,
      [roomId, roomName.trim(), hostId, safeMaxPlayers, safeIsPrivate, JSON.stringify(safeConfig)]
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

  createRoom({
    id: roomId, name: roomName.trim(), hostId,
    maxPlayers: safeMaxPlayers, isPrivate: safeIsPrivate, config: safeConfig,
  });
  addPlayerToRoom(roomId, { id: hostId, nickname: hostNickname.trim() });

  return { roomId, playerId: hostId };
}

function clampMaxPlayers(value) {
  const n = Number(value);
  if (!Number.isInteger(n)) return PLAYER_LIMITS.MAX;
  return Math.min(PLAYER_LIMITS.MAX, Math.max(PLAYER_LIMITS.MIN, n));
}

export async function listRoomsService() {
  const [rows] = await pool.query(
    `SELECT r.id, r.name, r.status, r.max_players, r.is_private, h.nickname AS host_nickname,
            COUNT(p.id) AS player_count
     FROM rooms r
     LEFT JOIN players p ON p.room_id = r.id
     LEFT JOIN players h ON h.id = r.host_id
     WHERE r.status != 'finished'
     GROUP BY r.id, h.nickname
     ORDER BY r.created_at DESC
     LIMIT 50`
  );

  return rows.map(r => ({
    id:          r.id,
    name:        r.name,
    status:      r.status,
    maxPlayers:  r.max_players,
    playerCount: r.player_count,
    isPrivate:   !!r.is_private,
    host:        r.host_nickname || null,
  }));
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
  const upperRoomId = String(roomId).toUpperCase();

  const [roomRows] = await pool.query(
    `SELECT id, status, max_players FROM rooms WHERE id = ?`,
    [upperRoomId]
  );
  if (!roomRows.length) throw Object.assign(new Error('Room not found.'), { status: 404 });
  if (roomRows[0].status !== 'waiting') throw Object.assign(new Error('Game already in progress.'), { status: 409 });

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM players WHERE room_id = ?`,
    [upperRoomId]
  );
  const roomLimit = getRoomPlayerLimit({ maxPlayers: roomRows[0].max_players });
  if (countRows[0].cnt >= roomLimit) {
    throw Object.assign(new Error(`Room is full (max ${roomLimit} players).`), { status: 409 });
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








