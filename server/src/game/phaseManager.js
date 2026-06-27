import pool from '../../db/connection.js';
import {
  getRoom, updateRoom, updatePlayer,
  getPlayersArray, serializeRoom,
} from './gameStore.js';
import { PHASES, CHANNELS } from './constants.js';
import {
  resolveVotes, clearVoting, initVoting,
} from './voteManager.js';
import { initNightActions, resolveNightActions } from './nightActions.js';
import { evaluateWinCondition, endGame } from './winConditions.js';

export const PHASE_DURATIONS_MS = Object.freeze({
  [PHASES.NIGHT]:   30_000,
  [PHASES.DAY]:     60_000,
  [PHASES.VOTING]:  30_000,
  [PHASES.RESULTS]: 10_000,
});

const NEXT_PHASE = Object.freeze({
  [PHASES.NIGHT]:   PHASES.DAY,
  [PHASES.DAY]:     PHASES.VOTING,
  [PHASES.VOTING]:  PHASES.RESULTS,
  [PHASES.RESULTS]: PHASES.NIGHT,
});

const PHASE_MESSAGES = Object.freeze({
  [PHASES.NIGHT]:   '🌙 ค่ำคืนมาถึง... หมู่บ้านหลับใหล',
  [PHASES.DAY]:     '☀️ รุ่งสางแล้ว! จงพูดคุยและหาตัวหมาป่า',
  [PHASES.VOTING]:  '🗳️ ถึงเวลาโหวตแล้ว ใครคือหมาป่า?',
  [PHASES.RESULTS]: '📜 กำลังนับคะแนนเสียง...',
});

const timers = new Map();

export function startPhaseTimer(io, roomId, phase) {
  clearPhaseTimer(roomId);

  const duration = PHASE_DURATIONS_MS[phase] ?? 30_000;
  const endsAt   = Date.now() + duration;

  updateRoom(roomId, { phaseEndsAt: endsAt });

  const timerId = setTimeout(() => {
    advancePhase(io, roomId).catch(err =>
      console.error('[phaseManager timer]', err)
    );
  }, duration);

  timers.set(roomId, { timerId, endsAt });
  return endsAt;
}

export async function advancePhase(io, roomId) {
  const room = getRoom(roomId);
  if (!room || room.status !== 'in_progress') return;

  if (room.phase === PHASES.NIGHT) {
    const nightResult = await _resolveNightActionsAndBroadcast(io, roomId);
    const win = evaluateWinCondition(roomId);
    if (win) {
      endGame(roomId, win.winner, win.message);
      io.to(roomId).emit('game:ended', { winner: win.winner, message: win.message });
      io.to(roomId).emit('chat:message', {
        id: `sys-end-${Date.now()}`,
        channel: CHANNELS.SYSTEM,
        content: win.message,
        sentAt: new Date().toISOString(),
      });
      return;
    }
    updateRoom(roomId, { nightResult });
  }

  if (room.phase === PHASES.VOTING) {
    await _resolveVotingAndBroadcast(io, roomId);
    const win = evaluateWinCondition(roomId);
    if (win) {
      endGame(roomId, win.winner, win.message);
      io.to(roomId).emit('game:ended', { winner: win.winner, message: win.message });
      io.to(roomId).emit('chat:message', {
        id: `sys-end-${Date.now()}`,
        channel: CHANNELS.SYSTEM,
        content: win.message,
        sentAt: new Date().toISOString(),
      });
      return;
    }
  }

  const nextPhase = NEXT_PHASE[room.phase] ?? PHASES.DAY;

  if (nextPhase === PHASES.NIGHT) {
    initNightActions(roomId);
  }

  if (nextPhase === PHASES.VOTING) {
    initVoting(roomId);
  }

  const round = nextPhase === PHASES.NIGHT
    ? (room.round ?? 1) + 1
    : (room.round ?? 1);

  updateRoom(roomId, { phase: nextPhase, round });

  const endsAt = startPhaseTimer(io, roomId, nextPhase);

  io.to(roomId).emit('phase:changed', {
    phase:   nextPhase,
    endsAt,
    round,
    message: PHASE_MESSAGES[nextPhase],
  });

  io.to(roomId).emit('chat:message', {
    id:      `sys-phase-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: PHASE_MESSAGES[nextPhase],
    sentAt:  new Date().toISOString(),
  });
}

export function clearPhaseTimer(roomId) {
  const entry = timers.get(roomId);
  if (entry) {
    clearTimeout(entry.timerId);
    timers.delete(roomId);
  }
}

export function getTimeRemaining(roomId) {
  const entry = timers.get(roomId);
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.endsAt - Date.now()) / 1000));
}

async function _resolveVotingAndBroadcast(io, roomId) {
  const alivePlayers = getPlayersArray(roomId).filter(p => p.isAlive);
  const aliveIds     = alivePlayers.map(p => p.id);

  const { eliminatedId, tally, wasTie } = resolveVotes(roomId, aliveIds);
  clearVoting(roomId);

  let eliminatedNickname = null;

  if (eliminatedId) {
    const target = alivePlayers.find(p => p.id === eliminatedId);
    eliminatedNickname = target?.nickname ?? 'Unknown';
    updatePlayer(roomId, eliminatedId, { isAlive: false });
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
    ? '🤝 คะแนนเสมอ! ไม่มีใครถูกกำจัดออกจากเกาะ'
    : eliminatedNickname
      ? `💀 ${eliminatedNickname} ถูกชาวบ้านโหวตออกจากเกาะ!`
      : '🤷 ไม่มีใครถูกโหวตออกรอบนี้';

  io.to(roomId).emit('chat:message', {
    id:      `sys-vote-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: msg,
    sentAt:  new Date().toISOString(),
  });
}