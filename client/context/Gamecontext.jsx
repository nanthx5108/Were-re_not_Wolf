import React, {
  createContext, useContext, useReducer,
  useEffect, useCallback,
} from 'react';
import { socket } from '../src/socket/socket.jsx';

export const SOCKET_EVENTS = Object.freeze({
  ROOM_JOIN:            'room:join',
  ROOM_LEAVE:           'room:leave',
  ROOM_STATE:           'room:state',
  ROOM_PLAYERS_UPDATED: 'room:players_updated',
  ROOM_HOST_CHANGED:    'room:host_changed',
  ROOM_CONFIG:          'room:config',
  ROOM_CONFIG_UPDATED:  'room:config_updated',
  CHAT_SEND:            'chat:send',
  CHAT_MESSAGE:         'chat:message',
  GAME_START:           'game:start',
  GAME_STARTED:         'game:started',
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
  GAME_ENDED:           'game:ended',
  GAME_RESUMED:         'game:resumed',
});

// เก็บ identity ไว้ใน sessionStorage เพื่อให้รีเฟรชแล้วกลับเข้าเกมได้
// ใช้ session ไม่ใช่ local เพราะแยกตามแท็บ — เปิดหลายแท็บทดสอบพร้อมกันได้โดยไม่ทับกัน
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
};

function gameReducer(state, action) {
  switch (action.type) {

    case 'SET_IDENTITY':
      return { ...state, playerId: action.playerId, nickname: action.nickname };

    case 'SOCKET_CONNECTED':
      return { ...state, connected: true, error: null };

    case 'SOCKET_DISCONNECTED':
      return { ...state, connected: false };

    case 'ROOM_STATE':
      return {
        ...state,
        room:   action.room,
        myRole: action.room.myRole ?? state.myRole,
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

    // config ที่ server validate แล้ว — ทุกคนในห้องได้รับเหมือนกัน รวมทั้ง host เอง
    // แผงตั้งค่าจึงวาดจาก state นี้ตัวเดียว ไม่มี local state ให้ drift
    case 'CONFIG_UPDATED':
      return {
        ...state,
        room: state.room ? {
          ...state.room,
          roleConfig:     action.roleConfig,
          phaseDurations: action.phaseDurations,
        } : state.room,
      };

    case 'CHAT_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message].slice(-200),
      };

    case 'GAME_STARTED':
      return {
        ...state,
        myRole: action.myRole,
        teammates: action.teammates ?? [],   // มีเฉพาะหมาป่า — server ไม่ส่ง field นี้ให้คนอื่น
        room: state.room ? {
          ...state.room,
          status:          'in_progress',
          phase:           action.phase,
          phaseEndsAt:     action.endsAt,
          phaseDurationMs: action.durationMs ?? null,
          round:           action.round ?? 1,
        } : state.room,
      };

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
        votes:      action.phase === 'voting' ? { voteMap: {}, counts: {} } : null,
        voteResult: action.phase === 'results' ? state.voteResult : null,
        wolfTargets:   action.phase === 'night' ? {} : state.wolfTargets,
        seerResult:    action.phase === 'night' ? null : state.seerResult,
        myNightAction: action.phase === 'night' ? null : state.myNightAction,
        privateNote:   action.phase === 'night' ? null : state.privateNote,
        // การปิดปากมีผลแค่วันเดียว — พอขึ้นคืนใหม่ก็พูดได้ (ตรงกับที่ server เคลียร์)
        silencedNote:  action.phase === 'night' ? null : state.silencedNote,
        // morningEvent คงไว้ข้ามคืน — NightAction ใช้เช็ค effect เช่น เรือกลับเข้าฝั่ง (เลือกป้องกัน 2 คน)
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
      };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'NIGHT_ACTION_ACK':
      return { ...state, myNightAction: action.payload, nightResult: null };

    // มาจาก server เฉพาะเมื่อเราเป็นหมาป่า — เป้าหมายของเพื่อนร่วมทีม
    case 'WOLF_TARGET_UPDATE':
      return {
        ...state,
        wolfTargets: {
          ...state.wolfTargets,
          [action.payload.playerId]: action.payload,
        },
      };

    case 'NIGHT_RESULT':
      return { ...state, nightResult: action.payload };

    case 'SEER_RESULT':
      return { ...state, seerResult: action.payload };

    // ผู้พิทักษ์เท่านั้นที่ได้รับ — คนที่เพิ่งเฝ้าไปเมื่อคืน เลือกซ้ำไม่ได้
    case 'BLOCKED_TARGETS':
      return { ...state, blockedTargets: action.payload.targetIds || [] };

    case 'SILENCED':
      return { ...state, silencedNote: action.payload.message };

    case 'MORNING_EVENT':
      return { ...state, morningEvent: action.payload, privateNote: null };

    case 'MORNING_EVENT_PRIVATE':
      return { ...state, privateNote: action.payload.message };

    // กลับเข้าเกมหลังรีเฟรช/เน็ตหลุด — server ส่ง state ส่วนตัวมาให้ครบชุด
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
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    const handlers = {
      connect:    () => dispatch({ type: 'SOCKET_CONNECTED' }),
      disconnect: () => dispatch({ type: 'SOCKET_DISCONNECTED' }),

      [SOCKET_EVENTS.ROOM_STATE]:           (room)          => dispatch({ type: 'ROOM_STATE', room }),
      [SOCKET_EVENTS.ROOM_PLAYERS_UPDATED]: (players)       => dispatch({ type: 'PLAYERS_UPDATED', players }),
      [SOCKET_EVENTS.ROOM_HOST_CHANGED]:    ({ newHostId }) => dispatch({ type: 'HOST_CHANGED', newHostId }),
      [SOCKET_EVENTS.ROOM_CONFIG_UPDATED]:  (config)        => dispatch({ type: 'CONFIG_UPDATED', ...config }),
      [SOCKET_EVENTS.CHAT_MESSAGE]:         (message)       => dispatch({ type: 'CHAT_MESSAGE', message }),
      [SOCKET_EVENTS.GAME_STARTED]:         (data)          => dispatch({ type: 'GAME_STARTED', ...data }),
      [SOCKET_EVENTS.PHASE_CHANGED]:        (data)          => dispatch({ type: 'PHASE_CHANGED', ...data }),
      [SOCKET_EVENTS.ERROR]:                ({ message })   => dispatch({ type: 'SET_ERROR', error: message }),
      [SOCKET_EVENTS.NIGHT_ACTION_ACK]:     (payload)       => dispatch({ type: 'NIGHT_ACTION_ACK', payload }),
      [SOCKET_EVENTS.NIGHT_ACTION_UPDATE]:  (payload)       => dispatch({ type: 'WOLF_TARGET_UPDATE', payload }),
      [SOCKET_EVENTS.NIGHT_RESULT]:         (payload)       => dispatch({ type: 'NIGHT_RESULT', payload }),
      [SOCKET_EVENTS.NIGHT_SEER_RESULT]:    (payload)       => dispatch({ type: 'SEER_RESULT', payload }),
      [SOCKET_EVENTS.NIGHT_BLOCKED_TARGETS]:(payload)       => dispatch({ type: 'BLOCKED_TARGETS', payload }),
      [SOCKET_EVENTS.CHAT_SILENCED]:        (payload)       => dispatch({ type: 'SILENCED', payload }),
      [SOCKET_EVENTS.MORNING_EVENT]:        (payload)       => dispatch({ type: 'MORNING_EVENT', payload }),
      [SOCKET_EVENTS.MORNING_EVENT_PRIVATE]:(payload)       => dispatch({ type: 'MORNING_EVENT_PRIVATE', payload }),
      [SOCKET_EVENTS.GAME_RESUMED]:         (data)          => dispatch({ type: 'GAME_RESUMED', ...data }),
      [SOCKET_EVENTS.GAME_ENDED]:           ({ winner, message, reveal }) => dispatch({ type: 'GAME_ENDED', winner, message, reveal }),
      [SOCKET_EVENTS.VOTE_UPDATE]: (data) => dispatch({ type: 'VOTE_UPDATE', ...data }),
      [SOCKET_EVENTS.VOTE_RESULT]: (data) => dispatch({ type: 'VOTE_RESULT', ...data }),
    };

    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
    return () => {
      for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
    };
  }, []);

  const setIdentity   = useCallback((pid, nick) => dispatch({ type: 'SET_IDENTITY', playerId: pid, nickname: nick }), []);

  const joinRoom      = useCallback((roomId, playerId, nickname) => {
    saveSession({ roomId, playerId, nickname });
    if (!socket.connected) socket.connect();
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId, playerId, nickname });
  }, []);

  const leaveRoom     = useCallback(() => {
    clearSession();
    socket.emit(SOCKET_EVENTS.ROOM_LEAVE);
    socket.disconnect();
    dispatch({ type: 'RESET' });
  }, []);

  // รีเฟรชหน้ากลางเกม / เน็ตหลุดแล้ว socket.io ต่อกลับได้ → ยิง room:join ซ้ำด้วย identity เดิม
  // server เห็นว่า playerId อยู่ในห้องอยู่แล้ว จึงคืน state ให้แทนที่จะปฏิเสธว่า "เกมเริ่มไปแล้ว"
  useEffect(() => {
    const session = loadSession();
    if (!session?.roomId || !session?.playerId) return;

    const rejoin = () => socket.emit(SOCKET_EVENTS.ROOM_JOIN, session);

    if (socket.connected) rejoin();
    else socket.connect();

    socket.on('connect', rejoin);
    return () => socket.off('connect', rejoin);
  }, []);
  const sendMessage   = useCallback((content, channel = 'village') => socket.emit(SOCKET_EVENTS.CHAT_SEND, { content, channel }), []);
  const startGame     = useCallback(() => socket.emit(SOCKET_EVENTS.GAME_START), []);
  const updateRoomConfig = useCallback((config) => socket.emit(SOCKET_EVENTS.ROOM_CONFIG, { config }), []);
  const advancePhase  = useCallback(() => socket.emit(SOCKET_EVENTS.PHASE_ADVANCE), []);
  const castVote      = useCallback((targetId) => socket.emit(SOCKET_EVENTS.VOTE_CAST, { targetId }), []);
  const submitNightAction = useCallback((targetId) => socket.emit(SOCKET_EVENTS.NIGHT_ACTION, { targetId }), []);
  const clearError    = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <GameContext.Provider value={{
      ...state,
      setIdentity, joinRoom, leaveRoom,
      sendMessage, startGame, advancePhase,
      castVote, submitNightAction,
      updateRoomConfig, clearError,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}