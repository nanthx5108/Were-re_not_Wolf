import { PLAYER_LIMITS } from './constants.js';

export function getRoomPlayerLimit(room) {
  const parsed = Number(room?.maxPlayers);
  if (!Number.isInteger(parsed)) return PLAYER_LIMITS.MAX;
  return Math.min(PLAYER_LIMITS.MAX, Math.max(PLAYER_LIMITS.MIN, parsed));
}

export function canJoinRoom(room, currentPlayerCount) {
  return currentPlayerCount < getRoomPlayerLimit(room);
}
