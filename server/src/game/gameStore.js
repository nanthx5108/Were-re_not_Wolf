import { buildDefaultRoomConfig } from './roomConfig.js';
import { getActiveRoles, getActiveFortuneCards, getMorningEvents } from '../services/gameDataService.js';

const roomStore = new Map();

export function createRoom({ id, name, hostId, maxPlayers = 8, isPrivate = false, gameMode = 'classic', config }) {
  const { roleConfig, phaseDurations, revealRoleOnDeath } = config || buildDefaultRoomConfig(maxPlayers);

  roomStore.set(id, {
    id, name, hostId,
    status:      'waiting',
    gameMode,
    createdAt:   new Date().toISOString(),
    phase:       'lobby',
    round:       1,
    phaseEndsAt: null,
    maxPlayers,
    isPrivate,
    roleConfig,
    phaseDurations,
    fortuneCards: new Map(),
    fortuneInventory: new Map(),
    usedWhispers: new Set(), // For 'whisper' card
    usedExtraTime: new Set(), // For 'injury_time' card
    revealRoleOnDeath: revealRoleOnDeath === true,
    players:     new Map(),
    nightActions: {},
    memory: {
      voteTally: {},
      voteHistory: [],
      deathLog: [],
      firstDeath: null,
      chatCountByPlayer: {},
      savesByPlayer: {},
      turningPoint: null,
    },
  });
  return roomStore.get(id);
}

export function getRoom(roomId)             { return roomStore.get(roomId) || null; }
export function deleteRoom(roomId)          { roomStore.delete(roomId); }
export function getAllRooms()               { return Array.from(roomStore.values()); }

export function updateRoom(roomId, updates) {
  const room = getRoom(roomId);
  if (!room) return null;
  Object.assign(room, updates);
  return room;
}

export function addPlayerToRoom(roomId, player) {
  const room = getRoom(roomId);
  if (!room) return null;
  room.players.set(player.id, {
    id:          player.id,
    nickname:    player.nickname,
    role:        player.role || null,
    isAlive:     true,
    isConnected: true,
    socketId:    player.socketId,
    isConfusedThisRound: false, // For 'confused' fortune card effect (prevents voting this round)
    hasConfusedRecurrence: false, // For 'confused' 10% recurrence chance for next round
    silenceShieldUsed: false,
    reflexUsed: false,
  });
  return room;
}

export function getConnectedPlayers(roomId) {
  return getPlayersArray(roomId).filter(p => p.isConnected);
}

export function removePlayerFromRoom(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return null;
  room.players.delete(playerId);
  return room;
}

export function updatePlayer(roomId, playerId, updates) {
  const room = getRoom(roomId);
  if (!room) return null;
  const player = room.players.get(playerId);
  if (!player) return null;
  Object.assign(player, updates);
  return player;
}

export function getPlayersArray(roomId) {
  const room = getRoom(roomId);
  return room ? Array.from(room.players.values()) : [];
}

export function findRoomBySocketId(socketId) {
  for (const room of roomStore.values()) {
    for (const player of room.players.values()) {
      if (player.socketId === socketId) return { room, player };
    }
  }
  return null;
}

export function serializeRoom(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  return {
    id:          room.id,
    name:        room.name,
    hostId:      room.hostId,
    status:      room.status,
    gameMode:    room.gameMode || 'classic',
    phase:       room.phase,
    round:       room.round,
    phaseEndsAt: room.phaseEndsAt,
    maxPlayers:  room.maxPlayers ?? 8,
    roleConfig:     room.roleConfig,
    phaseDurations: room.phaseDurations,
    revealRoleOnDeath: room.revealRoleOnDeath === true,
    playerCount: getPlayersArray(roomId).length,
    players: getPlayersArray(roomId).map(p => ({
      id:          p.id,
      nickname:    p.nickname,
      isAlive:     p.isAlive,
      isConnected: p.isConnected !== false,
      ...(room.revealRoleOnDeath === true && p.isAlive === false ? { revealedRole: p.role } : {}),
    })),
    activeRoles: getActiveRoles(),
    activeFortuneCards: getActiveFortuneCards(),
    morningEvents: getMorningEvents(),
  };
}

export function serializeRoomForAdmin(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  return {
    ...serializeRoom(roomId),
    players: getPlayersArray(roomId).map(p => ({
      id: p.id, nickname: p.nickname, role: p.role, isAlive: p.isAlive,
      isConnected: p.isConnected !== false, isMutedByAdmin: p.isMutedByAdmin === true,
    })),
  };
}

export function serializeRoomForPlayer(roomId, requestingPlayerId) {
  const room = getRoom(roomId);
  if (!room) return null;
  return {
    ...serializeRoom(roomId),
    myRole: room.players.get(requestingPlayerId)?.role || null,
  };
}