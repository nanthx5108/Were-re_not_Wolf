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
import { rollMorningEvent } from './morningEvents.js';
import { DEFAULT_PHASE_DURATIONS } from './roomConfig.js';

// RESULTS เป็นแค่หน้าสรุปสั้นๆ — ไม่เปิดให้ host ตั้ง จึงคงที่
export const RESULTS_DURATION_MS = 10_000;

// เวลาของ night/day/voting มาจาก config ของห้อง (วินาที) — DEFAULT_PHASE_DURATIONS เป็น fallback
export function getPhaseDurationMs(roomId, phase) {
  if (phase === PHASES.RESULTS) return RESULTS_DURATION_MS;

  const durations = getRoom(roomId)?.phaseDurations || DEFAULT_PHASE_DURATIONS;
  const seconds = durations[phase] ?? DEFAULT_PHASE_DURATIONS[phase];
  return (seconds ?? 30) * 1000;
}

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

  timers.set(roomId, { timerId, endsAt });
  return endsAt;
}

// กัน advancePhase ทำงานซ้อนกัน — ถูกเรียกได้จาก 3 ทาง (timer หมด, โหวตครบ, host skip)
// ระหว่างที่ resolve กำลัง await DB ถ้าอีกทางเรียกเข้ามาจะ resolve ซ้ำสองรอบ
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

    // Fool ชนะทันทีเมื่อถูกโหวตเนรเทศ (ไม่ใช่ถูกฆ่าตอนกลางคืน)
    if (eliminatedRole === 'fool') {
      return _endGameAndBroadcast(io, roomId, {
        winner: 'fool',
        message: '🃏 คนโง่ชนะแล้ว! การถูกเนรเทศคือสิ่งที่เขาต้องการมาตลอด',
      });
    }

    const win = evaluateWinCondition(roomId);
    if (win) return _endGameAndBroadcast(io, roomId, win);
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

  // เหตุการณ์ประจำเช้า — สุ่มทุกครั้งที่เข้าสู่ Day Phase
  const morning = nextPhase === PHASES.DAY ? rollMorningEvent(roomId) : null;

  // เหตุการณ์ที่ปรับเวลาแชท (น้ำขึ้นสูง / กองไฟ) คิดจากเวลา day ที่ host ตั้งไว้ ไม่ใช่ค่าคงที่
  const dayDuration = morning?.event.dayTimerMod
    ? morning.event.dayTimerMod(getPhaseDurationMs(roomId, PHASES.DAY))
    : undefined;

  const durationMs = dayDuration ?? getPhaseDurationMs(roomId, nextPhase);
  const endsAt = startPhaseTimer(io, roomId, nextPhase, dayDuration);

  io.to(roomId).emit('phase:changed', {
    phase:   nextPhase,
    endsAt,
    durationMs,   // client ใช้วาดแถบเวลา — ห้ามให้ client เดาเอง เพราะ host ตั้งเวลาได้และ event ปรับเวลาได้อีก
    round,
    message: PHASE_MESSAGES[nextPhase],
  });

  io.to(roomId).emit('chat:message', {
    id:      `sys-phase-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: PHASE_MESSAGES[nextPhase],
    sentAt:  new Date().toISOString(),
  });

  if (morning) {
    _broadcastMorningEvent(io, roomId, morning, round);
  }
}

function _broadcastMorningEvent(io, roomId, morning, round) {
  const { event, announcement, privateNote } = morning;

  io.to(roomId).emit('morning:event', {
    id:    event.id,
    icon:  event.icon,
    title: event.title,
    narrator: event.narrator,
    announcement,
    round,
  });

  const chatText = announcement
    ? `${event.icon} ${event.title} — ${event.narrator} (${announcement})`
    : `${event.icon} ${event.title} — ${event.narrator}`;

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
    timers.delete(roomId);
  }
}

export function getTimeRemaining(roomId) {
  const entry = timers.get(roomId);
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.endsAt - Date.now()) / 1000));
}

async function _endGameAndBroadcast(io, roomId, win) {
  endGame(roomId, win.winner, win.message);
  await pool.query(`UPDATE rooms SET status = 'finished' WHERE id = ?`, [roomId]);

  io.to(roomId).emit('game:ended', { winner: win.winner, message: win.message });
  io.to(roomId).emit('chat:message', {
    id:      `sys-end-${Date.now()}`,
    channel: CHANNELS.SYSTEM,
    content: win.message,
    sentAt:  new Date().toISOString(),
  });
}

async function _resolveNightActionsAndBroadcast(io, roomId) {
  const result = await resolveNightActions(roomId);
  if (!result) return null;

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

  io.to(roomId).emit('room:players_updated', serializeRoom(roomId).players);

  const msg = result.killedNickname
    ? `💀 เช้านี้พบร่างของ ${result.killedNickname}... หมู่บ้านไม่ปลอดภัยอีกต่อไป`
    : '🕊️ เมื่อคืนไม่มีใครเสียชีวิต หมู่บ้านยังสงบ... ชั่วคราว';

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