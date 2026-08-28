import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

let userRows = [];

mock.module('../../db/connection.js', {
  defaultExport: {
    query: async sql =>
      /FROM users/i.test(sql) ? [userRows, []] : [[], []],
  },
});

// morningEvents.js / roomConfig.js import gameSettingsService.js ซึ่ง import
// db/connection.js อีกทีแบบ transitive — mock.module ของ node:test ไม่ intercept
// การ import ทางอ้อมแบบนี้ ต้อง mock ตรงจุดที่ import จริงด้วย
mock.module('../services/gameSettingsService.js', {
  namedExports: {
    getSetting: (key, fallback) => fallback,
    refreshSettings: async () => {},
  },
});

// constants.js อ่าน role list ผ่าน gameDataService.js (โหลดจาก DB จริง) — ใน
// เทสต์ไม่มี DB จึงได้ [] เสมอ ทำให้ getRoleFactionMap() ว่างเปล่า และ win
// condition คำนวณผิด (เห็น aliveVillagers = 0 ทุกครั้ง) ต้อง mock ให้เป็น
// role list จริงตาม CLAUDE.md
mock.module('../services/gameDataService.js', {
  namedExports: {
    getActiveRoles: () => [
      { name_en: 'villager', faction: 'village', night_action: false },
      { name_en: 'werewolf', faction: 'werewolf', night_action: true },
      { name_en: 'seer', faction: 'village', night_action: true },
      { name_en: 'bodyguard', faction: 'village', night_action: true },
      { name_en: 'silencer', faction: 'village', night_action: true },
      { name_en: 'fool', faction: 'neutral', night_action: false },
    ],
    getActiveFortuneCards: () => [],
    getMorningEvents: () => [],
    refreshGameData: async () => {},
  },
});

const { advancePhase, clearPhaseTimer } = await import('./phaseManager.js');
const { createRoom, addPlayerToRoom, updatePlayer, updateRoom, getRoom, deleteRoom } =
  await import('./gameStore.js');
const { initVoting, castVote } = await import('./voteManager.js');
const { PHASES } = await import('./constants.js');
const { getPostGameHighlights } = await import('./highlightService.js');

function makeIo() {
  const emitted = [];      // broadcast ทั้งห้อง
  const privateEmits = []; // ส่งเข้า socket ใครคนเดียว
  const sockets = new Map();

  return {
    emitted,
    privateEmits,
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

test('first night advances directly to day one without resolving night actions', async t => {
  const roomId = 'room-first-night';
  createRoom({ id: roomId, name: roomId, hostId: 'p0', maxPlayers: 4, gameMode: 'classic' });
  ['werewolf', 'seer', 'villager', 'villager'].forEach((role, i) => {
    const id = `p${i}`;
    addPlayerToRoom(roomId, { id, nickname: id, socketId: `sock-${id}` });
    updatePlayer(roomId, id, { role });
  });
  updateRoom(roomId, { status: 'in_progress', phase: PHASES.NIGHT_ZERO, round: 0 });
  t.after(() => { clearPhaseTimer(roomId); deleteRoom(roomId); });

  const { io, emitted } = makeIo();
  await advancePhase(io, roomId);

  const room = getRoom(roomId);
  assert.equal(room.phase, PHASES.DAY);
  assert.equal(room.round, 1);
  assert.equal(room.nightResult, undefined);
  assert.equal(emitted.some(e => e.event === 'night:result'), false);
  assert.equal(emitted.some(e => e.event === 'morning:event'), false);
});

test('voting phase resolves and advances to results without crashing', async t => {
  const roomId = 'room-vote-advance';
  seedVotingRoom(roomId, ['werewolf', 'villager', 'villager', 'villager']);
  t.after(() => { clearPhaseTimer(roomId); deleteRoom(roomId); });

  const { io, emitted } = makeIo();

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

test('classic day transition does not create chaos state', async t => {
  const roomId = 'room-classic-no-chaos';
  createRoom({ id: roomId, name: roomId, hostId: 'p0', maxPlayers: 4, gameMode: 'classic' });
  ['werewolf', 'villager', 'villager', 'villager'].forEach((role, i) => {
    const id = `p${i}`;
    addPlayerToRoom(roomId, { id, nickname: id, socketId: `sock-${id}` });
    updatePlayer(roomId, id, { role });
  });
  updateRoom(roomId, { status: 'in_progress', phase: PHASES.NIGHT, round: 1, nightResult: {} });
  t.after(() => { clearPhaseTimer(roomId); deleteRoom(roomId); });

  const { io, emitted } = makeIo();
  await advancePhase(io, roomId);

  const room = getRoom(roomId);
  assert.equal(room.phase, PHASES.DAY);
  assert.equal(room.fortuneCards.size, 0);
  assert.equal(room.fortuneInventory.size, 0);
  assert.equal(room.activeLuckBias, null);
  assert.equal(emitted.some(e => e.event === 'morning:event'), false);
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
    level:       1,
    exp:         0,
    expNeeded:   7,   // เกณฑ์ของ Lv.1
    gamesPlayed: 5,
    leveledUp:   true,
  });
});

test('guests in the room get no exp and no progress event', async t => {
  const roomId = 'room-exp-guest';
  seedVotingRoom(roomId, ['werewolf', 'villager', 'villager', 'villager']);
  t.after(() => { clearPhaseTimer(roomId); deleteRoom(roomId); userRows = []; });

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

test('post-game highlight summary compiles from room memory and keeps the final narrative data', () => {
  const roomId = 'room-postgame-highlights';
  createRoom({ id: roomId, name: roomId, hostId: 'p0', maxPlayers: 4 });

  ['werewolf', 'villager', 'villager', 'fool'].forEach((role, index) => {
    addPlayerToRoom(roomId, { id: `p${index}`, nickname: `p${index}`, socketId: `sock-p${index}` });
    updatePlayer(roomId, `p${index}`, { role, isAlive: true });
  });

  const room = getRoom(roomId);
  room.status = 'finished';
  room.winner = 'fool';
  room.memory.voteTally = { p0: 3, p1: 1, p2: 1 };
  room.memory.voteHistory = [{ voterId: 'p1', targetId: 'p0' }, { voterId: 'p2', targetId: 'p0' }, { voterId: 'p3', targetId: 'p0' }];
  room.memory.firstDeath = { playerId: 'p2', cause: 'vote', round: 1 };
  room.memory.chatCountByPlayer = { p1: 12, p2: 7, p3: 3 };
  room.memory.savesByPlayer = { p1: 1 };
  room.memory.turningPoint = { playerId: 'p0', round: 1 };

  const highlights = getPostGameHighlights(roomId);
  assert.ok(highlights.some(h => h.type === 'MOST_TARGETED'));
  assert.ok(highlights.some(h => h.type === 'FIRST_BLOOD'));
  assert.ok(highlights.some(h => h.type === 'CHAT_CHAMP'));
  assert.ok(highlights.some(h => h.type === 'FOOL_WIN'));

  deleteRoom(roomId);
});

test('wolf sneaky highlight only fires when a werewolf is never targeted', () => {
  const roomId = 'room-postgame-wolf-sneak';
  createRoom({ id: roomId, name: roomId, hostId: 'p0', maxPlayers: 4 });

  ['werewolf', 'werewolf', 'villager', 'villager'].forEach((role, index) => {
    addPlayerToRoom(roomId, { id: `p${index}`, nickname: `p${index}`, socketId: `sock-p${index}` });
    updatePlayer(roomId, `p${index}`, { role, isAlive: true });
  });

  const room = getRoom(roomId);
  room.status = 'finished';
  room.winner = 'village';
  room.memory.voteTally = { p2: 2, p3: 1 };

  const highlights = getPostGameHighlights(roomId);
  assert.ok(highlights.some(h => h.type === 'WOLF_SNEAK' && h.playersInvolved[0] === 'p0'));
  assert.ok(!highlights.some(h => h.type === 'WOLF_SNEAK' && h.playersInvolved[0] === 'p1'));

  deleteRoom(roomId);
});