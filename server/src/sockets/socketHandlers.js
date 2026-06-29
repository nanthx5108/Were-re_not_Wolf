import pool from '../../db/connection.js';
import {
  getRoom, addPlayerToRoom, removePlayerFromRoom,
  updatePlayer, getPlayersArray,
  serializeRoom, serializeRoomForPlayer, updateRoom,
} from '../game/gameStore.js';
import { distributeRoles }   from '../game/Roledistributor.js';
import { PLAYER_LIMITS, CHANNELS, PHASES } from '../game/constants.js';
import { startPhaseTimer, advancePhase, clearPhaseTimer } from '../game/phaseManager.js';
import { castVote, hasAllVoted } from '../game/voteManager.js';
import { initNightActions, submitNightAction } from '../game/nightActions.js';

export function registerSocketHandlers(socket, io) {

  socket.on('room:join', async ({ roomId, playerId, nickname }) => {
    try {
      const room = getRoom(roomId);
      if (!room)                             return socket.emit('error', { message: 'Room not found.' });
      if (room.status !== 'waiting')         return socket.emit('error', { message: 'Game already in progress.' });
      if (room.players.size >= PLAYER_LIMITS.MAX) return socket.emit('error', { message: 'Room is full.' });

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
  socket.on('disconnect', () => handleLeave(socket, io));

  socket.on('chat:send', async ({ content, channel = CHANNELS.VILLAGE }) => {
    const { roomId, playerId, nickname } = socket.data || {};
    if (!roomId || !playerId) return;

    const room   = getRoom(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player?.isAlive) return socket.emit('error', { message: 'Dead players cannot chat.' });

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

    const assigned = distributeRoles(players);
    for (const p of assigned) {
      updatePlayer(roomId, p.id, { role: p.role });
      await pool.query(`UPDATE players SET role = ? WHERE id = ?`, [p.role, p.id]);
    }

    updateRoom(roomId, { status: 'in_progress', phase: PHASES.NIGHT, round: 1 });
    initNightActions(roomId);
    await pool.query(`UPDATE rooms SET status = 'in_progress' WHERE id = ?`, [roomId]);

    const endsAt = startPhaseTimer(io, roomId, PHASES.NIGHT);

    for (const p of assigned) {
      const s = findSocketByPlayerId(io, p.id);
      if (s) s.emit('game:started', { phase: PHASES.NIGHT, myRole: p.role, endsAt, round: 1 });
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

    const action = submitNightAction(roomId, playerId, { targetId });
    if (!action) return socket.emit('error', { message: 'Invalid night action.' });

    const payload = { playerId, nickname: player.nickname, role: player.role, targetId };
    socket.emit('night:action:ack', payload);
    io.to(roomId).emit('night:action:update', payload);
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

async function handleLeave(socket, io) {
  const { roomId, playerId, nickname } = socket.data || {};
  if (!roomId || !playerId) return;

  removePlayerFromRoom(roomId, playerId);
  await pool.query(`DELETE FROM players WHERE id = ?`, [playerId]);
  socket.leave(roomId);

  const room = getRoom(roomId);
  if (!room) return;

  if (room.players.size === 0) {
    clearPhaseTimer(roomId);
    await pool.query(`DELETE FROM rooms WHERE id = ?`, [roomId]);
    return;
  }

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