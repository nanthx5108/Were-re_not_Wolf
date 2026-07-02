import test from 'node:test';
import assert from 'node:assert/strict';
import { canJoinRoom, getRoomPlayerLimit } from '../game/roomCapacity.js';
import { PLAYER_LIMITS } from '../game/constants.js';

test('uses the room-specific max player count when checking capacity', () => {
  const room = { maxPlayers: 4, players: new Map() };

  assert.equal(canJoinRoom(room, 3), true);
  assert.equal(canJoinRoom(room, 4), false);
});

test('falls back to the global maximum when the room has no explicit cap', () => {
  const room = { maxPlayers: undefined, players: new Map() };

  assert.equal(canJoinRoom(room, PLAYER_LIMITS.MAX - 1), true);
  assert.equal(canJoinRoom(room, PLAYER_LIMITS.MAX), false);
});

test('returns the room-specific player limit for capacity checks', () => {
  assert.equal(getRoomPlayerLimit({ maxPlayers: 4 }), 4);
  assert.equal(getRoomPlayerLimit({ maxPlayers: undefined }), PLAYER_LIMITS.MAX);
  assert.equal(getRoomPlayerLimit({ maxPlayers: 99 }), PLAYER_LIMITS.MAX);
});
