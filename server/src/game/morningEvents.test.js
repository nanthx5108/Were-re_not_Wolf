import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, addPlayerToRoom, updateRoom, deleteRoom, getRoom } from './gameStore.js';
import {
  MORNING_EVENTS, DEFAULT_EVENT_ID,
  buildEventContext, getEligibleEvents, weightedPick,
  rollMorningEvent, consumeNightEffect, getActiveNightEffect,
} from './morningEvents.js';

function setupRoom(roomId, { players = 6, round = 1, nightResult = {} } = {}) {
  createRoom({ id: roomId, name: 'Test', hostId: 'p1' });
  for (let i = 1; i <= players; i++) {
    addPlayerToRoom(roomId, { id: `p${i}`, nickname: `Player${i}` });
  }
  const room = getRoom(roomId);
  room.players.get('p1').role = 'werewolf';
  for (let i = 2; i <= players; i++) room.players.get(`p${i}`).role = 'villager';
  updateRoom(roomId, { round, nightResult });
  return room;
}

test('boat_return is only eligible when last night protection succeeded', () => {
  const roomId = 'me-boat';
  setupRoom(roomId, { nightResult: { prevented: false } });

  let ctx = buildEventContext(roomId);
  let ids = getEligibleEvents(ctx, []).map(e => e.id);
  assert.ok(!ids.includes('boat_return'));

  updateRoom(roomId, { nightResult: { prevented: true } });
  ctx = buildEventContext(roomId);
  ids = getEligibleEvents(ctx, []).map(e => e.id);
  assert.ok(ids.includes('boat_return'));

  deleteRoom(roomId);
});

test('blackout cannot occur with 4 or fewer players alive', () => {
  const roomId = 'me-blackout-min';
  setupRoom(roomId, { players: 4 });

  const ctx = buildEventContext(roomId);
  const ids = getEligibleEvents(ctx, []).map(e => e.id);
  assert.ok(!ids.includes('blackout'));

  deleteRoom(roomId);
});

test('cooldown blocks an event for the configured number of days', () => {
  const roomId = 'me-cooldown';
  setupRoom(roomId, { round: 4 });
  const ctx = buildEventContext(roomId);

  // fog cooldown = 2: เกิด round 3 → round 4, 5 ห้ามเกิด / round 6 เกิดได้
  const history = [{ id: 'fog', round: 3 }];
  assert.ok(!getEligibleEvents(ctx, history).map(e => e.id).includes('fog'));

  updateRoom(roomId, { round: 6 });
  const ctxLater = buildEventContext(roomId);
  assert.ok(getEligibleEvents(ctxLater, history).map(e => e.id).includes('fog'));

  deleteRoom(roomId);
});

test('weightedPick applies weight multipliers from last-night state', () => {
  const roomId = 'me-weights';
  setupRoom(roomId, { nightResult: { killedId: 'p2' } });
  const ctx = buildEventContext(roomId);

  const howl = MORNING_EVENTS.find(e => e.id === 'distant_howl');
  // ×2 เมื่อคืนก่อนมีคนตาย
  assert.equal(howl.weightMultiplier(ctx), 2);

  // rng = 0 เลือกตัวแรกที่ weight > 0 เสมอ
  const picked = weightedPick([howl], ctx, () => 0);
  assert.equal(picked.id, 'distant_howl');

  deleteRoom(roomId);
});

test('weightedPick returns null when no event is eligible (fallback path)', () => {
  const roomId = 'me-fallback';
  setupRoom(roomId, { players: 4, round: 2 });
  const ctx = buildEventContext(roomId);

  // pool ว่าง → null → rollMorningEvent จะ fallback เป็น full_moon
  assert.equal(weightedPick([], ctx), null);
  assert.ok(MORNING_EVENTS.some(e => e.id === DEFAULT_EVENT_ID));

  deleteRoom(roomId);
});

test('rollMorningEvent records history and sets night effect', () => {
  const roomId = 'me-effect';
  setupRoom(roomId, { nightResult: { prevented: true } });
  // บังคับให้เหลือแค่ boat_return โดยใส่ cooldown ให้ตัวอื่น
  updateRoom(roomId, {
    eventHistory: MORNING_EVENTS
      .filter(e => e.id !== 'boat_return')
      .map(e => ({ id: e.id, round: 1 })),
    round: 2,
  });
  // full_moon / howl / crow / bonfire / letter ไม่มี cooldown — ใช้ rng ไม่ได้
  // จึงทดสอบผ่าน weightedPick ตรง ๆ แทน
  const ctx = buildEventContext(roomId);
  const boat = MORNING_EVENTS.find(e => e.id === 'boat_return');
  assert.equal(weightedPick([boat], ctx, () => 0).id, 'boat_return');

  // และทดสอบ side effect ของ rollMorningEvent
  const morning = rollMorningEvent(roomId);
  const room = getRoom(roomId);
  assert.equal(room.eventHistory.at(-1).id, morning.event.id);
  assert.equal(getActiveNightEffect(roomId), morning.event.nightEffect || null);

  deleteRoom(roomId);
});

test('consumeNightEffect returns the effect once then clears it', () => {
  const roomId = 'me-consume';
  setupRoom(roomId);
  updateRoom(roomId, { activeNightEffect: 'blackout' });

  assert.equal(consumeNightEffect(roomId), 'blackout');
  assert.equal(consumeNightEffect(roomId), null);

  deleteRoom(roomId);
});

test('nameless_letter private note names a subject other than the receiver', () => {
  const roomId = 'me-letter';
  setupRoom(roomId, { players: 5 });
  const ctx = buildEventContext(roomId);
  const letter = MORNING_EVENTS.find(e => e.id === 'nameless_letter');

  for (let i = 0; i < 20; i++) {
    const note = letter.buildPrivateNote(ctx);
    assert.ok(note.playerId);
    assert.match(note.message, /ไม่ใช่หมาป่า/);
    const receiver = ctx.alive.find(p => p.id === note.playerId);
    assert.ok(!note.message.includes(receiver.nickname));
  }

  deleteRoom(roomId);
});
