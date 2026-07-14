import pool from '../../db/connection.js';
import {
  getRoom, addPlayerToRoom, removePlayerFromRoom,
  updatePlayer, getPlayersArray, getConnectedPlayers,
  serializeRoom, serializeRoomForPlayer, updateRoom, deleteRoom,
} from '../game/gameStore.js';
import { distributeRoles }   from '../game/Roledistributor.js';
import { PLAYER_LIMITS, CHANNELS, PHASES } from '../game/constants.js';
import { canJoinRoom, getRoomPlayerLimit } from '../game/roomCapacity.js';
import {
  validateConfigForPlayerCount, buildDefaultRoleConfig, normalizeRoomConfig,
} from '../game/roomConfig.js';
import {
  startPhaseTimer, advancePhase, clearPhaseTimer, getPhaseDurationMs,
  endGameIfDecided, scheduleRoomAbandon, cancelRoomAbandon,
} from '../game/phaseManager.js';
import { castVote, hasAllVoted, clearVoting } from '../game/voteManager.js';
import { initNightActions, submitNightAction, getBlockedProtectTargets } from '../game/nightActions.js';
import { censorProfanity } from '../game/profanity.js';

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
    if (!player) return;

    // คนตายพูดกับคนเป็นไม่ได้ แต่คุยกันเองในห้องคนตายได้ (คนเป็นไม่เห็นช่องนี้เลย)
    if (!player.isAlive) {
      if (channel !== CHANNELS.DEAD) {
        return socket.emit('error', { message: 'เจ้าตายไปแล้ว พูดได้แค่ในห้องวิญญาณเท่านั้น' });
      }
    } else if (channel === CHANNELS.DEAD) {
      return socket.emit('error', { message: 'คนเป็นเข้าห้องวิญญาณไม่ได้' });
    }

    // Silencer ปิดปากไว้เมื่อคืน — มีผลตลอดวันนี้ ทุกช่องแชทของคนเป็น
    if (player.isAlive && room.silencedPlayerId === playerId) {
      return socket.emit('error', { message: 'เจ้าถูกปิดปากไว้ วันนี้พูดไม่ได้' });
    }

    if (channel === CHANNELS.WEREWOLF && player.role !== 'werewolf') {
      return socket.emit('error', { message: 'Only werewolves can use this channel.' });
    }

    // กรองคำหยาบฝั่ง server เสมอ — client จะกรองมาก่อนหรือไม่ก็เชื่อไม่ได้
    const { clean, censored } = censorProfanity(content.trim().slice(0, 300));
    if (!clean.trim()) return;

    const message = {
      id:      `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId, nickname, channel,
      content: clean,
      sentAt:  new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO messages (room_id, player_id, nickname, content, channel) VALUES (?, ?, ?, ?, ?)`,
      [roomId, playerId, nickname, message.content, channel]
    );

    if (censored) {
      socket.emit('chat:censored', { message: 'คำหยาบในข้อความของเจ้าถูกกลบไว้แล้ว' });
    }

    if (channel === CHANNELS.WEREWOLF) {
      broadcastToRole(io, room, 'werewolf', 'chat:message', message);
    } else if (channel === CHANNELS.DEAD) {
      broadcastToDead(io, room, 'chat:message', message);
    } else {
      io.to(roomId).emit('chat:message', message);
    }
  });

  // typing indicator — ใช้จัดลำดับ sidebar (คนกำลังพิมพ์ขึ้นก่อน)
  // ปิดตอนกลางคืน/คืนที่ 0 เพราะแชทหมู่บ้านปิดอยู่ ไม่มีอะไรให้ประกาศ
  socket.on('chat:typing', () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;
    const room = getRoom(roomId);
    if (!room) return;
    if (room.phase === PHASES.NIGHT || room.phase === PHASES.NIGHT_ZERO) return;

    if (!(room.typingPlayers instanceof Set)) room.typingPlayers = new Set();
    if (!room.typingPlayers.has(playerId)) {
      room.typingPlayers.add(playerId);
      io.to(roomId).emit('chat:typing_update', { typingIds: [...room.typingPlayers] });
    }
  });

  socket.on('chat:stop_typing', () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;
    clearPlayerTyping(io, roomId, playerId);
  });

  // เพิ่งตายกลางเกม — ขอแชทย้อนหลังของห้องวิญญาณ (คนที่ตายก่อนหน้าคุยอะไรกันไว้บ้าง)
  socket.on('chat:dead_history', async () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const player = getRoom(roomId)?.players.get(playerId);
    if (!player || player.isAlive) return;   // คนเป็นขอไม่ได้ ต่อให้ยิง event ตรง ๆ

    const [rows] = await pool.query(
      `SELECT id, player_id, nickname, content, channel, sent_at
       FROM messages
       WHERE room_id = ? AND channel = ?
       ORDER BY sent_at DESC, id DESC
       LIMIT 100`,
      [roomId, CHANNELS.DEAD]
    );

    socket.emit('chat:dead_history', {
      messages: rows.reverse().map(r => ({
        id:       `db-${r.id}`,
        playerId: r.player_id,
        nickname: r.nickname,
        channel:  r.channel,
        content:  r.content,
        sentAt:   new Date(r.sent_at).toISOString(),
      })),
    });
  });

  // host ปรับบทบาท/เวลาได้ใน Lobby ก่อนเริ่มเกม — validate ฝั่ง server เสมอ ไม่เชื่อ client
  socket.on('room:config', async ({ config }) => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const room = getRoom(roomId);
    if (!room)                    return socket.emit('error', { message: 'Room not found.' });
    if (room.hostId !== playerId) return socket.emit('error', { message: 'เฉพาะเจ้าของห้องเท่านั้นที่ตั้งค่าได้' });
    if (room.status !== 'waiting') return socket.emit('error', { message: 'เกมเริ่มไปแล้ว แก้การตั้งค่าไม่ได้' });

    const { config: safe, error } = normalizeRoomConfig(config, getRoomPlayerLimit(room));
    if (error) return socket.emit('error', { message: error });

    updateRoom(roomId, {
      roleConfig:        safe.roleConfig,
      phaseDurations:    safe.phaseDurations,
      revealRoleOnDeath: safe.revealRoleOnDeath === true,
    });
    await pool.query(`UPDATE rooms SET config = ? WHERE id = ?`, [JSON.stringify(safe), roomId]);

    io.to(roomId).emit('room:config_updated', safe);
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

    // Night of Day 0 — แจก role ให้ทุกคนดูก่อน ยังไม่มี night action ใด ๆ
    // round เริ่มที่ 0 เพื่อให้พอ advance เข้า Night จริงจะกลายเป็น Night 1 พอดี
    updateRoom(roomId, { status: 'in_progress', phase: PHASES.NIGHT_ZERO, round: 0, readyPlayers: new Set() });
    await pool.query(`UPDATE rooms SET status = 'in_progress' WHERE id = ?`, [roomId]);

    const wolves = assigned.filter(p => p.role === 'werewolf');

    for (const p of assigned) {
      const s = findSocketByPlayerId(io, p.id);
      if (!s) continue;

      // หมาป่าเห็นทีมกันเอง — คนอื่นไม่ได้รับ field นี้เลย
      const teammates = p.role === 'werewolf'
        ? wolves.filter(w => w.id !== p.id).map(w => ({ id: w.id, nickname: w.nickname }))
        : undefined;

      // ไม่มี endsAt/durationMs — night_zero จบด้วยการที่ทุกคนกด "ดูแล้ว" ไม่ใช่หมดเวลา
      s.emit('game:started', {
        phase: PHASES.NIGHT_ZERO, myRole: p.role, endsAt: null, durationMs: null, round: 0, teammates,
      });
    }

    io.to(roomId).emit('room:state', serializeRoom(roomId));
    io.to(roomId).emit('nightzero:ready', { readyCount: 0, total: getConnectedPlayers(roomId).length });
    io.to(roomId).emit('chat:message', {
      id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
      content: 'คืนก่อนเริ่มเกม — เปิดการ์ดดูบทบาทของเจ้าให้ดี แล้วกด "ดูแล้ว" เมื่อพร้อม',
      sentAt: new Date().toISOString(),
    });
  });

  // Night of Day 0 — ผู้เล่นกดยืนยันว่าดู role แล้ว; ครบทุกคน (ที่ยังเชื่อมต่อ) → เข้า Night 1
  socket.on('player:ready', () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const room = getRoom(roomId);
    if (!room || room.phase !== PHASES.NIGHT_ZERO) return;

    if (!(room.readyPlayers instanceof Set)) room.readyPlayers = new Set();
    room.readyPlayers.add(playerId);

    const connected = getConnectedPlayers(roomId);
    io.to(roomId).emit('nightzero:ready', {
      readyCount: connected.filter(p => room.readyPlayers.has(p.id)).length,
      total:      connected.length,
    });

    if (connected.length > 0 && connected.every(p => room.readyPlayers.has(p.id))) {
      advancePhase(io, roomId).catch(err => console.error('[night_zero ready advance]', err));
    }
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
      return socket.emit('error', { message: 'เจ้าเพิ่งเฝ้าคนนี้ไปเมื่อคืน ห้ามป้องกันคนเดิมสองคืนติด' });
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
      messages:       await loadRecentMessages(roomId, player),
    });
  }

  io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);
  io.to(roomId).emit('chat:message', {
    id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
    content: `${player.nickname} กลับเข้าเกาะแล้ว`,
    sentAt: new Date().toISOString(),
  });
}

// แชทย้อนหลัง — คนที่ไม่ใช่หมาป่าต้องไม่เห็นช่องหมาป่า และคนเป็นต้องไม่เห็นห้องวิญญาณ
async function loadRecentMessages(roomId, player) {
  const channels = [CHANNELS.VILLAGE, CHANNELS.SYSTEM];
  if (player?.role === 'werewolf') channels.push(CHANNELS.WEREWOLF);
  if (player?.isAlive === false)   channels.push(CHANNELS.DEAD);

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
  clearPlayerTyping(io, roomId, playerId);
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
  clearPlayerTyping(io, roomId, playerId);

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

// เอาชื่อออกจากรายชื่อคนกำลังพิมพ์ แล้วบอกทั้งห้อง — ใช้ตอน stop_typing / หลุด / ออก
function clearPlayerTyping(io, roomId, playerId) {
  const room = getRoom(roomId);
  if (!room?.typingPlayers) return;
  if (room.typingPlayers.delete(playerId)) {
    io.to(roomId).emit('chat:typing_update', { typingIds: [...room.typingPlayers] });
  }
}

function broadcastToRole(io, room, role, event, data) {
  for (const player of room.players.values()) {
    if (player.role === role) {
      const s = io.sockets.sockets.get(player.socketId);
      if (s) s.emit(event, data);
    }
  }
}

// ห้องวิญญาณ — ส่งถึงคนตายเท่านั้น ห้าม io.to(roomId) เด็ดขาด คนเป็นจะเห็นด้วย
function broadcastToDead(io, room, event, data) {
  for (const player of room.players.values()) {
    if (player.isAlive) continue;
    const s = player.socketId ? io.sockets.sockets.get(player.socketId) : null;
    if (s) s.emit(event, data);
  }
}

function findSocketByPlayerId(io, playerId) {
  for (const [, s] of io.sockets.sockets) {
    if (s.data?.playerId === playerId) return s;
  }
  return null;
}