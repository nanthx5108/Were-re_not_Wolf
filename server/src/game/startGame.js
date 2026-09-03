import pool from '../../db/connection.js';
import {
  getRoom,
  getPlayersArray,
  updatePlayer,
  updateRoom,
  getConnectedPlayers,
  serializeRoom,
} from './gameStore.js';
import { distributeRoles } from './Roledistributor.js';
import { PLAYER_LIMITS, CHANNELS, PHASES } from './constants.js';
import {
  validateConfigForPlayerCount,
  buildDefaultRoleConfig,
  buildChaosRoleConfig,
  CHAOS_PHASE_DURATIONS,
  GAME_MODES,
} from './roomConfig.js';

const startingRooms = new Set();

export async function startGameForRoom(io, roomId, options = {}) {
  const { callerPlayerId = null, forceStart = false } = options;
  const liveRoom = getRoom(roomId);
  if (!liveRoom) return { ok: false, status: 404, error: 'Room not found.' };

  if (liveRoom.status !== 'waiting') {
    return { ok: false, status: 409, error: 'Game already started.' };
  }

  if (startingRooms.has(roomId)) {
    return { ok: false, status: 409, error: 'Game start is already in progress.' };
  }
  startingRooms.add(roomId);

  try {
  if (!forceStart && callerPlayerId && String(liveRoom.hostId) !== String(callerPlayerId)) {
    return { ok: false, status: 403, error: 'Only the host can start.' };
  }

  const players = getPlayersArray(roomId);
  if (players.length === 0) {
    return { ok: false, status: 422, error: 'At least one player is required.' };
  }
  if (players.length < PLAYER_LIMITS.MIN && !forceStart) {
    return { ok: false, status: 422, error: `Need at least ${PLAYER_LIMITS.MIN} players.` };
  }

  const isChaos = liveRoom.gameMode === GAME_MODES.CHAOS;
  if (isChaos) {
    updateRoom(roomId, { phaseDurations: { ...CHAOS_PHASE_DURATIONS } });
  }

  const roleConfig = forceStart && players.length < PLAYER_LIMITS.MIN
    ? { werewolf: 1, seer: 0, bodyguard: 0, silencer: 0, fool: 0 }
    : isChaos
    ? buildChaosRoleConfig(players.length)
    : (liveRoom.roleConfig || buildDefaultRoleConfig(players.length));

  const configError = validateConfigForPlayerCount(roleConfig, players.length);
  if (configError && !(forceStart && players.length < PLAYER_LIMITS.MIN)) {
    return { ok: false, status: 422, error: configError };
  }

  if (isChaos) updateRoom(roomId, { roleConfig });

  const assigned = distributeRoles(players, roleConfig, { allowBelowMinimum: forceStart });
  for (const p of assigned) {
    updatePlayer(roomId, p.id, { role: p.role });
    await pool.query(`UPDATE players SET role = ? WHERE id = ?`, [p.role, p.id]);
  }

  updateRoom(roomId, { status: 'in_progress', phase: PHASES.NIGHT_ZERO, round: 0, readyPlayers: new Set() });
  await pool.query(`UPDATE rooms SET status = 'in_progress' WHERE id = ?`, [roomId]);

  const wolves = assigned.filter(p => p.role === 'werewolf');
  for (const p of assigned) {
    const s = findSocketByPlayerId(io, p.id);
    if (!s) continue;

    const teammates = p.role === 'werewolf'
      ? wolves.filter(w => w.id !== p.id).map(w => ({ id: w.id, nickname: w.nickname }))
      : undefined;

    s.emit('game:started', {
      phase: PHASES.NIGHT_ZERO,
      myRole: p.role,
      endsAt: null,
      durationMs: null,
      round: 0,
      teammates,
    });
  }

  io.to(roomId).emit('room:state', serializeRoom(roomId));
  io.to(roomId).emit('nightzero:ready', { readyCount: 0, total: getConnectedPlayers(roomId).length });
  io.to(roomId).emit('chat:message', {
    id: `sys-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: forceStart
      ? 'แอดมินบังคับเริ่มเกม — เปิดการ์ดดูบทบาทของเจ้าให้ดี แล้วกด "ดูแล้ว" เมื่อพร้อม'
      : 'คืนก่อนเริ่มเกม — เปิดการ์ดดูบทบาทของเจ้าให้ดี แล้วกด "ดูแล้ว" เมื่อพร้อม',
    sentAt: new Date().toISOString(),
  });

  return { ok: true, assigned };
  } finally {
    startingRooms.delete(roomId);
  }
}

function findSocketByPlayerId(io, playerId) {
  for (const [, s] of io.sockets.sockets) {
    if (s.data?.playerId === playerId) return s;
  }
  return null;
}
