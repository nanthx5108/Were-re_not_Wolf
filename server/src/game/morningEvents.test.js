import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, addPlayerToRoom, updateRoom, deleteRoom, getRoom } from './gameStore.js';
import {
  MORNING_EVENTS, DEFAULT_EVENT_ID, FULL_MOON_CONFIG,
  buildEventContext, getEligibleEvents, weightedPick,
  rollMorningEvent, consumeNightEffect, getActiveNightEffect,
  getActiveLuckBias, consumeLuckBias,
} from './morningEvents.js';
import { MORNING_EVENT_INFO } from '../../../client/src/constants/game.js';

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

  // pool ว่าง → null → rollMorningEvent จะ fallback เป็นเช้าเงียบ (ใบที่ไม่มีผลต่อเกม)
  assert.equal(weightedPick([], ctx), null);
  const fallback = MORNING_EVENTS.find(e => e.id === DEFAULT_EVENT_ID);
  assert.ok(fallback);
  assert.ok(!fallback.nightEffect && !fallback.luckBias && !fallback.dayTimerMod);

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
  // full_moon / howl / crow / bonfire ไม่มี cooldown — ใช้ rng ไม่ได้
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

// ตารางฝั่ง client เป็นแค่เอกสารให้ผู้เล่นอ่าน แต่ถ้าหลุดจาก catalog จริงเมื่อไหร่
// ผู้เล่นจะอ่านกติกาผิด — ล็อกไว้ด้วย id/icon/title/weight (effect เขียนคนละสำนวนได้)
test('client MORNING_EVENT_INFO stays in sync with the server catalog', () => {
  const serverById = new Map(MORNING_EVENTS.map(e => [e.id, e]));

  assert.equal(MORNING_EVENT_INFO.length, MORNING_EVENTS.length);
  for (const info of MORNING_EVENT_INFO) {
    const event = serverById.get(info.id);
    assert.ok(event, `client มี "${info.title}" (${info.id}) แต่ server ไม่มี`);
    assert.equal(info.icon,   event.icon,       `icon ของ ${info.id} ไม่ตรงกัน`);
    assert.equal(info.title,  event.title,      `title ของ ${info.id} ไม่ตรงกัน`);
    assert.equal(info.weight, event.baseWeight, `weight ของ ${info.id} ไม่ตรงกัน`);
    assert.equal(Boolean(info.conditional), Boolean(event.requires),
      `conditional ของ ${info.id} ไม่ตรงกับการมี requires()`);
  }
});

test('nameless_letter is no longer part of the deck', () => {
  assert.ok(!MORNING_EVENTS.some(e => e.id === 'nameless_letter'));
});

test('full_moon sets a luck bias that is consumed once', () => {
  const roomId = 'me-moon';
  setupRoom(roomId);

  const moon = MORNING_EVENTS.find(e => e.id === 'full_moon');
  assert.equal(moon.luckBias.goodChance, FULL_MOON_CONFIG.goodChance);
  assert.equal(moon.baseWeight, FULL_MOON_CONFIG.weight);
  // ใบนี้ห้ามแตะกลไกคืน — ผลอยู่ที่การสุ่มการ์ดโชคอย่างเดียว
  assert.equal(moon.nightEffect, undefined);

  updateRoom(roomId, { activeLuckBias: moon.luckBias });
  assert.equal(getActiveLuckBias(roomId).goodChance, FULL_MOON_CONFIG.goodChance);
  assert.equal(consumeLuckBias(roomId).goodChance, FULL_MOON_CONFIG.goodChance);
  assert.equal(consumeLuckBias(roomId), null);

  deleteRoom(roomId);
});

test('rollMorningEvent clears luck bias on a round without full_moon', () => {
  const roomId = 'me-moon-clear';
  setupRoom(roomId);
  updateRoom(roomId, { activeLuckBias: { goodChance: 0.7 } });

  // บังคับให้เหลือแค่เช้าเงียบ โดยใส่ cooldown/ไม่เข้าเงื่อนไขให้ตัวอื่นไม่ได้ผล →
  // ใช้ rng = 0 กับ pool ที่มีแค่ NO_EVENT แทน แล้วเช็คผ่าน rollMorningEvent จริง
  const before = getActiveLuckBias(roomId);
  assert.ok(before);

  rollMorningEvent(roomId, () => 0); // ตัวแรกใน pool คือ quiet_morning (ไม่มี luckBias)
  assert.equal(getActiveLuckBias(roomId), null);

  deleteRoom(roomId);
});
