import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// chat:send เขียนข้อความลง DB — เทสต์ตรงนี้สนใจว่าข้อความวิ่งไปหาใคร ไม่ใช่ persistence
mock.module('../../db/connection.js', {
  defaultExport: { query: async () => [[], []] },
});

// roomMaintenance.js (import โดย socketHandlers.js) import gameSettingsService.js
// ซึ่ง import db/connection.js อีกทีแบบ transitive — ต้อง mock ตรงจุดนี้ด้วย
mock.module('../services/gameSettingsService.js', {
  namedExports: {
    getSetting: (key, fallback) => fallback,
    refreshSettings: async () => {},
  },
});

const { registerSocketHandlers } = await import('./socketHandlers.js');
const { canJoinRoom, getRoomPlayerLimit } = await import('../game/roomCapacity.js');
const { PLAYER_LIMITS } = await import('../game/constants.js');
const { createRoom, addPlayerToRoom, updatePlayer, updateRoom, getRoom, deleteRoom } =
  await import('../game/gameStore.js');

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

// ── ห้องแชทของคนตาย ─────────────────────────────────────────────────────────
// ห้องที่มีคนเป็น 1 (alive) และคนตาย 2 (ghost-a, ghost-b)
function seedRoomWithGhosts(roomId) {
  createRoom({ id: roomId, name: roomId, hostId: 'alive', maxPlayers: 8 });

  for (const id of ['alive', 'ghost-a', 'ghost-b']) {
    addPlayerToRoom(roomId, { id, nickname: id, socketId: `sock-${id}` });
    updatePlayer(roomId, id, { role: 'villager' });
  }
  updatePlayer(roomId, 'ghost-a', { isAlive: false });
  updatePlayer(roomId, 'ghost-b', { isAlive: false });

  updateRoom(roomId, { status: 'in_progress', phase: 'day', round: 2 });
}

// io ปลอม — แยกให้เห็นชัดว่าอันไหน broadcast ทั้งห้อง อันไหนส่งเข้า socket ใครคนเดียว
function makeIo() {
  const roomBroadcasts = [];
  const privateEmits   = [];
  const sockets = new Map();

  for (const id of ['alive', 'ghost-a', 'ghost-b']) {
    sockets.set(`sock-${id}`, {
      emit: (event, data) => privateEmits.push({ socketId: `sock-${id}`, event, data }),
    });
  }

  return {
    roomBroadcasts,
    privateEmits,
    io: {
      to: () => ({ emit: (event, data) => roomBroadcasts.push({ event, data }) }),
      sockets: { sockets },
    },
  };
}

// socket ของผู้เล่นคนหนึ่ง — เก็บ handler ที่ registerSocketHandlers ผูกไว้ ให้เรียกได้เอง
function makeSocket(roomId, playerId) {
  const handlers = {};
  const emits = [];

  return {
    handlers,
    emits,
    socket: {
      id: `sock-${playerId}`,
      data: { roomId, playerId, nickname: playerId },
      on:   (event, fn) => { handlers[event] = fn; },
      emit: (event, data) => emits.push({ event, data }),
      join:  () => {},
      leave: () => {},
      use:   () => {}, // socketHandlers.js ผูก rate-limit middleware ผ่าน socket.use()
    },
  };
}

test('dead chat reaches only the dead — living players never see it', async t => {
  const roomId = 'room-dead-chat';
  seedRoomWithGhosts(roomId);
  t.after(() => deleteRoom(roomId));

  const { io, roomBroadcasts, privateEmits } = makeIo();
  const ghost = makeSocket(roomId, 'ghost-a');
  registerSocketHandlers(ghost.socket, io);

  await ghost.handlers['chat:send']({ content: 'ใครฆ่าฉัน', channel: 'dead' });

  assert.equal(roomBroadcasts.length, 0, 'ห้ามใช้ broadcast ทั้งห้อง คนเป็นจะเห็นด้วย');

  const delivered = privateEmits.filter(e => e.event === 'chat:message');
  assert.deepEqual(
    delivered.map(e => e.socketId).sort(),
    ['sock-ghost-a', 'sock-ghost-b'],
    'ส่งถึงคนตายทุกคนรวมทั้งคนพูดเอง และต้องไม่ถึง sock-alive'
  );
  assert.equal(delivered[0].data.content, 'ใครฆ่าฉัน');
});

test('the living cannot post into the dead channel, and the dead cannot post to the village', async t => {
  const roomId = 'room-dead-chat-guard';
  seedRoomWithGhosts(roomId);
  t.after(() => deleteRoom(roomId));

  const { io, roomBroadcasts, privateEmits } = makeIo();

  const alive = makeSocket(roomId, 'alive');
  registerSocketHandlers(alive.socket, io);
  await alive.handlers['chat:send']({ content: 'ขอเข้าห้องผีหน่อย', channel: 'dead' });

  const ghost = makeSocket(roomId, 'ghost-a');
  registerSocketHandlers(ghost.socket, io);
  await ghost.handlers['chat:send']({ content: 'p2 คือหมาป่า!', channel: 'village' });

  assert.equal(roomBroadcasts.length, 0);
  assert.equal(privateEmits.filter(e => e.event === 'chat:message').length, 0);
  assert.equal(alive.emits.filter(e => e.event === 'error').length, 1);
  assert.equal(ghost.emits.filter(e => e.event === 'error').length, 1);
});

test('profanity is censored before the message is broadcast', async t => {
  const roomId = 'room-chat-profanity';
  seedRoomWithGhosts(roomId);
  t.after(() => deleteRoom(roomId));

  const { io, roomBroadcasts } = makeIo();
  const alive = makeSocket(roomId, 'alive');
  registerSocketHandlers(alive.socket, io);

  await alive.handlers['chat:send']({ content: 'you fucking wolf', channel: 'village' });

  const [msg] = roomBroadcasts.filter(e => e.event === 'chat:message');
  assert.ok(!/fucking/i.test(msg.data.content));
  assert.ok(msg.data.content.includes('wolf'));
  assert.equal(alive.emits.filter(e => e.event === 'chat:censored').length, 1);
});

test('whispers use the target player socket and reject unknown channels', async t => {
  const roomId = 'room-chat-whisper';
  createRoom({ id: roomId, name: roomId, hostId: 'alive', maxPlayers: 8, gameMode: 'chaos' });
  addPlayerToRoom(roomId, { id: 'alive', nickname: 'alive', socketId: 'sock-alive' });
  addPlayerToRoom(roomId, { id: 'ghost-a', nickname: 'ghost-a', socketId: 'sock-ghost-a' });
  updatePlayer(roomId, 'alive', { role: 'villager' });
  updatePlayer(roomId, 'ghost-a', { role: 'villager' });
  updateRoom(roomId, {
    status: 'in_progress',
    phase: 'day',
    fortuneCards: new Map([['alive', { id: 'whisper', type: 'good' }]]),
  });
  t.after(() => deleteRoom(roomId));

  const privateEmits = [];
  const sockets = new Map([
    ['sock-alive', { emit: (event, data) => privateEmits.push({ socketId: 'sock-alive', event, data }) }],
    ['sock-ghost-a', { emit: (event, data) => privateEmits.push({ socketId: 'sock-ghost-a', event, data }) }],
  ]);
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: { sockets },
  };
  const alive = makeSocket(roomId, 'alive');
  registerSocketHandlers(alive.socket, io);

  await alive.handlers['chat:send']({
    content: 'secret',
    channel: 'village',
    options: { isWhisper: true },
    targetPlayerId: 'ghost-a',
  });
  await alive.handlers['chat:send']({ content: 'spoof', channel: 'unknown' });

  assert.ok(privateEmits.some(event => event.socketId === 'sock-ghost-a' && event.data.content === 'secret'));
  assert.ok(alive.emits.some(event => event.event === 'chat:message' && event.data.content === 'secret'));
  assert.equal(alive.emits.filter(event => event.event === 'error').length, 1);
});

test('admin actions require an authenticated admin session', async t => {
  const roomId = 'room-admin-auth';
  createRoom({ id: roomId, name: roomId, hostId: 'alive', maxPlayers: 8 });
  addPlayerToRoom(roomId, { id: 'alive', nickname: 'alive', socketId: 'sock-alive' });
  t.after(() => deleteRoom(roomId));

  const { io } = makeIo();
  const socket = makeSocket(roomId, 'alive');
  socket.socket.request = { session: { userId: 'not-an-admin' } };
  registerSocketHandlers(socket.socket, io);

  await socket.handlers['admin:action']({ type: 'get_state' });

  assert.equal(socket.emits.at(-1).event, 'error');
  assert.match(socket.emits.at(-1).data.message, /ผู้ดูแลระบบ/);
});

test('rejoining an active room resumes the same player and private game state', async t => {
  const roomId = 'room-reconnect';
  createRoom({ id: roomId, name: roomId, hostId: 'alive', maxPlayers: 8, gameMode: 'chaos' });
  addPlayerToRoom(roomId, { id: 'alive', nickname: 'alive', socketId: 'old-socket' });
  updatePlayer(roomId, 'alive', { role: 'seer', isConnected: false, socketId: null });
  updateRoom(roomId, {
    status: 'in_progress',
    phase: 'day',
    round: 2,
    phaseEndsAt: Date.now() + 45_000,
    fortuneCards: new Map([['alive', { id: 'lucky', type: 'good' }]]),
    fortuneInventory: new Map([['alive', { current: { id: 'lucky', type: 'good' }, history: [] }]]),
  });
  t.after(() => deleteRoom(roomId));

  const reconnect = makeSocket(roomId, 'alive');
  reconnect.socket.id = 'new-socket';
  const sockets = new Map([['new-socket', { emit: () => {} }]]);
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: { sockets },
  };
  registerSocketHandlers(reconnect.socket, io);

  await reconnect.handlers['room:join']({
    roomId,
    playerId: 'alive',
    nickname: 'alive',
    avatarUrl: null,
  });

  const roomState = reconnect.emits.find(event => event.event === 'room:state');
  const resumed = reconnect.emits.find(event => event.event === 'game:resumed');
  assert.ok(roomState);
  assert.ok(resumed);
  assert.equal(roomState.data.players.length, 1);
  assert.equal(resumed.data.myRole, 'seer');
  assert.equal(resumed.data.phase, 'day');
  assert.equal(resumed.data.round, 2);
  assert.equal(resumed.data.myFortuneCard.id, 'lucky');
  assert.equal(resumed.data.fortuneInventory.current.id, 'lucky');
  assert.equal(getRoom(roomId).players.size, 1);
  assert.equal(getRoom(roomId).players.get('alive').isConnected, true);
  assert.equal(getRoom(roomId).players.get('alive').socketId, 'new-socket');
});

test('rejoining after game end restores the result and the player role', async t => {
  const roomId = 'room-reconnect-finished';
  createRoom({ id: roomId, name: roomId, hostId: 'alive', maxPlayers: 8 });
  addPlayerToRoom(roomId, { id: 'alive', nickname: 'alive', socketId: null });
  updatePlayer(roomId, 'alive', { role: 'villager', isConnected: false, socketId: null });
  updateRoom(roomId, {
    status: 'finished',
    phase: 'ended',
    lastGameResult: {
      winner: 'village',
      message: 'Village wins',
      reveal: [{ id: 'alive', nickname: 'alive', role: 'villager', isAlive: true }],
      highlights: [],
    },
  });
  t.after(() => deleteRoom(roomId));

  const reconnect = makeSocket(roomId, 'alive');
  reconnect.socket.id = 'finished-socket';
  const io = {
    to: () => ({ emit: () => {} }),
    sockets: { sockets: new Map([['finished-socket', { emit: () => {} }]]) },
  };
  registerSocketHandlers(reconnect.socket, io);

  await reconnect.handlers['room:join']({ roomId, playerId: 'alive', nickname: 'alive' });

  const ended = reconnect.emits.find(event => event.event === 'game:ended');
  assert.equal(ended.data.winner, 'village');
  assert.equal(ended.data.myRole, 'villager');
  assert.equal(ended.data.reveal[0].role, 'villager');
});

test('a stale socket disconnect cannot take a reconnected player offline', async t => {
  const roomId = 'room-stale-disconnect';
  createRoom({ id: roomId, name: roomId, hostId: 'alive', maxPlayers: 8 });
  addPlayerToRoom(roomId, { id: 'alive', nickname: 'alive', socketId: 'new-socket' });
  updateRoom(roomId, { status: 'in_progress', phase: 'day' });
  t.after(() => deleteRoom(roomId));

  const stale = makeSocket(roomId, 'alive');
  stale.socket.id = 'old-socket';
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets: new Map() } };
  registerSocketHandlers(stale.socket, io);

  await stale.handlers.disconnect();

  assert.equal(getRoom(roomId).players.get('alive').isConnected, true);
  assert.equal(getRoom(roomId).players.get('alive').socketId, 'new-socket');
});

test('werewolf night target updates are delivered only to werewolves', async t => {
  const roomId = 'room-private-night-action';
  createRoom({ id: roomId, name: roomId, hostId: 'wolf', maxPlayers: 8 });
  for (const [id, role] of [['wolf', 'werewolf'], ['wolf-two', 'werewolf'], ['seer', 'seer'], ['villager', 'villager']]) {
    addPlayerToRoom(roomId, { id, nickname: id, socketId: `sock-${id}` });
    updatePlayer(roomId, id, { role });
  }
  updateRoom(roomId, { status: 'in_progress', phase: 'night' });
  t.after(() => deleteRoom(roomId));

  const delivered = [];
  const sockets = new Map();
  for (const id of ['wolf', 'wolf-two', 'seer', 'villager']) {
    sockets.set(`sock-${id}`, { emit: (event, data) => delivered.push({ id, event, data }) });
  }
  const io = { to: () => ({ emit: () => {} }), sockets: { sockets } };
  const wolf = makeSocket(roomId, 'wolf');
  registerSocketHandlers(wolf.socket, io);

  await wolf.handlers['night:action']({ targetId: 'villager' });

  assert.deepEqual(
    delivered.filter(event => event.event === 'night:action:update').map(event => event.id).sort(),
    ['wolf', 'wolf-two']
  );
  assert.equal(delivered.some(event => event.id === 'seer' || event.id === 'villager'), false);
});