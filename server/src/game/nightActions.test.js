import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, addPlayerToRoom, updatePlayer, updateRoom, deleteRoom, getRoom } from './gameStore.js';
import { initNightActions, submitNightAction, getBlockedProtectTargets } from './nightActions.js';

let seq = 0;

// สร้างห้องพร้อมผู้เล่นที่กำหนดบทบาทไว้แล้ว — คืน roomId
function setupRoom(roles) {
  const roomId = `T${seq++}`;
  createRoom({ id: roomId, name: 'test', hostId: 'p0', maxPlayers: 8 });
  roles.forEach((role, i) => {
    addPlayerToRoom(roomId, { id: `p${i}`, nickname: `P${i}` });
    updatePlayer(roomId, `p${i}`, { role });
  });
  initNightActions(roomId);
  return roomId;
}

test('bodyguard cannot protect the same player two nights running', (t) => {
  const roomId = setupRoom(['bodyguard', 'werewolf', 'villager', 'villager']);
  t.after(() => deleteRoom(roomId));

  // คืนแรกยังไม่มีใครถูกเฝ้า จึงเลือกได้ทุกคน
  assert.deepEqual(getBlockedProtectTargets(roomId, 'p0'), []);
  assert.ok(submitNightAction(roomId, 'p0', { targetId: 'p2' }));

  // จำลองว่าคืนแรก resolve แล้วบันทึกว่าเฝ้า p2 ไว้
  updateRoom(roomId, { lastProtectedIds: ['p2'] });
  initNightActions(roomId);

  assert.deepEqual(getBlockedProtectTargets(roomId, 'p0'), ['p2']);
  assert.equal(submitNightAction(roomId, 'p0', { targetId: 'p2' }), null, 'ป้องกันซ้ำต้องถูกปฏิเสธ');

  // คนอื่นยังเลือกได้ปกติ
  assert.ok(submitNightAction(roomId, 'p0', { targetId: 'p3' }));
});

test('the repeat-protect block only applies to the bodyguard', (t) => {
  const roomId = setupRoom(['bodyguard', 'seer', 'werewolf', 'villager']);
  t.after(() => deleteRoom(roomId));

  updateRoom(roomId, { lastProtectedIds: ['p3'] });

  // Seer เฝ้าไม่ได้อยู่แล้ว — ต้องไม่ติดกฎของผู้พิทักษ์
  assert.deepEqual(getBlockedProtectTargets(roomId, 'p1'), []);
  assert.ok(submitNightAction(roomId, 'p1', { targetId: 'p3' }), 'Seer ยังตรวจคนที่เคยถูกเฝ้าได้');
});

test('silencer action is recorded and targets cannot include self', (t) => {
  const roomId = setupRoom(['silencer', 'werewolf', 'villager', 'villager']);
  t.after(() => deleteRoom(roomId));

  assert.equal(submitNightAction(roomId, 'p0', { targetId: 'p0' }), null, 'ปิดปากตัวเองไม่ได้');

  const actions = submitNightAction(roomId, 'p0', { targetId: 'p2' });
  assert.deepEqual(actions.silencer, { playerId: 'p0', targetId: 'p2' });
});

test('villagers have no night action', (t) => {
  const roomId = setupRoom(['villager', 'werewolf', 'villager', 'villager']);
  t.after(() => deleteRoom(roomId));

  assert.equal(submitNightAction(roomId, 'p0', { targetId: 'p2' }), null);
});

test('a dead bodyguard gets no blocked targets', (t) => {
  const roomId = setupRoom(['bodyguard', 'werewolf', 'villager', 'villager']);
  t.after(() => deleteRoom(roomId));

  updateRoom(roomId, { lastProtectedIds: ['p2'] });
  updatePlayer(roomId, 'p0', { isAlive: false });

  assert.equal(submitNightAction(roomId, 'p0', { targetId: 'p3' }), null, 'คนตายทำ action ไม่ได้');
  assert.equal(getRoom(roomId).players.get('p0').isAlive, false);
});
