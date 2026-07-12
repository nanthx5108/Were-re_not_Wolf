import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// phaseManager แตะ DB ตอน resolve — เทสต์ตรงนี้สนใจ phase กับ exp ไม่ใช่ persistence จริง
// userRows คือแถวที่ SELECT ... FROM users จะคืนมา (ว่าง = ทุกคนเป็น guest)
let userRows = [];

mock.module('../../db/connection.js', {
  exports: {
    default: {
      query: async sql =>
        /FROM users/i.test(sql) ? [userRows, []] : [[], []],
    },
  },
});

const { advancePhase, clearPhaseTimer } = await import('./phaseManager.js');
const { createRoom, addPlayerToRoom, updatePlayer, updateRoom, getRoom, deleteRoom } =
  await import('./gameStore.js');
const { initVoting, castVote } = await import('./voteManager.js');
const { PHASES } = await import('./constants.js');

function makeIo() {
  const emitted = [];      // broadcast ทั้งห้อง
  const privateEmits = []; // ส่งเข้า socket ใครคนเดียว
  const sockets = new Map();

  return {
    emitted,
    privateEmits,
    // ผูก socket ปลอมให้ผู้เล่นคนหนึ่ง เพื่อดักข้อความที่ส่งถึงเจ้าตัวโดยตรง
    attachSocket(socketId) {
      sockets.set(socketId, {
        emit: (event, data) => privateEmits.push({ socketId, event, data }),
      });
    },
    io: {
      to: () => ({ emit: (event, data) => emitted.push({ event, data }) }),
      sockets: { sockets },
    },
  };
}

// ตั้งห้องที่กำลังโหวตอยู่ พร้อมบทบาทตามที่ระบุ
function seedVotingRoom(roomId, roles) {
  createRoom({ id: roomId, name: roomId, hostId: 'p0', maxPlayers: 8 });

  roles.forEach((role, i) => {
    const id = `p${i}`;
    addPlayerToRoom(roomId, { id, nickname: id, socketId: `sock-${id}` });
    updatePlayer(roomId, id, { role });
  });

  updateRoom(roomId, { status: 'in_progress', phase: PHASES.VOTING, round: 1 });
  initVoting(roomId);
}

test('voting phase resolves and advances to results without crashing', async t => {
  const roomId = 'room-vote-advance';
  // เนรเทศชาวบ้าน 1 คน แล้วเกมยังไม่จบ (wolf 1 < villager 2) — ต้องไปต่อที่ results
  seedVotingRoom(roomId, ['werewolf', 'villager', 'villager', 'villager']);
  t.after(() => { clearPhaseTimer(roomId); deleteRoom(roomId); });

  const { io, emitted } = makeIo();

  // p1..p3 โหวต p3 ออก
  castVote(roomId, 'p1', 'p3');
  castVote(roomId, 'p2', 'p3');
  castVote(roomId, 'p0', 'p3');

  await advancePhase(io, roomId);

  const room = getRoom(roomId);
  assert.equal(room.phase, PHASES.RESULTS, 'ต้องเดินหน้าไป results ไม่ใช่ค้างที่ voting');
  assert.equal(room.status, 'in_progress', 'เกมยังไม่ควรจบ');
  assert.equal(room.players.get('p3').isAlive, false, 'คนที่ถูกโหวตต้องตาย');

  assert.ok(emitted.some(e => e.event === 'vote:result'), 'ต้อง broadcast ผลโหวต');
  assert.ok(
    emitted.some(e => e.event === 'phase:changed' && e.data.phase === PHASES.RESULTS),
    'ต้อง broadcast phase:changed ไป results'
  );
});

test('fool voted out wins the game immediately', async t => {
  const roomId = 'room-vote-fool';
  seedVotingRoom(roomId, ['werewolf', 'villager', 'villager', 'fool']);
  t.after(() => { clearPhaseTimer(roomId); deleteRoom(roomId); });

  const { io, emitted } = makeIo();

  castVote(roomId, 'p0', 'p3');
  castVote(roomId, 'p1', 'p3');
  castVote(roomId, 'p2', 'p3');

  await advancePhase(io, roomId);

  const ended = emitted.find(e => e.event === 'game:ended');
  assert.ok(ended, 'ต้องประกาศจบเกม');
  assert.equal(ended.data.winner, 'fool');
  assert.equal(getRoom(roomId).status, 'finished');
});

test('voting out the last werewolf ends the game for the village', async t => {
  const roomId = 'room-vote-village-win';
  seedVotingRoom(roomId, ['werewolf', 'villager', 'villager', 'villager']);
  t.after(() => { clearPhaseTimer(roomId); deleteRoom(roomId); });

  const { io, emitted } = makeIo();

  castVote(roomId, 'p1', 'p0');
  castVote(roomId, 'p2', 'p0');
  castVote(roomId, 'p3', 'p0');

  await advancePhase(io, roomId);

  const ended = emitted.find(e => e.event === 'game:ended');
  assert.ok(ended, 'ต้องประกาศจบเกม');
  assert.equal(ended.data.winner, 'village');
  assert.equal(getRoom(roomId).status, 'finished');
});

test('ending a game awards exp and pushes the new level back to the player', async t => {
  const roomId = 'room-exp-award';
  seedVotingRoom(roomId, ['werewolf', 'villager', 'villager', 'villager']);
  t.after(() => { clearPhaseTimer(roomId); deleteRoom(roomId); userRows = []; });

  // p1 อยู่ Lv.0 exp 4 — Lv.0 ต้องการ 5 exp ดังนั้นเกมนี้ทำให้เลื่อนเป็น Lv.1 พอดี
  userRows = [{ id: 'p1', level: 0, exp: 4, games_played: 4 }];

  const harness = makeIo();
  harness.attachSocket('sock-p1');

  castVote(roomId, 'p1', 'p0');
  castVote(roomId, 'p2', 'p0');
  castVote(roomId, 'p3', 'p0');

  await advancePhase(harness.io, roomId);

  const progress = harness.privateEmits.find(e => e.event === 'player:progress');
  assert.ok(progress, 'ต้องส่ง player:progress กลับให้ผู้เล่นที่ล็อกอิน');
  assert.equal(progress.socketId, 'sock-p1', 'ต้องส่งถึงเจ้าตัวเท่านั้น');
  assert.deepEqual(progress.data, {
    level:       1,   // 4 + 1 = 5 ครบเกณฑ์ Lv.0 → เลื่อนขั้น
    exp:         0,   // exp ที่เหลือหลังหักค่าเลื่อนขั้น
    expNeeded:   7,   // เกณฑ์ของ Lv.1
    gamesPlayed: 5,
    leveledUp:   true,
  });
});

test('guests in the room get no exp and no progress event', async t => {
  const roomId = 'room-exp-guest';
  seedVotingRoom(roomId, ['werewolf', 'villager', 'villager', 'villager']);
  t.after(() => { clearPhaseTimer(roomId); deleteRoom(roomId); userRows = []; });

  // ไม่มีใครอยู่ในตาราง users เลย — ทุกคนเป็น guest
  userRows = [];

  const harness = makeIo();
  harness.attachSocket('sock-p1');

  castVote(roomId, 'p1', 'p0');
  castVote(roomId, 'p2', 'p0');
  castVote(roomId, 'p3', 'p0');

  await advancePhase(harness.io, roomId);

  assert.ok(
    harness.emitted.some(e => e.event === 'game:ended'),
    'เกมต้องจบตามปกติแม้ไม่มีใครล็อกอิน'
  );
  assert.equal(
    harness.privateEmits.filter(e => e.event === 'player:progress').length,
    0,
    'guest ไม่ควรได้รับ player:progress'
  );
});
