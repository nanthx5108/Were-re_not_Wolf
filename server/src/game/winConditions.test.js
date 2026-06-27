import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, addPlayerToRoom, deleteRoom } from './gameStore.js';
import { evaluateWinCondition } from './winConditions.js';

test('werewolf wins when no village players remain alive', () => {
  const roomId = 'test-room-1';
  createRoom({ id: roomId, name: 'Test', hostId: 'p1' });
  addPlayerToRoom(roomId, { id: 'p1', nickname: 'Alice' });
  addPlayerToRoom(roomId, { id: 'p2', nickname: 'Bob' });

  const room = createRoom({ id: roomId, name: 'Test', hostId: 'p1' });
  room.players.get('p1').role = 'werewolf';
  room.players.get('p2').role = 'werewolf';

  const result = evaluateWinCondition(roomId);

  assert.deepEqual(result, {
    winner: 'werewolf',
    message: 'หมาป่าชนะแล้ว! พวกมันมีจำนวนเท่าหรือมากกว่าชาวบ้าน.',
  });

  deleteRoom(roomId);
});
