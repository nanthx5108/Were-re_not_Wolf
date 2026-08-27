import pool from '../../db/connection.js';
import {
  getRoom, updateRoom, updatePlayer,
  getPlayersArray, serializeRoom,
} from './gameStore.js';
import { PHASES, CHANNELS } from './constants.js';
import {
  resolveVotes, clearVoting, initVoting, getVoteData,
} from './voteManager.js';
import { initNightActions, resolveNightActions } from './nightActions.js';
import { evaluateWinCondition, endGame } from './winConditions.js'; 
import { rollMorningEvent, getActiveLuckBias, consumeLuckBias } from './morningEvents.js';
import { drawFortuneCard } from './fortuneCards.js';
import { DEFAULT_PHASE_DURATIONS, GAME_MODES } from './roomConfig.js';
import {
  addKillHighlight,
  addSaveHighlight,
  addRevealHighlight,
  addUnanimousVoteHighlight,
  addBetrayalHighlight,
  addFoolWinHighlight,
  addTurningPointHighlight,
  recordPlayerDeath,
  recordGuardianSave,
  getPostGameHighlights,
} from './highlightService.js';
import { applyExp, expNeeded, EXP_PER_GAME } from '../../../shared/leveling.js';

export const RESULTS_DURATION_MS = 10_000;

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

export function getPhaseDurationMs(roomId, phase) {
  if (phase === PHASES.RESULTS) return RESULTS_DURATION_MS;

  const room = getRoom(roomId);
  const durations = room?.phaseDurations || DEFAULT_PHASE_DURATIONS;
  let seconds = durations[phase] ?? DEFAULT_PHASE_DURATIONS[phase];

  if (phase === PHASES.VOTING && room && room.gameMode === GAME_MODES.CHAOS) {
    const hasCarefulCard = getPlayersArray(roomId).some(player => {
      if (!player.isAlive) return false;
      const card = room.fortuneCards?.get(player.id);
      return cardMatchesAny(card, ['รอบคอบ', 'cautious', 'careful', 'vote_time', 'extra_vote']);
    });
    if (hasCarefulCard) seconds += 10;
  }

  return (seconds ?? 30) * 1000;
}

const NEXT_PHASE = Object.freeze({
  [PHASES.NIGHT_ZERO]: PHASES.DAY,     // จบช่วงดู role → เข้า Day 1 โดยไม่ใช้ Night Action
  [PHASES.NIGHT]:      PHASES.DAY,
  [PHASES.DAY]:        PHASES.VOTING,
  [PHASES.VOTING]:     PHASES.RESULTS,
  [PHASES.RESULTS]:    PHASES.NIGHT,
});

const PHASE_MESSAGES = Object.freeze({
  [PHASES.NIGHT]:   'ค่ำคืนมาถึง... หมู่บ้านหลับใหล',
  [PHASES.DAY]:     'รุ่งสางแล้ว จงพูดคุยและหาตัวหมาป่า',
  [PHASES.VOTING]:  'ถึงเวลาโหวตแล้ว ใครคือหมาป่า?',
  [PHASES.RESULTS]: 'กำลังนับคะแนนเสียง...',
});

async function persistRoomPlayerCard(roomId, playerId, card, status = 'active', source = 'daily_draw') {
  if (!roomId || !playerId || !card || !card.id) return;

  const room = getRoom(roomId);
  if (!room) return;
  if (room.gameMode !== GAME_MODES.CHAOS) return;

  const cardId = Number.isFinite(Number(card.id)) ? Number(card.id) : null;
  const name = card.name_th || card.name || card.id;
  const type = card.type || 'bad';

  if (cardId !== null) {
    try {
      await pool.query(
        `INSERT INTO room_player_cards (room_id, player_id, card_id, card_name, card_type, status, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           card_name = VALUES(card_name),
           card_type = VALUES(card_type),
           status = VALUES(status),
           source = VALUES(source),
           updated_at = CURRENT_TIMESTAMP`,
        [roomId, playerId, cardId, name, type, status, source]
      );
    } catch (error) {
      console.warn('[fortune card persist] fallback insert failed:', error.message);
    }
  }

  const currentCards = room.fortuneCards || new Map();
  currentCards.set(playerId, { ...card, status, source });
  updateRoom(roomId, { fortuneCards: currentCards });

  if (card.type === 'good') {
    const inventory = room.fortuneInventory || new Map();
    const history = inventory.get(playerId)?.history || [];
    inventory.set(playerId, {
      current: { ...card, status, source },
      history: [...history, String(card.id)].slice(-5),
      lastDrawnAt: new Date().toISOString(),
    });
    updateRoom(roomId, { fortuneInventory: inventory });
  }
}

const timers = new Map();
const streamIntervals = new Map(); // For Magic Eyes card effect

export function startPhaseTimer(io, roomId, phase, durationOverrideMs) {
  clearPhaseTimer(roomId);

  const duration = durationOverrideMs ?? getPhaseDurationMs(roomId, phase);
  const endsAt   = Date.now() + duration;

  updateRoom(roomId, { phaseEndsAt: endsAt });

  const timerId = setTimeout(() => {
    advancePhase(io, roomId).catch(err =>
      console.error('[phaseManager timer]', err)
    );
  }, duration);

  const room = getRoom(roomId);
  if (phase === PHASES.VOTING && room?.gameMode === GAME_MODES.CHAOS && duration > 5000) {
    const magicEyesStreamer = setTimeout(() => {
      const room = getRoom(roomId);
      if (!room || room.phase !== PHASES.VOTING) return;

      const playersWithCard = getPlayersArray(roomId).filter(p => {
        const card = room.gameMode === GAME_MODES.CHAOS ? room.fortuneCards?.get(p.id) : null;
        return p.isAlive && cardMatchesAny(card, ['magic_eyes', 'ดวงตาอัจฉริยะ', 'magic_eyes_card', 'seer_eyes']);
      });

      if (playersWithCard.length > 0) {
        const streamInterval = setInterval(() => {
          const currentRoom = getRoom(roomId);
          if (!currentRoom || currentRoom.phase !== PHASES.VOTING) {
            clearInterval(streamInterval);
            streamIntervals.delete(roomId);
            return;
          }

          for (const player of playersWithCard) {
            const s = player.socketId ? io.sockets.sockets.get(player.socketId) : null;
            if (s) {
              s.emit('fortune:realtime_vote_count', { counts: currentRoom.votes.counts || {} });
            }
          }
        }, 800);
        streamIntervals.set(roomId, streamInterval);
      }
    }, duration - 5000);
    timers.set(roomId, { timerId, endsAt, magicEyesTimeout: magicEyesStreamer });
  } else {
    timers.set(roomId, { timerId, endsAt });
  }
  return endsAt;
}

const advancingRooms = new Set();

export async function advancePhase(io, roomId) {
  if (advancingRooms.has(roomId)) return;
  advancingRooms.add(roomId);
  try {
    await _advancePhase(io, roomId);
  } finally {
    advancingRooms.delete(roomId);
  }
}

async function _advancePhase(io, roomId) {
  clearPhaseTimer(roomId);

  const room = getRoom(roomId);
  if (!room || room.status !== 'in_progress') return;

  if (room.phase === PHASES.NIGHT) {
    const nightResult = await _resolveNightActionsAndBroadcast(io, roomId);
    const win = evaluateWinCondition(roomId);
    if (win) return _endGameAndBroadcast(io, roomId, win);
    updateRoom(roomId, { nightResult });
  }

  if (room.phase === PHASES.VOTING) {
    const { eliminatedRole } = await _resolveVotingAndBroadcast(io, roomId);
    const updatedRoom = getRoom(roomId);

    if (updatedRoom.lastEliminatedId) {
      const eliminatedPlayer = updatedRoom.players.get(updatedRoom.lastEliminatedId);
      if (eliminatedPlayer) {
        if (eliminatedRole === 'fool') {
          addFoolWinHighlight(roomId, { foolPlayer: eliminatedPlayer });
        }
        addTurningPointHighlight(roomId, { eliminatedPlayer });
      }
    }

    if (eliminatedRole === 'fool') {
      return _endGameAndBroadcast(io, roomId, {
        winner: 'fool',
        message: 'คนโง่ชนะแล้ว การถูกเนรเทศคือสิ่งที่เขาต้องการมาตลอด',
      });
    }

    const win = evaluateWinCondition(roomId);
    if (win) return _endGameAndBroadcast(io, roomId, win);
  }

  const nextPhase = NEXT_PHASE[room.phase] ?? PHASES.DAY;

  if (nextPhase === PHASES.NIGHT) {
    initNightActions(roomId);
    updateRoom(roomId, { silencedPlayerId: null, usedOpportunist: new Set(), usedWhispers: new Set(), usedExtraTime: new Set() });
  }

  if (nextPhase === PHASES.VOTING) {
    initVoting(roomId);
  }

  const round = room.phase === PHASES.NIGHT_ZERO
    ? 1
    : nextPhase === PHASES.NIGHT
      ? (room.round ?? 1) + 1
      : (room.round ?? 1);

  updateRoom(roomId, { phase: nextPhase, round });

  const currentRoom = getRoom(roomId);
  const isChaos = currentRoom?.gameMode === GAME_MODES.CHAOS;
  const morning = nextPhase === PHASES.DAY && isChaos ? rollMorningEvent(roomId) : null;

  if (nextPhase === PHASES.DAY) {
    // At the start of DAY, reset confused status from previous round
    // and check for 'confused' recurrence from previous round
    for (const player of getPlayersArray(roomId)) {
      if (player.isAlive) {
        let confusedThisRound = false;
        let hasConfusedRecurrence = player.hasConfusedRecurrence || false;

        if (hasConfusedRecurrence && Math.random() < 0.1) { // 10% chance to recur
          confusedThisRound = true;
          const s = player.socketId ? io.sockets.sockets.get(player.socketId) : null;
          if (s) s.emit('fortune:confused_recurrence', { message: 'คุณยังคงสับสนกับตัวเองอยู่' });
          hasConfusedRecurrence = false; // Recurrence chance is consumed whether it triggers or not
        } else if (hasConfusedRecurrence) {
          hasConfusedRecurrence = false; // Recurrence chance is consumed if it doesn't trigger
        }
        updatePlayer(roomId, player.id, { isConfusedThisRound: confusedThisRound, hasConfusedRecurrence: hasConfusedRecurrence });
      } else {
        updatePlayer(roomId, player.id, { isConfusedThisRound: false, hasConfusedRecurrence: false });
      }
    }

    const observerPlayers = isChaos ? getPlayersArray(roomId).filter(player => {
      if (!player.isAlive) return false;
      const card = room?.fortuneCards?.get(player.id);
      return cardMatchesAny(card, ['นักสังเกต', 'observer', 'the_observer', 'observe']);
    }) : [];

    for (const player of observerPlayers) {
      const candidates = getPlayersArray(roomId).filter(p => p.isAlive && p.id !== player.id);
      if (candidates.length === 0) continue;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      const targetCard = room?.fortuneCards?.get(target.id);
      const hasNightSkill = ['werewolf', 'seer', 'bodyguard', 'silencer'].includes(target.role);
      const targetAction = room?.nightActions?.[target.role] || null;
      const socket = player.socketId ? io.sockets.sockets.get(player.socketId) : null;
      if (socket) {
        socket.emit('fortune:private_info', {
          type: 'observer',
          title: 'นักสังเกต',
          data: {
            targetId: target.id,
            targetNickname: target.nickname,
            targetRole: target.role,
            usesNightSkill: hasNightSkill,
            hasNightTarget: !!targetAction,
            targetAction: targetAction ? { targetId: targetAction.targetId } : null,
            note: targetCard ? 'มีข้อมูลลับจากการสังเกต' : 'ไม่มีข้อมูลเพิ่มเติม',
          },
        });
      }
    }

    const alivePlayers = getPlayersArray(roomId).filter(p => p.isAlive);
    const luckBias = isChaos ? getActiveLuckBias(roomId) : null;
    const drawnCards = new Map();

    if (isChaos) {
      for (const player of alivePlayers) {
        const card = drawFortuneCard(currentRoom.gameMode, luckBias);
        drawnCards.set(player.id, card);
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.emit('fortune:card_drawn', { card });
        }

        if (card?.type === 'good') {
          await persistRoomPlayerCard(roomId, player.id, card, 'inventory', 'daily_draw');
        } else {
          await persistRoomPlayerCard(roomId, player.id, card, 'active', 'daily_draw');
        }

        if (cardMatchesAny(card, ['confused', 'สับสนกับตัวเอง', 'self_confused', 'confusion', 'confused_self'])) {
          updatePlayer(roomId, player.id, { isConfusedThisRound: true, hasConfusedRecurrence: true });
        } else if (!player.isConfusedThisRound) {
          updatePlayer(roomId, player.id, { hasConfusedRecurrence: false });
        }
      }
      updateRoom(roomId, { fortuneCards: drawnCards });
      consumeLuckBias(roomId);
    } else {
      updateRoom(roomId, { fortuneCards: new Map(), fortuneInventory: new Map(), activeLuckBias: null });
    }
  }

  const dayDuration = morning?.event.dayTimerMod
    ? morning.event.dayTimerMod(getPhaseDurationMs(roomId, PHASES.DAY))
    : undefined;

  const durationMs = dayDuration ?? getPhaseDurationMs(roomId, nextPhase);
  const endsAt = startPhaseTimer(io, roomId, nextPhase, dayDuration);

  io.to(roomId).emit('phase:changed', {
    phase:   nextPhase,
    endsAt,
    durationMs,
    round,
    message: PHASE_MESSAGES[nextPhase],
  });

  io.to(roomId).emit('chat:message', {
    id:      `sys-phase-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: PHASE_MESSAGES[nextPhase],
    sentAt:  new Date().toISOString(),
  });

  if (nextPhase === PHASES.NIGHT) {
    sendBlockedProtectTargets(io, roomId);
  }

  if (morning) {
    _broadcastMorningEvent(io, roomId, morning, round);
  } else if (nextPhase === PHASES.DAY) {
    io.to(roomId).emit('chat:message', {
      id:      `sys-quiet-${Date.now()}`,
      channel: CHANNELS.SYSTEM,
      content: '— เช้านี้ผ่านไปเงียบ ๆ ไม่มีเหตุการณ์อะไรเกิดขึ้น',
      sentAt:  new Date().toISOString(),
    });
  }
}

export function sendBlockedProtectTargets(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  for (const player of room.players.values()) {
    if (player.role !== 'bodyguard' || !player.isAlive) continue;
    const s = player.socketId ? io.sockets.sockets.get(player.socketId) : null;
    if (s) s.emit('night:blocked_targets', { targetIds: room.lastProtectedIds || [] });
  }
}

function _notifySilenced(io, roomId, result) {
  if (!result?.silencedId) return;
  const target = getRoom(roomId)?.players.get(result.silencedId);
  const s = target?.socketId ? io.sockets.sockets.get(target.socketId) : null;
  if (s) {
    s.emit('chat:silenced', {
      message: 'คอของเจ้าแห้งผาก พูดไม่ออกสักคำ วันนี้เจ้าพิมพ์อะไรไม่ได้เลย',
    });
  }
}

function _broadcastMorningEvent(io, roomId, morning, round) {
  const { event, announcement, privateNote } = morning;

  io.to(roomId).emit('morning:event', {
    id:    event.id,
    icon:  event.icon,
    title: event.title,
    narrator: event.narrator,
    effect:   event.effect || null,
    announcement,
    round,
  });

  const chatText = [
    `${event.icon} ${event.title} — ${event.effect || 'ไม่มีผลต่อเกม'}`,
    announcement,
    `"${event.narrator}"`,
  ].filter(Boolean).join(' · ');

  io.to(roomId).emit('chat:message', {
    id:      `sys-event-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: chatText,
    sentAt:  new Date().toISOString(),
  });

  if (privateNote) {
    const receiver = getRoom(roomId)?.players.get(privateNote.playerId);
    const s = receiver?.socketId ? io.sockets.sockets.get(receiver.socketId) : null;
    if (s) s.emit('morning:event:private', { message: privateNote.message });
  }
}

export function clearPhaseTimer(roomId) {
  const entry = timers.get(roomId);
  if (entry) {
    clearTimeout(entry.timerId);
    if (entry.magicEyesTimeout) clearTimeout(entry.magicEyesTimeout);
    timers.delete(roomId);
  }
  const streamInterval = streamIntervals.get(roomId);
  if (streamInterval) {
    clearInterval(streamInterval);
    streamIntervals.delete(roomId);
  }
}

export function getTimeRemaining(roomId) {
  const entry = timers.get(roomId);
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.endsAt - Date.now()) / 1000));
}

export async function endGameIfDecided(io, roomId) {
  const room = getRoom(roomId);
  if (!room || room.status !== 'in_progress') return false;

  const win = evaluateWinCondition(roomId);
  if (!win) return false;

  clearPhaseTimer(roomId);
  await _endGameAndBroadcast(io, roomId, win);
  return true;
}

export async function _endGameAndBroadcast(io, roomId, win) {
  const room = getRoom(roomId);
  const players = getPlayersArray(roomId);
  if (room && room.memory) room.memory.turningPoint = room.memory.turningPoint || null;
  endGame(roomId, win.winner, win.message);
  await pool.query(`UPDATE rooms SET status = 'finished' WHERE id = ?`, [roomId]);

  const reveal = players.map(p => ({
    id: p.id, nickname: p.nickname, role: p.role, isAlive: p.isAlive,
  }));

  const summaryHighlights = [...(room.highlights || []), ...getPostGameHighlights(roomId)];
  const dedupedHighlights = [];
  const seen = new Set();
  for (const highlight of summaryHighlights) {
    const key = `${highlight.type}:${highlight.playersInvolved?.join('-') || 'none'}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedHighlights.push(highlight);
    }
  }

  updateRoom(roomId, { winner: win.winner, memory: { ...(room.memory || {}), turningPoint: room.memory?.turningPoint || null } });

  io.to(roomId).emit('game:ended', {
    winner: win.winner,
    message: win.message,
    reveal,
    highlights: dedupedHighlights.slice(0, 4),
  });
  io.to(roomId).emit('chat:message', {
    id:      `sys-end-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: win.message,
    sentAt:  new Date().toISOString(),
  });

  await _awardGameCompletion(io, players);
}

async function _awardGameCompletion(io, players) {
  if (!players.length) return;

  const playerIds = players.map(p => p.id);

  try {
    const [users] = await pool.query(
      `SELECT id, level, exp, games_played FROM users WHERE id IN (${playerIds.map(() => '?').join(',')})`,
      playerIds
    );

    for (const user of users) {
      const { level, exp } = applyExp(user.level, user.exp, EXP_PER_GAME);
      await pool.query(
        `UPDATE users SET games_played = games_played + 1, level = ?, exp = ? WHERE id = ?`,
        [level, exp, user.id]
      );

      const socketId = players.find(p => p.id === user.id)?.socketId;
      const s = socketId ? io.sockets.sockets.get(socketId) : null;
      if (s) {
        s.emit('player:progress', {
          level,
          exp,
          expNeeded:   expNeeded(level),
          gamesPlayed: (user.games_played ?? 0) + 1,
          leveledUp:   level > (user.level ?? 0),
        });
      }
    }
  } catch (err) {
    console.error('[award exp]', err);
  }
}

const ABANDON_GRACE_MS = 5 * 60_000;
const abandonTimers = new Map();

export function scheduleRoomAbandon(roomId, onAbandon) {
  cancelRoomAbandon(roomId);
  abandonTimers.set(roomId, setTimeout(() => {
    abandonTimers.delete(roomId);
    Promise.resolve(onAbandon()).catch(err => console.error('[room abandon]', err));
  }, ABANDON_GRACE_MS));
}

export function cancelRoomAbandon(roomId) {
  const t = abandonTimers.get(roomId);
  if (t) {
    clearTimeout(t);
    abandonTimers.delete(roomId);
  }
}

async function _resolveNightActionsAndBroadcast(io, roomId) {
  const result = resolveNightActions(roomId);
  if (!result) return null;
  const room = getRoom(roomId);

  if (result.prevented && result.selectedTargetId) {
    const protectedPlayer = room.players.get(result.selectedTargetId);
    const bodyguard = room.nightActions?.bodyguard?.playerId
      ? room.players.get(room.nightActions.bodyguard.playerId)
      : null;
    addSaveHighlight(roomId, { bodyguard, protectedPlayer });
    if (bodyguard?.id) {
      recordGuardianSave(roomId, bodyguard.id);
    }
  }

  const playersWithCard = getPlayersArray(roomId).filter(p => {
    const card = room.gameMode === GAME_MODES.CHAOS ? room.fortuneCards?.get(p.id) : null;
    return p.isAlive && cardMatchesAny(card, ['good_to_know', 'รู้ล่วงหน้า', 'premonition', 'future_know', 'prognosis']);
  });

  if (playersWithCard.length > 0) {
    const someoneDied = !!result.killedId;
    for (const player of playersWithCard) {
      const s = player.socketId ? io.sockets.sockets.get(player.socketId) : null;
      if (s) {
        s.emit('fortune:early_info', {
          data: { someoneDied },
        });
      }
    }
  }

  const reflexTarget = result.killedId ? room.players.get(result.killedId) : null;
  if (reflexTarget && !reflexTarget.reflexUsed) {
    const reflexCard = room.gameMode === GAME_MODES.CHAOS ? room.fortuneCards?.get(reflexTarget.id) : null;
    if (cardMatchesAny(reflexCard, ['รีเฟล็กซ์วัยรุ่น', 'reflex', 'young_reflex', 'survival_reflex'])) {
      reflexTarget.isAlive = true;
      reflexTarget.reflexUsed = true;
      result.killedId = null;
      result.killedNickname = null;
      result.prevented = true;
      result.selectedTargetId = null;
      const socket = reflexTarget.socketId ? io.sockets.sockets.get(reflexTarget.socketId) : null;
      if (socket) {
        socket.emit('fortune:private_info', {
          type: 'reflex',
          title: 'รีเฟล็กซ์วัยรุ่น',
          data: { message: 'เจ้าใช้รีเฟล็กซ์วัยรุ่นป้องกันการถูกฆ่าได้สำเร็จ' },
        });
      }
    }
  }

  if (result.killedId) {
    await pool.query(`UPDATE players SET is_alive = false WHERE id = ?`, [result.killedId]);
    recordPlayerDeath(roomId, result.killedId, 'night', room.round ?? 1);
    addKillHighlight(roomId, { killedId: result.killedId, killedNickname: result.killedNickname });
  }

  io.to(roomId).emit('night:result', {
    killedId:       result.killedId,
    killedNickname: result.killedNickname,
  });

  if (result.seerId && result.seerResult) {
    const seer = getRoom(roomId)?.players.get(result.seerId);
    const seerSocket = seer?.socketId ? io.sockets.sockets.get(seer.socketId) : null;
    if (seerSocket) {
      seerSocket.emit('night:seer_result', result.seerResult);
    }
  }

  if (result.seerId && result.seerResult?.faction === 'werewolf') {
    const seer = room.players.get(result.seerId);
    const revealedWolf = room.players.get(result.seerResult.targetId);
    addRevealHighlight(roomId, { seer, revealedWolf });
  }

  _notifySilenced(io, roomId, result);

  io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);

  const msg = result.killedNickname
    ? `เช้านี้พบร่างของ ${result.killedNickname}... หมู่บ้านไม่ปลอดภัยอีกต่อไป`
    : 'เมื่อคืนไม่มีใครเสียชีวิต หมู่บ้านยังสงบ... ชั่วคราว';

  io.to(roomId).emit('chat:message', {
    id:      `sys-night-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: msg,
    sentAt:  new Date().toISOString(),
  });

  return result;
}

async function _resolveVotingAndBroadcast(io, roomId) {
  const alivePlayers = getPlayersArray(roomId).filter(p => p.isAlive);
  const aliveIds     = alivePlayers.map(p => p.id);

  const { eliminatedId, tally, wasTie } = resolveVotes(roomId, aliveIds);

  if (!wasTie && eliminatedId && tally[eliminatedId] === alivePlayers.length) {
    const eliminatedPlayer = alivePlayers.find(p => p.id === eliminatedId);
    addUnanimousVoteHighlight(roomId, { eliminatedPlayer });
  }
  
  const room = getRoom(roomId);
  const eliminatedPlayer = eliminatedId ? room.players.get(eliminatedId) : null;
  if (eliminatedPlayer && eliminatedPlayer.role === 'werewolf') {
    const betrayingWerewolves = [];
    const { voteMap } = getVoteData(roomId);
    for (const [voterId, votedTargetId] of Object.entries(voteMap)) {
      const voter = room.players.get(voterId);
      if (voter && voter.role === 'werewolf' && votedTargetId === eliminatedId && voterId !== eliminatedId) {
        betrayingWerewolves.push(voter.id);
      }
    }
    addBetrayalHighlight(roomId, { eliminatedPlayer, betrayingWerewolves });
  }
  
  const playersWithCard = getPlayersArray(roomId).filter(p => {
    const card = room.gameMode === GAME_MODES.CHAOS ? room.fortuneCards?.get(p.id) : null;
    return p.isAlive && cardMatchesAny(card, ['broken_home', 'บ้านแตก', 'fragile_home', 'home_break', 'broken_house']);
  });

  if (playersWithCard.length > 0) {
    const sortedTally = Object.entries(tally)
      .map(([targetId, voters]) => ({ targetId, voteCount: voters.length }))
      .sort((a, b) => b.voteCount - a.voteCount);

    const topVotedIds = sortedTally.slice(0, 2).map(item => item.targetId);

    const voteInfo = [];
    const voteMap = room.votes.voteMap || {};
    for (const voterId of topVotedIds) {
      const voter = room.players.get(voterId);
      if (!voter) continue;

      const targetId = voteMap[voterId];
      const target = targetId ? room.players.get(targetId) : null;

      voteInfo.push({
        voterId: voter.id,
        voterNickname: voter.nickname,
        targetId: target?.id || null,
        targetNickname: target?.nickname || '???',
      });
    }

    if (voteInfo.length > 0) {
      for (const player of playersWithCard) {
        const s = player.socketId ? io.sockets.sockets.get(player.socketId) : null;
        if (s) s.emit('fortune:private_info', { type: 'broken_home', title: 'บ้านแตก', data: voteInfo });
      }
    }
  }

  clearVoting(roomId);

  let eliminatedNickname = null;
  let eliminatedRole     = null;

  if (eliminatedId) {
    const target = alivePlayers.find(p => p.id === eliminatedId);
    eliminatedNickname = target?.nickname ?? 'Unknown';
    eliminatedRole     = target?.role ?? null;
    updatePlayer(roomId, eliminatedId, { isAlive: false });
    recordPlayerDeath(roomId, eliminatedId, 'vote', room.round ?? 1);
    if (eliminatedRole === 'werewolf') {
      updateRoom(roomId, { memory: { ...(room.memory || {}), turningPoint: { playerId: eliminatedId, round: room.round ?? 1 } } });
    }
    updateRoom(roomId, { lastEliminatedId: eliminatedId });
    await pool.query(`UPDATE players SET is_alive = false WHERE id = ?`, [eliminatedId]);
  }

  io.to(roomId).emit('vote:result', {
    eliminatedId,
    eliminatedNickname,
    tally,
    wasTie,
  });

  io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);

  const msg = wasTie
    ? 'คะแนนเสมอ ไม่มีใครถูกกำจัดออกจากเกาะ'
    : eliminatedNickname
      ? `${eliminatedNickname} ถูกชาวบ้านโหวตออกจากเกาะ`
      : 'ไม่มีใครถูกโหวตออกรอบนี้';

  io.to(roomId).emit('chat:message', {
    id:      `sys-vote-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: msg,
    sentAt:  new Date().toISOString(),
  });

  return { eliminatedId, eliminatedRole, eliminatedNickname };
}