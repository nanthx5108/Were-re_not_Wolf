import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRoomConfig,
  validateConfigForPlayerCount,
  buildDefaultRoleConfig,
  buildChaosRoleConfig,
  DEFAULT_PHASE_DURATIONS,
} from './roomConfig.js';
import { buildRoleList, distributeRoles } from './Roledistributor.js';

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
  assert.match(normalizeRoomConfig({ roleConfig: { necromancer: 1 } }, 6).error, /Unknown configurable role/);
  assert.match(normalizeRoomConfig({ phaseDurations: { results: 10 } }, 6).error, /Unknown phase duration/);
});

test('silencer is configurable and defaults to zero', () => {
  const { config, error } = normalizeRoomConfig({ roleConfig: { silencer: 1 } }, 6);

  assert.equal(error, undefined);
  assert.equal(config.roleConfig.silencer, 1);
  assert.equal(buildDefaultRoleConfig(6).silencer, 0, 'preset เดิมไม่มี silencer จึงต้องเริ่มที่ 0');
});

test('silencer counts as a villager for the balance check', () => {
  assert.equal(
    normalizeRoomConfig({ roleConfig: { werewolf: 1, seer: 0, bodyguard: 0, silencer: 1, fool: 0 } }, 4).error,
    undefined
  );
});

test('rejects durations outside the allowed range', () => {
  assert.match(normalizeRoomConfig({ phaseDurations: { night: 5 } }, 6).error, /between 15 and 180/);
  assert.match(normalizeRoomConfig({ phaseDurations: { day: 9999 } }, 6).error, /between 30 and 600/);
});

test('blocks starting when configured roles need more players than actually joined', () => {
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

test('force-start role distribution supports a below-minimum room without changing normal validation', () => {
  const players = [{ id: 'p1', nickname: 'Tester' }];
  assert.throws(
    () => distributeRoles(players, { werewolf: 1 }),
    /outside allowed range/
  );

  const assigned = distributeRoles(players, { werewolf: 1 }, { allowBelowMinimum: true });
  assert.deepEqual(assigned.map(player => player.role), ['werewolf']);
});

test('chaos role config always validates and obeys the wolf cap', () => {
  for (let playerCount = 4; playerCount <= 8; playerCount++) {
    const maxWolves = Math.max(1, Math.floor(playerCount / 4));
    for (let i = 0; i < 200; i++) {
      const cfg = buildChaosRoleConfig(playerCount);
      assert.equal(
        validateConfigForPlayerCount(cfg, playerCount),
        null,
        `chaos config ใช้ไม่ได้กับ ${playerCount} คน: ${JSON.stringify(cfg)}`
      );
      assert.ok(cfg.werewolf >= 1, 'ต้องมีหมาป่าอย่างน้อย 1');
      assert.ok(cfg.werewolf <= maxWolves, `หมาป่า ${cfg.werewolf} เกินเพดาน ${maxWolves} ที่ ${playerCount} คน`);
    }
  }
});
