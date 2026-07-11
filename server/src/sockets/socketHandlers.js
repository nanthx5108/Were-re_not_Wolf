import pool from '../../db/connection.js';
import {
  getRoom, addPlayerToRoom, removePlayerFromRoom,
  updatePlayer, getPlayersArray, getConnectedPlayers,
  serializeRoom, serializeRoomForPlayer, updateRoom, deleteRoom,
} from '../game/gameStore.js';
import { distributeRoles }   from '../game/Roledistributor.js';
import { PLAYER_LIMITS, CHANNELS, PHASES } from '../game/constants.js';
import { canJoinRoom } from '../game/roomCapacity.js';
import { validateConfigForPlayerCount, buildDefaultRoleConfig } from '../game/roomConfig.js';
import {
  startPhaseTimer, advancePhase, clearPhaseTimer, getPhaseDurationMs,
  endGameIfDecided, scheduleRoomAbandon, cancelRoomAbandon,
} from '../game/phaseManager.js';
import { castVote, hasAllVoted, clearVoting } from '../game/voteManager.js';
import { initNightActions, submitNightAction, getBlockedProtectTargets } from '../game/nightActions.js';

export function registerSocketHandlers(socket, io) {

  socket.on('room:join', async ({ roomId, playerId, nickname }) => {
    try {
      const room = getRoom(roomId);
      if (!room) return socket.emit('error', { message: 'Room not found.' });

      // ผู้เล่นที่อยู่ในห้องอยู่แล้ว = กลับเข้ามาใหม่ (รีเฟรช/เน็ตหลุด) — ไม่ใช่คนใหม่
      const existing = room.players.get(playerId);
      if (existing) return handleRejoin(socket, io, roomId, playerId);

      if (room.status !== 'waiting') return socket.emit('error', { message: 'Game already in progress.' });
      if (!canJoinRoom(room, room.players.size)) return socket.emit('error', { message: 'Room is full.' });

      addPlayerToRoom(roomId, { id: playerId, nickname, socketId: socket.id });
      await pool.query(`UPDATE players SET socket_id = ? WHERE id = ?`, [socket.id, playerId]);

      socket.join(roomId);
      socket.data = { roomId, playerId, nickname };

      socket.emit('room:state', serializeRoomForPlayer(roomId, playerId));
      io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);
      io.to(roomId).emit('chat:message', {
        id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
        content: `${nickname} arrived on the island.`,
        sentAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[socket room:join]', err);
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  socket.on('room:leave', () => handleLeave(socket, io));
  socket.on('disconnect', () => handleDisconnect(socket, io));

  socket.on('chat:send', async ({ content, channel = CHANNELS.VILLAGE }) => {
    const { roomId, playerId, nickname } = socket.data || {};
    if (!roomId || !playerId) return;

    const room   = getRoom(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player?.isAlive) return socket.emit('error', { message: 'Dead players cannot chat.' });

    // Silencer ปิดปากไว้เมื่อคืน — มีผลตลอดวันนี้ ทุกช่องแชท
    if (room.silencedPlayerId === playerId) {
      return socket.emit('error', { message: 'เจ้าถูกปิดปากไว้ วันนี้พูดไม่ได้' });
    }

    if (channel === CHANNELS.WEREWOLF && player.role !== 'werewolf') {
      return socket.emit('error', { message: 'Only werewolves can use this channel.' });
    }

    const message = {
      id:      `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId, nickname, channel,
      content: content.trim().slice(0, 300),
      sentAt:  new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO messages (room_id, player_id, nickname, content, channel) VALUES (?, ?, ?, ?, ?)`,
      [roomId, playerId, nickname, message.content, channel]
    );

    if (channel === CHANNELS.WEREWOLF) {
      broadcastToRole(io, room, 'werewolf', 'chat:message', message);
    } else {
      io.to(roomId).emit('chat:message', message);
    }
  });

  socket.on('game:start', async () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId) return;

    const room = getRoom(roomId);
    if (!room)                     return socket.emit('error', { message: 'Room not found.' });
    if (room.hostId !== playerId)  return socket.emit('error', { message: 'Only the host can start.' });
    if (room.status !== 'waiting') return socket.emit('error', { message: 'Game already started.' });

    const players = getPlayersArray(roomId);
    if (players.length < PLAYER_LIMITS.MIN) {
      return socket.emit('error', { message: `Need at least ${PLAYER_LIMITS.MIN} players.` });
    }

    // config ตั้งไว้ตาม maxPlayers แต่คนเข้าจริงอาจน้อยกว่า — ต้องเช็คกับจำนวนจริงก่อนแจกบทบาท
    const roleConfig = room.roleConfig || buildDefaultRoleConfig(players.length);
    const configError = validateConfigForPlayerCount(roleConfig, players.length);
    if (configError) return socket.emit('error', { message: configError });

    const assigned = distributeRoles(players, roleConfig);
    for (const p of assigned) {
      updatePlayer(roomId, p.id, { role: p.role });
      await pool.query(`UPDATE players SET role = ? WHERE id = ?`, [p.role, p.id]);
    }

    updateRoom(roomId, { status: 'in_progress', phase: PHASES.NIGHT, round: 1 });
    initNightActions(roomId);
    await pool.query(`UPDATE rooms SET status = 'in_progress' WHERE id = ?`, [roomId]);

    const durationMs = getPhaseDurationMs(roomId, PHASES.NIGHT);
    const endsAt = startPhaseTimer(io, roomId, PHASES.NIGHT);

    const wolves = assigned.filter(p => p.role === 'werewolf');

    for (const p of assigned) {
      const s = findSocketByPlayerId(io, p.id);
      if (!s) continue;

      // หมาป่าเห็นทีมกันเอง — คนอื่นไม่ได้รับ field นี้เลย
      const teammates = p.role === 'werewolf'
        ? wolves.filter(w => w.id !== p.id).map(w => ({ id: w.id, nickname: w.nickname }))
        : undefined;

      s.emit('game:started', {
        phase: PHASES.NIGHT, myRole: p.role, endsAt, durationMs, round: 1, teammates,
      });
    }

    io.to(roomId).emit('room:state', serializeRoom(roomId));
    io.to(roomId).emit('chat:message', {
      id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
      content: '🌙 ค่ำคืนมาถึง... หมู่บ้านหลับใหล',
      sentAt: new Date().toISOString(),
    });
  });

  socket.on('night:action', ({ targetId }) => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const room = getRoom(roomId);
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.phase !== PHASES.NIGHT) return socket.emit('error', { message: 'Not night phase.' });

    const player = room.players.get(playerId);
    if (!player?.isAlive) return socket.emit('error', { message: 'Dead players cannot act.' });

    if (getBlockedProtectTargets(roomId, playerId).includes(targetId)) {
      return socket.emit('error', { message: 'เจ้าเพิ่งเฝ้าคนนี้เมื่อคืน — ห้ามป้องกันคนเดิม 2 คืนติด' });
    }

    const action = submitNightAction(roomId, playerId, { targetId });
    if (!action) return socket.emit('error', { message: 'Invalid night action.' });

    socket.emit('night:action:ack', { targetId });

    // เฉพาะหมาป่าเท่านั้นที่เห็นเป้าหมายของเพื่อนร่วมทีม — role ห้ามหลุดออกนอก socket เจ้าตัว
    if (player.role === 'werewolf') {
      broadcastToRole(io, room, 'werewolf', 'night:action:update', {
        playerId,
        nickname: player.nickname,
        targetId,
      });
    }
  });

  socket.on('vote:cast', ({ targetId }) => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const room = getRoom(roomId);
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.phase !== PHASES.VOTING) return socket.emit('error', { message: 'Not voting phase.' });

    const player = room.players.get(playerId);
    if (!player?.isAlive) return socket.emit('error', { message: 'Dead players cannot vote.' });

    const target = room.players.get(targetId);
    if (!target)          return socket.emit('error', { message: 'Player not found.' });
    if (!target.isAlive)  return socket.emit('error', { message: 'Cannot vote for dead player.' });
    if (targetId === playerId) return socket.emit('error', { message: 'Cannot vote for yourself.' });

    const voteData = castVote(roomId, playerId, targetId);
    if (!voteData) return socket.emit('error', { message: 'Voting not initialized.' });

    io.to(roomId).emit('vote:update', voteData);

    const alivePlayers = getPlayersArray(roomId).filter(p => p.isAlive);
    if (hasAllVoted(roomId, alivePlayers.map(p => p.id))) {
      advancePhase(io, roomId).catch(err =>
        console.error('[vote early advance]', err)
      );
    }
  });
  socket.on('phase:advance', () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId) return;

    const room = getRoom(roomId);
    if (!room)                         return socket.emit('error', { message: 'Room not found.' });
    if (room.hostId !== playerId)      return socket.emit('error', { message: 'Only the host can skip.' });
    if (room.status !== 'in_progress') return socket.emit('error', { message: 'Game not in progress.' });

    advancePhase(io, roomId).catch(err =>
      console.error('[phase:advance]', err)
    );
  });
}

// กลับเข้าห้องเดิม — ต้องคืน state ส่วนตัวให้ครบ ไม่งั้นผู้เล่นจะเล่นต่อไม่ได้
async function handleRejoin(socket, io, roomId, playerId) {
  const room = getRoom(roomId);
  const player = room.players.get(playerId);

  updatePlayer(roomId, playerId, { socketId: socket.id, isConnected: true });
  await pool.query(`UPDATE players SET socket_id = ? WHERE id = ?`, [socket.id, playerId]);

  socket.join(roomId);
  socket.data = { roomId, playerId, nickname: player.nickname };
  cancelRoomAbandon(roomId);

  socket.emit('room:state', serializeRoomForPlayer(roomId, playerId));

  if (room.status === 'in_progress') {
    const teammates = player.role === 'werewolf'
      ? getPlayersArray(roomId)
          .filter(p => p.role === 'werewolf' && p.id !== playerId)
          .map(p => ({ id: p.id, nickname: p.nickname }))
      : undefined;

    socket.emit('game:resumed', {
      phase:          room.phase,
      round:          room.round,
      endsAt:         room.phaseEndsAt,
      durationMs:     getPhaseDurationMs(roomId, room.phase),
      myRole:         player.role,
      teammates,
      isSilenced:     room.silencedPlayerId === playerId,
      blockedTargets: getBlockedProtectTargets(roomId, playerId),
      messages:       await loadRecentMessages(roomId, player.role),
    });
  }

  io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);
  io.to(roomId).emit('chat:message', {
    id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
    content: `${player.nickname} กลับเข้าเกาะแล้ว`,
    sentAt: new Date().toISOString(),
  });
}

// แชทย้อนหลัง — คนที่ไม่ใช่หมาป่าต้องไม่เห็นช่องหมาป่า
async function loadRecentMessages(roomId, role) {
  const channels = role === 'werewolf'
    ? [CHANNELS.VILLAGE, CHANNELS.SYSTEM, CHANNELS.WEREWOLF]
    : [CHANNELS.VILLAGE, CHANNELS.SYSTEM];

  const [rows] = await pool.query(
    `SELECT id, player_id, nickname, content, channel, sent_at
     FROM messages
     WHERE room_id = ? AND channel IN (${channels.map(() => '?').join(',')})
     ORDER BY sent_at DESC, id DESC
     LIMIT 100`,
    [roomId, ...channels]
  );

  return rows.reverse().map(r => ({
    id:       `db-${r.id}`,
    playerId: r.player_id,
    nickname: r.nickname,
    channel:  r.channel,
    content:  r.content,
    sentAt:   new Date(r.sent_at).toISOString(),
  }));
}

// เน็ตหลุด/ปิดแท็บ — ระหว่างเกมยังไม่ถือว่าออก เผื่อกลับมา
async function handleDisconnect(socket, io) {
  const { roomId, playerId, nickname } = socket.data || {};
  if (!roomId || !playerId) return;

  const room = getRoom(roomId);
  if (!room) return;

  // ยังไม่เริ่มเกม — หลุดคือออกไปเลย ไม่มีอะไรให้กลับมาหา
  if (room.status !== 'in_progress') return handleLeave(socket, io);

  updatePlayer(roomId, playerId, { isConnected: false, socketId: null });
  socket.leave(roomId);

  io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);
  io.to(roomId).emit('chat:message', {
    id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
    content: `${nickname} ขาดการเชื่อมต่อ… (ยังอยู่ในเกม)`,
    sentAt: new Date().toISOString(),
  });

  if (getConnectedPlayers(roomId).length === 0) {
    scheduleRoomAbandon(roomId, () => destroyRoom(roomId));
  }
}

// ตั้งใจกดออก
async function handleLeave(socket, io) {
  const { roomId, playerId, nickname } = socket.data || {};
  if (!roomId || !playerId) return;

  const room = getRoom(roomId);
  if (!room) return;

  socket.leave(roomId);

  // ออกกลางเกม = ยอมแพ้ ตายไปเลย — ลบทิ้งไม่ได้ ไม่งั้นเงื่อนไขชนะจะนับผิด
  if (room.status === 'in_progress') {
    updatePlayer(roomId, playerId, { isAlive: false, isConnected: false, socketId: null });
    await pool.query(`UPDATE players SET is_alive = false WHERE id = ?`, [playerId]);

    io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);
    io.to(roomId).emit('chat:message', {
      id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
      content: `${nickname} หนีออกจากเกาะไปแล้ว`,
      sentAt: new Date().toISOString(),
    });

    await endGameIfDecided(io, roomId);

    if (getConnectedPlayers(roomId).length === 0) {
      scheduleRoomAbandon(roomId, () => destroyRoom(roomId));
    }
    return;
  }

  removePlayerFromRoom(roomId, playerId);
  await pool.query(`DELETE FROM players WHERE id = ?`, [playerId]);

  if (room.players.size === 0) return destroyRoom(roomId);

  if (room.hostId === playerId) {
    const newHost = room.players.values().next().value;
    updateRoom(roomId, { hostId: newHost.id });
    await pool.query(`UPDATE rooms SET host_id = ? WHERE id = ?`, [newHost.id, roomId]);
    io.to(roomId).emit('room:host_changed', { newHostId: newHost.id });
  }

  io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);
  io.to(roomId).emit('chat:message', {
    id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
    content: `${nickname} left the island.`,
    sentAt: new Date().toISOString(),
  });
}

async function destroyRoom(roomId) {
  clearPhaseTimer(roomId);
  cancelRoomAbandon(roomId);
  clearVoting(roomId);
  deleteRoom(roomId);
  await pool.query(`DELETE FROM rooms WHERE id = ?`, [roomId]);
}

function broadcastToRole(io, room, role, event, data) {
  for (const player of room.players.values()) {
    if (player.role === role) {
      const s = io.sockets.sockets.get(player.socketId);
      if (s) s.emit(event, data);
    }
  }
}

function findSocketByPlayerId(io, playerId) {
  for (const [, s] of io.sockets.sockets) {
    if (s.data?.playerId === playerId) return s;
  }
  return null;
}