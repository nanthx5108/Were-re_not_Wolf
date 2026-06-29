const roomStore = new Map();

export function createRoom({ id, name, hostId, maxPlayers = 8, isPrivate = false }) {
  roomStore.set(id, {
    id, name, hostId,
    status:      'waiting',
    phase:       'lobby',
    round:       1,
    phaseEndsAt: null,
    maxPlayers,
    isPrivate,
    players:     new Map(),
    nightActions: {},
  });
  return roomStore.get(id);
}

export function getRoom(roomId)             { return roomStore.get(roomId) || null; }
export function deleteRoom(roomId)          { roomStore.delete(roomId); }

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
    id:       player.id,
    nickname: player.nickname,
    role:     player.role || null,
    isAlive:  true,
    socketId: player.socketId,
  });
  return room;
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
    phase:       room.phase,
    round:       room.round,
    phaseEndsAt: room.phaseEndsAt,
    maxPlayers:  room.maxPlayers ?? 8,
    players: getPlayersArray(roomId).map(p => ({
      id:       p.id,
      nickname: p.nickname,
      isAlive:  p.isAlive,
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








