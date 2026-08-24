import pool from '../../db/connection.js';
import {
  getRoom, addPlayerToRoom, removePlayerFromRoom,
  updatePlayer, getPlayersArray, getConnectedPlayers,
  serializeRoom, serializeRoomForPlayer, serializeRoomForAdmin, updateRoom,
} from '../game/gameStore.js';
import { distributeRoles }   from '../game/Roledistributor.js';
import { PLAYER_LIMITS, CHANNELS, PHASES } from '../game/constants.js';
import { canJoinRoom, getRoomPlayerLimit } from '../game/roomCapacity.js';
import {
  validateConfigForPlayerCount, buildDefaultRoleConfig, normalizeRoomConfig,
  buildChaosRoleConfig, CHAOS_PHASE_DURATIONS, GAME_MODES,
} from '../game/roomConfig.js';
import {
  startPhaseTimer, advancePhase, getPhaseDurationMs, getTimeRemaining,
  endGameIfDecided, scheduleRoomAbandon, cancelRoomAbandon, _endGameAndBroadcast,
} from '../game/phaseManager.js';
import { castVote, hasAllVoted } from '../game/voteManager.js';
import { teardownRoom } from '../game/roomMaintenance.js';
import { initNightActions, submitNightAction, resolveNightActions, getBlockedProtectTargets } from '../game/nightActions.js';
import { censorProfanity } from '../game/profanity.js';
import { getUserByIdService } from '../services/authService.js';

export function registerSocketHandlers(socket, io) {

  const EVENT_COOLDOWN_MS = 100; // Max 10 events per second per user

  socket.use(([event, ...args], next) => {
    const now = Date.now();
    const lastEventTime = socket.lastEventTime || 0;

    if (now - lastEventTime < EVENT_COOLDOWN_MS) {
      if (event !== 'chat:typing' && event !== 'chat:stop_typing') {
        return;
      }
    }

    socket.lastEventTime = now;
    next();
  });

  socket.on('room:join', async ({ roomId, playerId, nickname }) => {
    try {
      const room = getRoom(roomId);
      if (!room) return socket.emit('error', { message: 'Room not found.' });

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

  socket.on('chat:send', async ({ content, channel = CHANNELS.VILLAGE, options = {}, targetPlayerId = null }) => {
    const { roomId, playerId, nickname } = socket.data || {};
    if (!roomId || !playerId) return;

    const room   = getRoom(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;
    
    const validationError = getChatValidationError(room, player, channel);
    if (validationError) return socket.emit('error', { message: validationError });

    let finalOptions = { ...options };

    if (targetPlayerId) {
      const whisperResult = handleWhisperLogic(room, playerId, targetPlayerId);
      if (whisperResult.error) return socket.emit('error', { message: whisperResult.error });
      finalOptions = { ...finalOptions, ...whisperResult.options };
    } else if (options.isWhisper) {
      return socket.emit('error', { message: 'ต้องเลือกผู้เล่นที่จะกระซิบ' });
    }

    const { clean, censored } = censorProfanity(content.trim().slice(0, 300));
    if (!clean.trim()) return;

    const message = {
      id:      `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId, nickname, channel,
      ...finalOptions,
      content: clean,
      sentAt:  new Date().toISOString(),
      isHighlighted: options.isHighlighted === true,
    };

    await pool.query(
      `INSERT INTO messages (room_id, player_id, nickname, content, channel) VALUES (?, ?, ?, ?, ?)`,
      [roomId, playerId, nickname, message.content, channel]
    );

    room.memory ??= { voteTally: {}, voteHistory: [], deathLog: [], firstDeath: null, chatCountByPlayer: {}, savesByPlayer: {}, turningPoint: null };
    room.memory.chatCountByPlayer ??= {};
    room.memory.chatCountByPlayer[playerId] = (room.memory.chatCountByPlayer[playerId] || 0) + 1;

    if (censored) socket.emit('chat:censored', { message: 'คำหยาบในข้อความของเจ้าถูกกลบไว้แล้ว' });

    if (finalOptions.isWhisper) {
      const targetSocket = io.sockets.sockets.get(targetPlayerId);
      if (targetSocket) targetSocket.emit('chat:message', message);
      socket.emit('chat:message', message); // Send to self
      return;
    }

    if (channel === CHANNELS.WEREWOLF) {
      broadcastToRole(io, room, 'werewolf', 'chat:message', message);
    } else if (channel === CHANNELS.DEAD) {
      broadcastToDead(io, room, 'chat:message', message);
    } else {
      io.to(roomId).emit('chat:message', message);
    }
  });

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

  socket.on('chat:dead_history', async () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const player = getRoom(roomId)?.players.get(playerId);
    if (!player || player.isAlive) return;

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

    const isChaos = room.gameMode === GAME_MODES.CHAOS;
    if (isChaos) {
      updateRoom(roomId, { phaseDurations: { ...CHAOS_PHASE_DURATIONS } });
    }

    const roleConfig = isChaos
      ? buildChaosRoleConfig(players.length)
      : (room.roleConfig || buildDefaultRoleConfig(players.length));
    const configError = validateConfigForPlayerCount(roleConfig, players.length);
    if (configError) return socket.emit('error', { message: configError });

    if (isChaos) updateRoom(roomId, { roleConfig });

    const assigned = distributeRoles(players, roleConfig);
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

  socket.on('night:action', async ({ targetId }) => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const room = getRoom(roomId);
    if (!room) return socket.emit('error', { message: 'Room not found.' });

    const player = room.players.get(playerId);
    if (!player?.isAlive) return socket.emit('error', { message: 'Dead players cannot act.' });

    const playerCard = room.fortuneCards?.get(playerId);
    const hasEarlyAction = cardMatchesAny(playerCard, ['ลงมือก่อนที่จะสาย', 'early_action', 'before_it_is_too_late', 'early_night_action']);
    const isNightActionPhase = room.phase === PHASES.NIGHT;
    const isDayEarlyAction = room.phase === PHASES.DAY && hasEarlyAction && ['werewolf', 'seer', 'bodyguard', 'silencer'].includes(player.role);

    if (!isNightActionPhase && !isDayEarlyAction) {
      return socket.emit('error', { message: 'Not night phase.' });
    }

    if (getBlockedProtectTargets(roomId, playerId).includes(targetId)) {
      return socket.emit('error', { message: 'เจ้าเพิ่งเฝ้าคนนี้ไปเมื่อคืน ห้ามป้องกันคนเดิมสองคืนติด' });
    }

    const action = submitNightAction(roomId, playerId, { targetId });
    if (!action) return socket.emit('error', { message: 'Invalid night action.' });

    socket.emit('night:action:ack', { targetId });

    if (isDayEarlyAction) {
      const result = await resolveNightActions(roomId);
      if (result) {
        io.to(roomId).emit('night:result', {
          killedId: result.killedId,
          killedNickname: result.killedNickname,
        });
      }
      return;
    }

    if (player.role === 'werewolf') {
      broadcastToRole(io, room, 'werewolf', 'night:action:update', {
        playerId,
        nickname: player.nickname,
        targetId,
      });
    }
  });

  socket.on('phase:request_extra_time', async () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const room = getRoom(roomId);
    if (!room || room.phase !== PHASES.DAY) {
      return socket.emit('error', { message: 'ไม่สามารถขอต่อเวลาได้ในตอนนี้' });
    }

    const playerCard = room.fortuneCards?.get(playerId);
    const isInjuryTimeCard = cardMatchesAny(playerCard, ['injury_time', 'give_me_time', 'extra_time', 'more_time', 'ให้โอกาส']);

    if (!isInjuryTimeCard || room.usedExtraTime.has(playerId)) {
      return socket.emit('error', { message: 'คุณไม่มีสิทธิ์ขอต่อเวลา หรือใช้สิทธิ์ไปแล้ว' });
    }

    room.usedExtraTime.add(playerId); // Mark card as used

    const extraDurationMs = playerCard.clientEffect.duration || 20_000;
    const newEndsAt = room.phaseEndsAt + extraDurationMs;
    updateRoom(roomId, { phaseEndsAt: newEndsAt });

    io.to(roomId).emit('phase:changed', {
      phase: room.phase,
      endsAt: newEndsAt,
      durationMs: getPhaseDurationMs(roomId, room.phase) + extraDurationMs,
      round: room.round,
      message: 'เวลาพูดคุยถูกต่อเพิ่ม!',
    });
  });

  socket.on('vote:cast', async ({ targetId }) => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;

    const room = getRoom(roomId);
    if (!room || room.phase !== PHASES.VOTING) return socket.emit('error', { message: 'ไม่อยู่ในช่วงโหวต' });

    const player = room.players.get(playerId);
    if (!player?.isAlive) return socket.emit('error', { message: 'คนตายโหวตไม่ได้' });
    if (player.isConfusedThisRound) {
      return socket.emit('error', { message: 'คุณสับสนกับตัวเองอยู่ ไม่สามารถโหวตได้จนกว่าจะผ่านเกมคลิกให้สำเร็จ' });
    }

    const target = room.players.get(targetId);
    if (!target || !target.isAlive) return socket.emit('error', { message: 'ไม่สามารถโหวตผู้เล่นที่ไม่มีอยู่จริงหรือตายไปแล้วได้' });
    if (targetId === playerId) return socket.emit('error', { message: 'โหวตให้ตัวเองไม่ได้' });

    const playerCard = room.fortuneCards?.get(playerId);
    const isOpportunist = cardMatchesAny(playerCard, ['opportunist', 'หน้าไหว้หลังหลอก', 'change_vote', 'vote_switch', 'second_chance_vote']);
    const timeRemaining = room.phaseEndsAt ? Math.ceil((room.phaseEndsAt - Date.now()) / 1000) : Infinity;

    const { voteMap: currentVoteMap } = getVoteData(roomId);
    const previousTargetId = currentVoteMap[playerId];

    if (previousTargetId) { // Already voted
      if (isOpportunist && timeRemaining <= 5 && previousTargetId !== targetId) {
        if (!room.usedOpportunist) room.usedOpportunist = new Set();
        if (room.usedOpportunist.has(playerId)) {
          return socket.emit('error', { message: 'คุณใช้สิทธิ์เปลี่ยนโหวตไปแล้ว' });
        }
        room.usedOpportunist.add(playerId);
      } else {
        return socket.emit('error', { message: 'คุณโหวตไปแล้ว' });
      }
    }

    const voteResult = castVote(roomId, playerId, targetId);
    if (!voteResult) {
      return socket.emit('error', { message: 'คุณสับสนกับตัวเองอยู่ ไม่สามารถโหวตได้จนกว่าจะผ่านเกมคลิกให้สำเร็จ' });
    }

    const { voteMap, counts } = voteResult;

    const players = getPlayersArray(roomId);
    for (const p of players) {
      const playerSocket = io.sockets.sockets.get(p.socketId);
      if (!playerSocket) continue;

      const maskedVoteMap = {};
      for (const [voterId, votedTargetId] of Object.entries(voteMap)) {
        const voterCard = room.fortuneCards?.get(voterId);
        const isAnonymous = cardMatchesAny(voterCard, ['like_the_wind', 'ลมพา', 'anonymous_vote', 'mask_vote', 'vote_mask']);

        if (isAnonymous && p.id !== voterId) {
          const anonKey = `ANON_${voterId}`;
          maskedVoteMap[anonKey] = votedTargetId;
        } else {
          maskedVoteMap[voterId] = votedTargetId;
        }
      }
      playerSocket.emit('vote:update', { voteMap: maskedVoteMap, counts });
    }

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

  // ── ระบบควบคุมแอดมินภายในหน้าเล่นเกม ──
  // ตรวจสิทธิ์จาก session ที่แชร์กับ Express (socket.request.session) ไม่เชื่อ client
  // ส่งมาตรงๆ เพื่อกัน client ปลอมตัวเป็นแอดมิน
  socket.on('admin:action', async ({ type, payload = {} }) => {
    try {
      const userId = socket.request?.session?.userId;
      if (!userId) return socket.emit('error', { message: 'จำเป็นต้องเข้าสู่ระบบ' });

      const user = await getUserByIdService(userId);
      if (!user?.isAdmin) return socket.emit('error', { message: 'ต้องมีสิทธิ์ผู้ดูแลระบบ' });

      const { roomId } = socket.data || {};
      if (!roomId) return socket.emit('error', { message: 'ไม่ได้อยู่ในห้อง' });
      const room = getRoom(roomId);
      if (!room) return socket.emit('error', { message: 'ไม่พบห้อง' });

      const broadcastAdmin = () => io.to(roomId).emit('admin:room_state', serializeRoomForAdmin(roomId));
      const broadcastPlayers = () => io.to(roomId).emit('room:players_updated', getPlayersArray(roomId));

      switch (type) {
        case 'get_state':
          return socket.emit('admin:room_state', serializeRoomForAdmin(roomId));

        case 'advance_phase':
          await advancePhase(io, roomId);
          break;

        case 'add_time': {
          const extraMs = Number(payload.ms) || 30_000;
          const remaining = getTimeRemaining(roomId) ?? 0;
          startPhaseTimer(io, roomId, room.phase, remaining + extraMs);
          io.to(roomId).emit('phase:changed', {
            phase: room.phase, endsAt: room.phaseEndsAt, durationMs: remaining + extraMs, round: room.round,
          });
          break;
        }

        case 'kill': {
          const target = room.players.get(payload.targetPlayerId);
          if (!target) return socket.emit('error', { message: 'ไม่พบผู้เล่น' });
          updatePlayer(roomId, payload.targetPlayerId, { isAlive: false });
          broadcastPlayers();
          await endGameIfDecided(io, roomId);
          break;
        }

        case 'revive': {
          const target = room.players.get(payload.targetPlayerId);
          if (!target) return socket.emit('error', { message: 'ไม่พบผู้เล่น' });
          updatePlayer(roomId, payload.targetPlayerId, { isAlive: true });
          broadcastPlayers();
          break;
        }

        case 'set_role': {
          const target = room.players.get(payload.targetPlayerId);
          if (!target) return socket.emit('error', { message: 'ไม่พบผู้เล่น' });
          updatePlayer(roomId, payload.targetPlayerId, { role: payload.role });
          break;
        }

        case 'mute': {
          const target = room.players.get(payload.targetPlayerId);
          if (!target) return socket.emit('error', { message: 'ไม่พบผู้เล่น' });
          updatePlayer(roomId, payload.targetPlayerId, { isMutedByAdmin: true });
          break;
        }

        case 'unmute': {
          const target = room.players.get(payload.targetPlayerId);
          if (!target) return socket.emit('error', { message: 'ไม่พบผู้เล่น' });
          updatePlayer(roomId, payload.targetPlayerId, { isMutedByAdmin: false });
          break;
        }

        case 'kick': {
          const target = room.players.get(payload.targetPlayerId);
          if (!target) return socket.emit('error', { message: 'ไม่พบผู้เล่น' });
          const targetSocket = target.socketId ? io.sockets.sockets.get(target.socketId) : null;
          removePlayerFromRoom(roomId, payload.targetPlayerId);
          if (targetSocket) {
            targetSocket.emit('room:closed', { message: 'คุณถูกแอดมินเตะออกจากห้อง' });
            targetSocket.leave(roomId);
            targetSocket.disconnect(true);
          }
          broadcastPlayers();
          await endGameIfDecided(io, roomId);
          break;
        }

        case 'end_game': {
          const winner = payload.winner || 'draw';
          const message = payload.message || 'แอดมินสั่งจบเกม';
          await _endGameAndBroadcast(io, roomId, { winner, message });
          break;
        }

        default:
          return socket.emit('error', { message: `ไม่รู้จักคำสั่งแอดมิน: ${type}` });
      }

      broadcastAdmin();
    } catch (err) {
      console.error('[admin:action]', err);
      socket.emit('error', { message: 'คำสั่งแอดมินล้มเหลว' });
    }
  });

  // ── สัญญาณเสียง (WebRTC mesh) — server แค่ relay SDP/ICE ไม่แตะเสียงเลย ──
  // อนุญาตเฉพาะตอนกลางวัน/โหวต และจับคู่เฉพาะคนที่สถานะ isAlive ตรงกัน
  // (คนเป็นคุยกับคนเป็น, คนตายคุยกับคนตาย — เหมือนช่องแชท)
  function voiceEligible(room, player) {
    return room?.status === 'in_progress' &&
      (room.phase === PHASES.DAY || room.phase === PHASES.VOTING) &&
      Boolean(player);
  }

  socket.on('voice:join', () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;
    const room = getRoom(roomId);
    const player = room?.players.get(playerId);
    if (!voiceEligible(room, player)) return;

    const peers = getPlayersArray(roomId).filter(p =>
      p.id !== playerId && p.isConnected !== false && p.isAlive === player.isAlive
    );
    socket.emit('voice:peers', peers.map(p => p.id));
    for (const peer of peers) {
      const peerSocket = peer.socketId ? io.sockets.sockets.get(peer.socketId) : null;
      peerSocket?.emit('voice:peer_joined', { peerId: playerId });
    }
  });

  socket.on('voice:leave', () => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;
    socket.to(roomId).emit('voice:peer_left', { peerId: playerId });
  });

  socket.on('voice:signal', ({ targetPlayerId, signal }) => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId || !targetPlayerId) return;
    const room = getRoom(roomId);
    const target = room?.players.get(targetPlayerId);
    if (!target?.socketId) return;
    io.to(target.socketId).emit('voice:signal', { fromPlayerId: playerId, signal });
  });

  socket.on('voice:mute_state', ({ isMuted }) => {
    const { roomId, playerId } = socket.data || {};
    if (!roomId || !playerId) return;
    socket.to(roomId).emit('voice:mute_state', { playerId, isMuted: Boolean(isMuted) });
  });
}

async function handleRejoin(socket, io, roomId, playerId) {
  const room = getRoom(roomId);
  const player = room.players.get(playerId);

  updatePlayer(roomId, playerId, { socketId: socket.id, isConnected: true });
  await pool.query(`UPDATE players SET socket_id = ? WHERE id = ?`, [socket.id, playerId]);

  socket.join(roomId);
  socket.data = { roomId, playerId, nickname: player.nickname };
  cancelRoomAbandon(roomId);
  if (room.hostId === playerId) cancelHostGrace(roomId);

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

async function handleDisconnect(socket, io) {
  const { roomId, playerId, nickname } = socket.data || {};
  if (!roomId || !playerId) return;

  const room = getRoom(roomId);
  if (!room) return;

  if (room.status !== 'in_progress') {
    if (room.hostId === playerId) {
      updatePlayer(roomId, playerId, { isConnected: false, socketId: null });
      clearPlayerTyping(io, roomId, playerId);
      socket.leave(roomId);
      io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);
      io.to(roomId).emit('chat:message', {
        id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
        content: `${nickname} (เจ้าของห้อง) หลุดการเชื่อมต่อ… ถ้าไม่กลับมาห้องจะถูกปิด`,
        sentAt: new Date().toISOString(),
      });
      scheduleHostGrace(io, roomId);
      return;
    }
    return handleLeave(socket, io);
  }

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

async function handleLeave(socket, io) {
  const { roomId, playerId, nickname } = socket.data || {};
  if (!roomId || !playerId) return;

  const room = getRoom(roomId);
  if (!room) return;

  socket.leave(roomId);
  clearPlayerTyping(io, roomId, playerId);

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

  if (room.hostId === playerId) {
    cancelHostGrace(roomId);
    return closeRoomByHost(io, roomId);
  }

  removePlayerFromRoom(roomId, playerId);
  await pool.query(`DELETE FROM players WHERE id = ?`, [playerId]);

  if (room.players.size === 0) return destroyRoom(roomId);

  io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);
  io.to(roomId).emit('chat:message', {
    id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
    content: `${nickname} left the island.`,
    sentAt: new Date().toISOString(),
  });
}

function cardMatchesAny(card, aliases = []) {
  if (!card) return false;
  const haystack = [
    card.id,
    card.name,
    card.name_en,
    card.name_th,
    card.description,
    card.description_th,
  ].filter(Boolean).join(' ').toLowerCase();

  return aliases.some(alias => {
    const key = String(alias).toLowerCase();
    return haystack.includes(key) || key.includes(haystack);
  });
}

function getChatValidationError(room, player, channel) {
  if (player.isMutedByAdmin) {
    return 'แอดมินปิดปากเจ้าไว้';
  }

  if (!player.isAlive) {
    if (channel !== CHANNELS.DEAD) {
      return 'เจ้าตายไปแล้ว พูดได้แค่ในห้องวิญญาณเท่านั้น';
    }
  } else if (channel === CHANNELS.DEAD) {
    return 'คนเป็นเข้าห้องวิญญาณไม่ได้';
  }

  const playerCard = room.fortuneCards?.get(player.id);
  const hasSilencerShield = cardMatchesAny(playerCard, ['ปากแจ๋ว', 'silencer_guard', 'silence_guard', 'mouth_guard', 'paka_jwa']);
  if (player.isAlive && room.silencedPlayerId === player.id && !hasSilencerShield) {
    return 'เจ้าถูกปิดปากไว้ วันนี้พูดไม่ได้';
  }
  if (player.isAlive && room.silencedPlayerId === player.id && hasSilencerShield && !player.silenceShieldUsed) {
    player.silenceShieldUsed = true;
    room.silencedPlayerId = null;
    return null;
  }

  if (channel === CHANNELS.WEREWOLF && player.role !== 'werewolf') {
    return 'Only werewolves can use this channel.';
  }

  return null;
}

function handleWhisperLogic(room, playerId, targetPlayerId) {
  const playerCard = room.fortuneCards?.get(playerId);
  const isWhisperCard = cardMatchesAny(playerCard, ['whisper', 'กระซิบข้างหู', 'private_whisper', 'secret_message', 'whisper_tell']);

  if (!isWhisperCard || room.usedWhispers.has(playerId)) {
    return { error: 'คุณไม่สามารถกระซิบได้' };
  }

  const targetPlayer = room.players.get(targetPlayerId);
  if (!targetPlayer || !targetPlayer.isAlive) {
    return { error: 'ไม่พบผู้เล่นที่จะกระซิบ หรือผู้เล่นคนนั้นตายไปแล้ว' };
  }
  if (targetPlayerId === playerId) {
    return { error: 'กระซิบกับตัวเองไม่ได้' };
  }

  room.usedWhispers.add(playerId);
  return {
    options: { isWhisper: true, whisperTargetId: targetPlayerId, whisperTargetNickname: targetPlayer.nickname },
  };
}

async function destroyRoom(roomId) {
  cancelHostGrace(roomId);
  await teardownRoom(roomId);
}

const HOST_LEAVE_GRACE_MS = 10_000;
const hostGraceTimers = new Map();

function scheduleHostGrace(io, roomId) {
  cancelHostGrace(roomId);
  hostGraceTimers.set(roomId, setTimeout(() => {
    hostGraceTimers.delete(roomId);
    closeRoomByHost(io, roomId).catch(err => console.error('[host grace]', err));
  }, HOST_LEAVE_GRACE_MS));
}

function cancelHostGrace(roomId) {
  const t = hostGraceTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    hostGraceTimers.delete(roomId);
  }
}

async function closeRoomByHost(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  io.to(roomId).emit('chat:message', {
    id: `sys-${Date.now()}`, channel: CHANNELS.SYSTEM,
    content: 'เจ้าของห้องออกไปแล้ว — ห้องนี้ถูกปิด',
    sentAt: new Date().toISOString(),
  });
  io.to(roomId).emit('room:closed', { reason: 'host_left' });

  await destroyRoom(roomId);
}

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