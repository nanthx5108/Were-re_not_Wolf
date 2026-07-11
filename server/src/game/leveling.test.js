import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expNeeded, applyExp, levelFromGamesPlayed, levelProgress, STARTING_LEVEL,
} from '../../../shared/leveling.js';

test('curve grows with level', () => {
  assert.equal(expNeeded(0), 5);
  assert.equal(expNeeded(1), 7);
  assert.equal(expNeeded(10), 25);
});

test('a brand new account starts at level 0 with an empty bar', () => {
  assert.equal(STARTING_LEVEL, 0);
  assert.equal(levelProgress(0, 0), 0);

  const fresh = levelFromGamesPlayed(0);
  assert.deepEqual(fresh, { level: 0, exp: 0 });
});

test('finishing one game adds one exp without levelling', () => {
  assert.deepEqual(applyExp(0, 0), { level: 0, exp: 1 });
  assert.deepEqual(applyExp(0, 3), { level: 0, exp: 4 });
});

test('the 5th game levels a fresh account up and resets the bar', () => {
  assert.deepEqual(applyExp(0, 4), { level: 1, exp: 0 });
});

test('level 1 needs 7 games, not 5', () => {
  assert.deepEqual(applyExp(1, 5), { level: 1, exp: 6 });
  assert.deepEqual(applyExp(1, 6), { level: 2, exp: 0 });
});

test('backfilling replays the whole curve and can jump several levels', () => {
  // 5 เกมแรก → Lv.1, อีก 7 เกม → Lv.2 รวม 12 เกมพอดี
  assert.deepEqual(levelFromGamesPlayed(5),  { level: 1, exp: 0 });
  assert.deepEqual(levelFromGamesPlayed(11), { level: 1, exp: 6 });
  assert.deepEqual(levelFromGamesPlayed(12), { level: 2, exp: 0 });
});

test('backfill agrees with replaying one game at a time', () => {
  let state = { level: STARTING_LEVEL, exp: 0 };
  for (let i = 0; i < 40; i++) state = applyExp(state.level, state.exp);

  assert.deepEqual(state, levelFromGamesPlayed(40));
});

test('progress is a fraction of the current level requirement', () => {
  assert.equal(levelProgress(0, 0), 0);
  assert.equal(levelProgress(0, 4), 4 / 5);
  assert.equal(levelProgress(1, 4), 4 / 7);
});
