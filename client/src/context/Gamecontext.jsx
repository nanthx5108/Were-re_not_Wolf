import React, {
  createContext, useContext, useReducer,
  useEffect, useCallback, useMemo,
} from 'react';
import { socket } from '../socket/socket.jsx';
import { useToast } from '../components/ToastContext.jsx';
import soundManager from '../sound/soundManager.js';

export const SOCKET_EVENTS = Object.freeze({
  ROOM_JOIN:            'room:join',
  ROOM_LEAVE:           'room:leave',
  ROOM_STATE:           'room:state',
  ROOM_PLAYERS_UPDATED: 'room:players_updated',
  ROOM_HOST_CHANGED:    'room:host_changed',
  ROOM_CONFIG:          'room:config',
  ROOM_CONFIG_UPDATED:  'room:config_updated',
  CHAT_SEND:            'chat:send',
  CHAT_TYPING:          'chat:typing',
  CHAT_STOP_TYPING:     'chat:stop_typing',
  CHAT_TYPING_UPDATE:   'chat:typing_update',
  CHAT_MESSAGE:         'chat:message',
  CHAT_CENSORED:        'chat:censored',
  CHAT_DEAD_HISTORY:    'chat:dead_history',
  GAME_START:           'game:start',
  GAME_STARTED:         'game:started',
  PLAYER_READY:         'player:ready',
  NIGHTZERO_READY:      'nightzero:ready',
  PHASE_CHANGED:        'phase:changed',
  PHASE_ADVANCE:        'phase:advance',
  VOTE_CAST:            'vote:cast',
  VOTE_UPDATE:          'vote:update',
  VOTE_RESULT:          'vote:result',
  ERROR:                'error',
  NIGHT_ACTION:         'night:action',
  NIGHT_ACTION_ACK:     'night:action:ack',
  NIGHT_ACTION_UPDATE:  'night:action:update',
  NIGHT_RESULT:         'night:result',
  NIGHT_SEER_RESULT:    'night:seer_result',
  NIGHT_BLOCKED_TARGETS:'night:blocked_targets',
  CHAT_SILENCED:        'chat:silenced',
  MORNING_EVENT:        'morning:event',
  MORNING_EVENT_PRIVATE:'morning:event:private',
  FORTUNE_PRIVATE_INFO: 'fortune:private_info',
  FORTUNE_EARLY_INFO:   'fortune:early_info',
  FORTUNE_REALTIME_VOTE_COUNT: 'fortune:realtime_vote_count',
  PHASE_REQUEST_EXTRA_TIME: 'phase:request_extra_time',
  FORTUNE_CARD_DRAWN:   'fortune:card_drawn',
  GAME_ENDED:           'game:ended',
  GAME_RESUMED:         'game:resumed',
  ROOM_CLOSED:          'room:closed',
});

const SESSION_KEY = 'wnw:session';

export function saveSession(session) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* โหมดส่วนตัว */ }
}

export function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

export function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* โหมดส่วนตัว */ }
}

const restored = loadSession();

const initialState = {
  playerId:   restored?.playerId ?? null,
  nickname:   restored?.nickname ?? null,
  roomId:     restored?.roomId ?? null,
  room:       null,
  myRole:     null,
  messages:   [],
  votes:      null,
  voteResult: null,
  connected:  false,
  error:      null,
  highlights: [],
  wolfTargets:   {},
  teammates:     [],
  seerResult:    null,
  myNightAction: null,
  nightResult:   null,
  gameResult:    null,
  morningEvent:  null,
  privateNote:   null,
  blockedTargets: [],
  silencedNote:   null,
  censorNote:     null,
  actionLog:      [],   // narrator เสียดสีของ action log bar — สังเคราะห์จาก event ที่มีอยู่
  fortuneInfo:    null,
  earlyInfo:      null, // For 'good_to_know' card
  realtimeVoteCounts: null, // For 'magic_eyes' card
  myFortuneCard:  null, // System 3: การ์ดโชคดี/ร้ายประจำรอบ
  fortuneInventory: null,
  nightZero:      { readyCount: 0, total: 0 },   // ความคืบหน้า "ดูแล้ว" ในคืนที่ 0
  typingIds:      [],   // ผู้เล่นที่กำลังพิมพ์ — ใช้จัดลำดับ sidebar
  roomClosed:     false, // เจ้าของห้องปิดห้อง — ใช้เด้งผู้เล่นที่เหลือกลับหน้าแรก
};

let _logSeq = 0;
function pushLog(log, icon, text) {
  const entry = { id: `log-${Date.now()}-${_logSeq++}`, icon, text, at: new Date().toISOString() };
  return [...log, entry].slice(-40);
}

function gameReducer(state, action) {
  switch (action.type) {

    case 'SET_IDENTITY':
      return { ...state, playerId: action.playerId, nickname: action.nickname };

    case 'ROOM_CLOSED':
      return { ...state, room: null, gameResult: null, roomClosed: true };

    case 'SOCKET_CONNECTED':
      return { ...state, connected: true, error: null };

    case 'SOCKET_DISCONNECTED':
      return { ...state, connected: false };

    case 'ROOM_STATE':
      return {
        ...state,
        room:   action.room,
        myRole: action.room.myRole ?? state.myRole,
        roomClosed: false,
      };

    case 'PLAYERS_UPDATED':
      return {
        ...state,
        room: state.room ? { ...state.room, players: action.players } : state.room,
      };

    case 'HOST_CHANGED':
      return {
        ...state,
        room: state.room ? { ...state.room, hostId: action.newHostId } : state.room,
      };

    case 'CONFIG_UPDATED':
      return {
        ...state,
        room: state.room ? {
          ...state.room,
          roleConfig:        action.roleConfig,
          phaseDurations:    action.phaseDurations,
          revealRoleOnDeath: action.revealRoleOnDeath === true,
        } : state.room,
      };

    case 'CHAT_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message].slice(-200),
        actionLog: action.message.isWhisper ? state.actionLog : pushLog(state.actionLog, '💬', `${action.message.nickname}: ${action.message.content}`),
      };

    case 'DEAD_HISTORY': {
      const known = new Set(state.messages.map(m => m.id));
      const merged = [...state.messages, ...action.messages.filter(m => !known.has(m.id))];
      merged.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
      return { ...state, messages: merged.slice(-200) };
    }

    case 'CENSORED':
      return { ...state, censorNote: action.payload.message };

    case 'CLEAR_CENSOR_NOTE':
      return { ...state, censorNote: null };

    case 'GAME_STARTED':
      return {
        ...state,
        myRole: action.myRole,
        teammates: action.teammates ?? [],
        room: state.room ? {
          ...state.room,
          status:          'in_progress',
          phase:           action.phase,
          phaseEndsAt:     action.endsAt,
          phaseDurationMs: action.durationMs ?? null,
          round:           action.round ?? 1,
        } : state.room,
      };

    case 'NIGHTZERO_READY':
      return { ...state, nightZero: { readyCount: action.readyCount ?? 0, total: action.total ?? 0 } };

    case 'TYPING_UPDATE':
      return { ...state, typingIds: action.typingIds ?? [] };

    case 'PHASE_CHANGED':
      return {
        ...state,
        room: state.room ? {
          ...state.room,
          phase:           action.phase,
          phaseEndsAt:     action.endsAt,
          phaseDurationMs: action.durationMs ?? null,
          round:           action.round,
        } : state.room,
        typingIds:  [],
        votes:      action.phase === 'voting' ? { voteMap: {}, counts: {} } : null,
        voteResult: action.phase === 'results' ? state.voteResult : null,
        wolfTargets:   action.phase === 'night' ? {} : state.wolfTargets,
        seerResult:    action.phase === 'night' ? null : state.seerResult,
        myNightAction: action.phase === 'night' ? null : state.myNightAction,
        privateNote:   action.phase === 'night' ? null : state.privateNote,
        fortuneInfo:   action.phase === 'night' ? null : state.fortuneInfo,
        earlyInfo:     action.phase === 'night' ? null : state.earlyInfo,
        realtimeVoteCounts: null, // Clear vote stream when phase changes
        myFortuneCard: action.phase === 'night' ? null : state.myFortuneCard,
        silencedNote:  action.phase === 'night' ? null : state.silencedNote,
      };

    case 'VOTE_UPDATE':
      return {
        ...state,
        votes: { voteMap: action.voteMap, counts: action.counts },
      };

    case 'VOTE_RESULT':
      return {
        ...state,
        voteResult: {
          eliminatedId:       action.eliminatedId,
          eliminatedNickname: action.eliminatedNickname,
          tally:              action.tally,
          wasTie:             action.wasTie,
        },
        actionLog: pushLog(
          state.actionLog, '⚖️',
          action.wasTie
            ? 'เสียงเท่ากัน ไม่มีใครถูกเนรเทศ — ขี้ขลาดกันทั้งเกาะ'
            : action.eliminatedNickname
              ? `${action.eliminatedNickname} ถูกฝูงชนลากออกจากเกาะ ท่ามกลางเสียงปรบมือ`
              : 'ไม่มีใครถูกโหวตออก — ประชาธิปไตยล้มเหลวอีกครั้ง'
        ),
      };

    case 'NIGHT_ACTION_ACK':
      return { ...state, myNightAction: action.payload, nightResult: null };

    case 'WOLF_TARGET_UPDATE':
      return {
        ...state,
        wolfTargets: {
          ...state.wolfTargets,
          [action.payload.playerId]: action.payload,
        },
      };

    case 'NIGHT_RESULT':
      return {
        ...state,
        nightResult: action.payload,
        actionLog: pushLog(
          state.actionLog, action.payload?.killedNickname ? '🩸' : '🌅',
          action.payload?.killedNickname
            ? `${action.payload.killedNickname} ไม่ตื่นมาเห็นแสงอาทิตย์อีกแล้ว`
            : 'เช้านี้ไม่มีใครหายไป... น่าเสียดายสำหรับบางคน'
        ),
      };

    case 'SEER_RESULT':
      return { ...state, seerResult: action.payload };

    case 'BLOCKED_TARGETS':
      return { ...state, blockedTargets: action.payload.targetIds || [] };

    case 'SILENCED':
      return {
        ...state,
        silencedNote: action.payload.message,
        actionLog: pushLog(state.actionLog, '🤐', 'คอเจ้าแห้งผาก วันนี้พูดไม่ออกสักคำ'),
      };

    case 'MORNING_EVENT':
      if (state.room?.gameMode !== 'chaos') return state;
      return {
        ...state,
        morningEvent: action.payload,
        privateNote: null,
        actionLog: pushLog(
          state.actionLog, action.payload?.icon || '📜',
          action.payload?.announcement || action.payload?.title || 'เกาะมีเรื่องให้เล่าอีกแล้ว'
        ),
      };

    case 'MORNING_EVENT_PRIVATE':
      return { ...state, privateNote: action.payload.message };

    case 'FORTUNE_CARD_DRAWN':
      if (state.room?.gameMode !== 'chaos') return state;
      return { ...state, myFortuneCard: action.payload.card };

    case 'CLEAR_FORTUNE_CARD':
      return { ...state, myFortuneCard: null };

    case 'FORTUNE_PRIVATE_INFO':
      if (state.room?.gameMode !== 'chaos') return state;
      return { ...state, fortuneInfo: action.payload };

    case 'FORTUNE_EARLY_INFO':
      if (state.room?.gameMode !== 'chaos') return state;
      return { ...state, earlyInfo: action.payload.data };

    case 'FORTUNE_REALTIME_VOTE_COUNT':
      if (state.room?.gameMode !== 'chaos') return state;
      return { ...state, realtimeVoteCounts: action.payload.counts };

    case 'GAME_RESUMED':
      return {
        ...state,
        myRole:         action.myRole,
        teammates:      action.teammates ?? [],
        blockedTargets: action.blockedTargets ?? [],
        silencedNote:   action.isSilenced
          ? '🤐 เจ้ายังถูกปิดปากอยู่ — วันนี้พิมพ์อะไรไม่ได้'
          : null,
        messages:       action.messages ?? state.messages,
        myFortuneCard: action.myFortuneCard ?? null,
        fortuneInventory: action.fortuneInventory ?? null,
        room: state.room ? {
          ...state.room,
          status:          'in_progress',
          phase:           action.phase,
          phaseEndsAt:     action.endsAt,
          phaseDurationMs: action.durationMs ?? null,
          round:           action.round,
        } : state.room,
      };

    case 'GAME_ENDED':
      return {
        ...state,
        gameResult: { winner: action.winner, message: action.message, reveal: action.reveal ?? [] },
        highlights: action.highlights ?? [],
      };

    case 'RESET':
      return { ...initialState, playerId: state.playerId, nickname: state.nickname };

    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { addToast } = useToast();

  useEffect(() => {
    let fortuneClearTimer = null;

    const handlers = {
      connect:    () => dispatch({ type: 'SOCKET_CONNECTED' }),
      disconnect: () => dispatch({ type: 'SOCKET_DISCONNECTED' }),
      [SOCKET_EVENTS.ROOM_STATE]:           (room)          => dispatch({ type: 'ROOM_STATE', room }),
      [SOCKET_EVENTS.ROOM_PLAYERS_UPDATED]: (players)       => dispatch({ type: 'PLAYERS_UPDATED', players }),
      [SOCKET_EVENTS.ROOM_HOST_CHANGED]:    ({ newHostId }) => dispatch({ type: 'HOST_CHANGED', newHostId }),
      [SOCKET_EVENTS.ROOM_CONFIG_UPDATED]:  (config)        => dispatch({ type: 'CONFIG_UPDATED', ...config }),
      [SOCKET_EVENTS.CHAT_MESSAGE]: (message) => {
        const session = loadSession();
        if (
          message.channel !== 'system' &&
          message.playerId !== session?.playerId
        ) {
          soundManager.playEvent('chat', 0.5);
        }
        dispatch({ type: 'CHAT_MESSAGE', message });
      },
      [SOCKET_EVENTS.CHAT_TYPING_UPDATE]:   ({ typingIds }) => dispatch({ type: 'TYPING_UPDATE', typingIds }),
      [SOCKET_EVENTS.CHAT_CENSORED]:        (payload)       => dispatch({ type: 'CENSORED', payload }),
      [SOCKET_EVENTS.CHAT_DEAD_HISTORY]:    ({ messages })  => dispatch({ type: 'DEAD_HISTORY', messages: messages ?? [] }),
      [SOCKET_EVENTS.GAME_STARTED]:         (data) => {
        soundManager.playEvent('ready', 0.9);
        dispatch({ type: 'GAME_STARTED', ...data });
      },
      [SOCKET_EVENTS.NIGHTZERO_READY]:      (data)          => dispatch({ type: 'NIGHTZERO_READY', ...data }),
      [SOCKET_EVENTS.PHASE_CHANGED]: (data) => {
        soundManager.playEvent('phase');
        dispatch({ type: 'PHASE_CHANGED', ...data });
      },
      [SOCKET_EVENTS.ERROR]: ({ message }) => {
        soundManager.playEvent('error', 0.3);
        addToast(message, 'error');
      },
      [SOCKET_EVENTS.NIGHT_ACTION_ACK]:     (payload)       => dispatch({ type: 'NIGHT_ACTION_ACK', payload }),
      [SOCKET_EVENTS.NIGHT_ACTION_UPDATE]:  (payload)       => dispatch({ type: 'WOLF_TARGET_UPDATE', payload }),
      [SOCKET_EVENTS.NIGHT_RESULT]:         (payload) => {
        soundManager.playEvent(payload?.killedNickname ? 'badCard' : 'phase', payload?.killedNickname ? 0.7 : 0.5);
        dispatch({ type: 'NIGHT_RESULT', payload });
      },
      [SOCKET_EVENTS.NIGHT_SEER_RESULT]:    (payload)       => dispatch({ type: 'SEER_RESULT', payload }),
      [SOCKET_EVENTS.NIGHT_BLOCKED_TARGETS]:(payload)       => dispatch({ type: 'BLOCKED_TARGETS', payload }),
      [SOCKET_EVENTS.CHAT_SILENCED]:        (payload)       => dispatch({ type: 'SILENCED', payload }),
      [SOCKET_EVENTS.MORNING_EVENT]:        (payload)       => dispatch({ type: 'MORNING_EVENT', payload }),
      [SOCKET_EVENTS.MORNING_EVENT_PRIVATE]:(payload)       => dispatch({ type: 'MORNING_EVENT_PRIVATE', payload }),
      [SOCKET_EVENTS.FORTUNE_PRIVATE_INFO]: (payload)       => dispatch({ type: 'FORTUNE_PRIVATE_INFO', payload }),
      [SOCKET_EVENTS.FORTUNE_EARLY_INFO]:   (payload)       => dispatch({ type: 'FORTUNE_EARLY_INFO', payload }),
      [SOCKET_EVENTS.FORTUNE_REALTIME_VOTE_COUNT]: (payload) => dispatch({ type: 'FORTUNE_REALTIME_VOTE_COUNT', payload }),
      [SOCKET_EVENTS.FORTUNE_CARD_DRAWN]:   (payload) => {
        if (fortuneClearTimer) {
          clearTimeout(fortuneClearTimer);
          fortuneClearTimer = null;
        }
        soundManager.playEvent(payload?.card?.type === 'good' ? 'goodCard' : 'badCard', 0.9);
        dispatch({ type: 'FORTUNE_CARD_DRAWN', payload });

        if (payload?.card?.type === 'bad') {
          fortuneClearTimer = setTimeout(() => {
            dispatch({ type: 'CLEAR_FORTUNE_CARD' });
          }, 4200);
        }
      },
      [SOCKET_EVENTS.GAME_RESUMED]:         (data)          => dispatch({ type: 'GAME_RESUMED', ...data }),
      [SOCKET_EVENTS.GAME_ENDED]:           (payload) => {
        const winner = payload?.winner;
        soundManager.playEvent(winner === 'village' || winner === 'villagers' || winner === 'fool' ? 'win' : 'lose', 0.9);
        dispatch({ type: 'GAME_ENDED', ...payload });
      },
      [SOCKET_EVENTS.VOTE_UPDATE]: (data) => dispatch({ type: 'VOTE_UPDATE', ...data }),
      [SOCKET_EVENTS.VOTE_RESULT]: (data) => {
        soundManager.playEvent(data?.wasTie ? 'chat' : 'vote', data?.wasTie ? 0.5 : 0.8);
        dispatch({ type: 'VOTE_RESULT', ...data });
      },
   
      [SOCKET_EVENTS.ROOM_CLOSED]: () => {
        soundManager.playEvent('roomClose', 0.5);
        clearSession();
        dispatch({ type: 'ROOM_CLOSED' });
      },    };

    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
    return () => {
      if (fortuneClearTimer) clearTimeout(fortuneClearTimer);
      for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
    };
  }, [addToast]);

  const setIdentity   = useCallback((pid, nick) => dispatch({ type: 'SET_IDENTITY', playerId: pid, nickname: nick }), []);

  const joinRoom      = useCallback((roomId, playerId, nickname) => {
    saveSession({ roomId, playerId, nickname });
    if (!socket.connected) socket.connect();
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId, playerId, nickname });
  }, []);

  const leaveRoom     = useCallback(() => {
    soundManager.playSfx('/assets/audio/SFX-Chat.mp3', 0.3);
    clearSession();
    socket.emit(SOCKET_EVENTS.ROOM_LEAVE);
    socket.disconnect();
    dispatch({ type: 'RESET' });
  }, []);

  useEffect(() => {
    const session = loadSession();
    if (!session?.roomId || !session?.playerId) return;

    const rejoin = () => socket.emit(SOCKET_EVENTS.ROOM_JOIN, session);

    if (socket.connected) rejoin();
    else socket.connect();

    socket.on('connect', rejoin);
    return () => socket.off('connect', rejoin);
  }, []);
  const sendMessage   = useCallback((content, channel = 'village', options = {}, targetPlayerId = null) => socket.emit(SOCKET_EVENTS.CHAT_SEND, { content, channel, options, targetPlayerId }), []);
  const sendTyping    = useCallback(() => socket.emit(SOCKET_EVENTS.CHAT_TYPING), []);
  const sendStopTyping= useCallback(() => socket.emit(SOCKET_EVENTS.CHAT_STOP_TYPING), []);
  const startGame     = useCallback(() => {
    soundManager.playSfx('/assets/audio/SFX-Phase.mp3', 0.9);
    socket.emit(SOCKET_EVENTS.GAME_START);
  }, []);
  const markReady     = useCallback(() => {
    soundManager.playSfx('/assets/audio/SFX-Chat.mp3', 0.4);
    socket.emit(SOCKET_EVENTS.PLAYER_READY);
  }, []);
  const updateRoomConfig = useCallback((config) => socket.emit(SOCKET_EVENTS.ROOM_CONFIG, { config }), []);
  const advancePhase  = useCallback(() => socket.emit(SOCKET_EVENTS.PHASE_ADVANCE), []);
  const castVote      = useCallback((targetId) => {
    soundManager.playSfx('/assets/audio/SFX-Vote.mp3', 0.8);
    socket.emit(SOCKET_EVENTS.VOTE_CAST, { targetId });
  }, []);
  const requestExtraTime = useCallback(() => socket.emit(SOCKET_EVENTS.PHASE_REQUEST_EXTRA_TIME), []);
  const submitNightAction = useCallback((targetId) => {
    soundManager.playSfx('/assets/audio/SFX-NightAct.mp3', 0.8);
    socket.emit(SOCKET_EVENTS.NIGHT_ACTION, { targetId });
  }, []);
  const clearCensorNote = useCallback(() => dispatch({ type: 'CLEAR_CENSOR_NOTE' }), []);
  const loadDeadHistory = useCallback(() => socket.emit(SOCKET_EVENTS.CHAT_DEAD_HISTORY), []);

  const isDead = useMemo(() => Boolean(
    state.room?.status === 'in_progress' &&
    state.room.players?.find(p => p.id === state.playerId)?.isAlive === false
  ), [state.room?.status, state.room?.players, state.playerId]);

  const contextValue = useMemo(() => ({
    ...state,
    players: state.room?.players ?? [],
    isDead,
    setIdentity, joinRoom, leaveRoom,
    sendMessage, sendTyping, sendStopTyping, startGame, markReady, advancePhase, requestExtraTime,
    castVote, submitNightAction, updateRoomConfig,
    clearCensorNote, loadDeadHistory,
  }), [state, isDead, setIdentity, joinRoom, leaveRoom, sendMessage, sendTyping, sendStopTyping, startGame, markReady, advancePhase, requestExtraTime, castVote, submitNightAction, updateRoomConfig, clearCensorNote, loadDeadHistory, state.room?.players]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}