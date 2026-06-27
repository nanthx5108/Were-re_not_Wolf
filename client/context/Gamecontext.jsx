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
  GAME_ENDED:           'game:ended',
});

const initialState = {
  playerId:   null,
  nickname:   null,
  room:       null,
  myRole:     null,
  messages:   [],
  votes:      null,
  voteResult: null,
  connected:  false,
  error:      null,
  wolfTargets:   {},
  seerResult:    null,
  myNightAction: null,
  nightResult:   null,
  gameResult:    null,
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

    case 'CHAT_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.message].slice(-200),
      };

    case 'GAME_STARTED':
      return {
        ...state,
        myRole: action.myRole,
        room: state.room ? {
          ...state.room,
          status:      'in_progress',
          phase:       action.phase,
          phaseEndsAt: action.endsAt,
          round:       action.round ?? 1,
        } : state.room,
      };

    case 'PHASE_CHANGED':
      return {
        ...state,
        room: state.room ? {
          ...state.room,
          phase:       action.phase,
          phaseEndsAt: action.endsAt,
          round:       action.round,
        } : state.room,
        votes:      action.phase === 'voting' ? { voteMap: {}, counts: {} } : null,
        voteResult: action.phase === 'results' ? state.voteResult : null,
        wolfTargets:   action.phase === 'night' ? {} : state.wolfTargets,
        seerResult:    action.phase === 'night' ? null : state.seerResult,
        myNightAction: action.phase === 'night' ? null : state.myNightAction,
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

    case 'NIGHT_RESULT':
      return { ...state, nightResult: action.payload };

    case 'GAME_ENDED':
      return { ...state, gameResult: { winner: action.winner, message: action.message } };

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
      [SOCKET_EVENTS.CHAT_MESSAGE]:         (message)       => dispatch({ type: 'CHAT_MESSAGE', message }),
      [SOCKET_EVENTS.GAME_STARTED]:         (data)          => dispatch({ type: 'GAME_STARTED', ...data }),
      [SOCKET_EVENTS.PHASE_CHANGED]:        (data)          => dispatch({ type: 'PHASE_CHANGED', ...data }),
      [SOCKET_EVENTS.ERROR]:                ({ message })   => dispatch({ type: 'SET_ERROR', error: message }),
      [SOCKET_EVENTS.NIGHT_ACTION_ACK]:     (payload)       => dispatch({ type: 'NIGHT_ACTION_ACK', payload }),
      [SOCKET_EVENTS.NIGHT_RESULT]:         (payload)       => dispatch({ type: 'NIGHT_RESULT', payload }),
      [SOCKET_EVENTS.GAME_ENDED]:           ({ winner, message }) => dispatch({ type: 'GAME_ENDED', winner, message }),
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
    if (!socket.connected) socket.connect();
    socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId, playerId, nickname });
  }, []);
  const leaveRoom     = useCallback(() => { socket.emit(SOCKET_EVENTS.ROOM_LEAVE); socket.disconnect(); dispatch({ type: 'RESET' }); }, []);
  const sendMessage   = useCallback((content, channel = 'village') => socket.emit(SOCKET_EVENTS.CHAT_SEND, { content, channel }), []);
  const startGame     = useCallback(() => socket.emit(SOCKET_EVENTS.GAME_START), []);
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
      clearError,
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