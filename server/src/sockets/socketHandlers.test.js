import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// chat:send เขียนข้อความลง DB — เทสต์ตรงนี้สนใจว่าข้อความวิ่งไปหาใคร ไม่ใช่ persistence
mock.module('../../db/connection.js', {
  exports: { default: { query: async () => [[], []] } },
});

const { registerSocketHandlers } = await import('./socketHandlers.js');
const { canJoinRoom, getRoomPlayerLimit } = await import('../game/roomCapacity.js');
const { PLAYER_LIMITS } = await import('../game/constants.js');
const { createRoom, addPlayerToRoom, updatePlayer, updateRoom, deleteRoom } =
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
