import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRoomConfig,
  validateConfigForPlayerCount,
  buildDefaultRoleConfig,
  DEFAULT_PHASE_DURATIONS,
} from './roomConfig.js';
import { buildRoleList } from './Roledistributor.js';

test('missing config falls back to the preset for that room size', () => {
  const { config, error } = normalizeRoomConfig(undefined, 6);

  assert.equal(error, undefined);
  assert.deepEqual(config.roleConfig, buildDefaultRoleConfig(6));
  assert.deepEqual(config.phaseDurations, DEFAULT_PHASE_DURATIONS);
});

test('partial config keeps defaults for the fields the host left out', () => {
  const { config } = normalizeRoomConfig(
    { roleConfig: { werewolf: 2 }, phaseDurations: { night: 45 } },
    8
  );

  assert.equal(config.roleConfig.werewolf, 2);
  assert.equal(config.roleConfig.seer, buildDefaultRoleConfig(8).seer);
  assert.equal(config.phaseDurations.night, 45);
  assert.equal(config.phaseDurations.day, DEFAULT_PHASE_DURATIONS.day);
});

test('rejects a room with no werewolf', () => {
  const { error } = normalizeRoomConfig({ roleConfig: { werewolf: 0 } }, 6);
  assert.match(error, /at least one werewolf/i);
});

test('rejects special roles that outnumber the room', () => {
  const { error } = normalizeRoomConfig(
    { roleConfig: { werewolf: 2, seer: 2, bodyguard: 2, fool: 2 } },
    6
  );
  assert.match(error, /exceed the room size/i);
});

test('rejects a wolf count that would win the game instantly', () => {
  // 4 คน: หมาป่า 2 → ชาวบ้าน 2 → wolves >= villagers → ชนะทันที
  const { error } = normalizeRoomConfig(
    { roleConfig: { werewolf: 2, seer: 0, bodyguard: 0, fool: 0 } },
    4
  );
  assert.match(error, /หมาป่าชนะทันที/);
});

test('fool is neutral and does not count as a villager for balance', () => {
  // 4 คน: หมาป่า 1, fool 1, ที่เหลือชาวบ้าน 2 → 1 < 2 ผ่าน
  const ok = normalizeRoomConfig({ roleConfig: { werewolf: 1, seer: 0, bodyguard: 0, fool: 1 } }, 4);
  assert.equal(ok.error, undefined);

  // 4 คน: หมาป่า 1, fool 2 → ชาวบ้านเหลือ 1 → 1 >= 1 หมาป่าชนะทันที
  const bad = normalizeRoomConfig({ roleConfig: { werewolf: 1, seer: 0, bodyguard: 0, fool: 2 } }, 4);
  assert.match(bad.error, /หมาป่าชนะทันที/);
});

test('rejects unknown roles and unknown phases', () => {
  assert.match(normalizeRoomConfig({ roleConfig: { silencer: 1 } }, 6).error, /Unknown configurable role/);
  assert.match(normalizeRoomConfig({ phaseDurations: { results: 10 } }, 6).error, /Unknown phase duration/);
});

test('rejects durations outside the allowed range', () => {
  assert.match(normalizeRoomConfig({ phaseDurations: { night: 5 } }, 6).error, /between 15 and 180/);
  assert.match(normalizeRoomConfig({ phaseDurations: { day: 9999 } }, 6).error, /between 30 and 600/);
});

test('blocks starting when configured roles need more players than actually joined', () => {
  // ตั้งไว้สำหรับห้อง 8 คน แต่เข้าจริงแค่ 4
  const roleConfig = { werewolf: 2, seer: 1, bodyguard: 1, fool: 1 };

  assert.equal(validateConfigForPlayerCount(roleConfig, 8), null);
  assert.match(validateConfigForPlayerCount(roleConfig, 4), /มีผู้เล่นแค่ 4 คน/);
});

test('buildRoleList fills the remaining seats with villagers', () => {
  const roles = buildRoleList({ werewolf: 2, seer: 1, bodyguard: 1, fool: 1 }, 8);

  assert.equal(roles.length, 8);
  assert.equal(roles.filter(r => r === 'werewolf').length, 2);
  assert.equal(roles.filter(r => r === 'villager').length, 3);
});
