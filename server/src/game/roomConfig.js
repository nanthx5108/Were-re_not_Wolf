import { PLAYER_LIMITS, getRoleFactionMap, getRoles } from './constants.js';
import { getActiveRoles } from '../services/gameDataService.js';
import { getSetting } from '../services/gameSettingsService.js';

export const CONFIGURABLE_ROLES = Object.freeze(getActiveRoles().filter(r => r.name_en !== getRoles().VILLAGER).map(r => r.name_en));

export const GAME_MODES = Object.freeze({ CLASSIC: 'classic', CHAOS: 'chaos' });
export function isValidGameMode(mode) {
  return mode === GAME_MODES.CLASSIC || mode === GAME_MODES.CHAOS;
}

export const CHAOS_MIN_DURATION = 15;
export const CHAOS_PHASE_DURATIONS = Object.freeze({
  night:  Math.max(CHAOS_MIN_DURATION, getSetting('duration.chaos.night', 25)),
  day:    Math.max(CHAOS_MIN_DURATION, getSetting('duration.chaos.day', 90)),
  voting: Math.max(CHAOS_MIN_DURATION, getSetting('duration.chaos.voting', 25)),
});

export const DEFAULT_PHASE_DURATIONS = Object.freeze({
  night:  getSetting('duration.default.night', 30),
  day:    getSetting('duration.default.day', 60),
  voting: getSetting('duration.default.voting', 30),
});

export const DURATION_LIMITS = Object.freeze({
  night:  { min: 15, max: 180 },
  day:    { min: 30, max: 600 },
  voting: { min: 15, max: 300 },
});

export function buildDefaultRoleConfig(maxPlayers) {
  const config = {};
  const roles = getRoles();
  const activeRoleNames = new Set(getActiveRoles().map(r => r.name_en));

  // Ensure at least one werewolf if active
  if (activeRoleNames.has(roles.WEREWOLF)) {
    config[roles.WEREWOLF] = 1;
  } else {
    config[roles.WEREWOLF] = 1;
  }

  for (const roleName of CONFIGURABLE_ROLES) {
    if (roleName !== roles.WEREWOLF) config[roleName] = 0;
  }

  return config;
}

export function buildDefaultRoomConfig(maxPlayers) {
  return {
    roleConfig:        buildDefaultRoleConfig(maxPlayers),
    phaseDurations:    { ...DEFAULT_PHASE_DURATIONS },
    revealRoleOnDeath: false,
  };
}

export function normalizeRoomConfig(input, maxPlayers) {
  const defaults = buildDefaultRoomConfig(maxPlayers);
  if (input == null) return { config: defaults };
  if (typeof input !== 'object') return { error: 'config must be an object.' };

  const roleConfig = {};
  const rawRoles = input.roleConfig ?? {};
  if (typeof rawRoles !== 'object' || rawRoles === null) {
    return { error: 'config.roleConfig must be an object.' };
  }

  for (const key of Object.keys(rawRoles)) {
    if (!CONFIGURABLE_ROLES.includes(key)) {
      return { error: `Unknown configurable role: ${key}.` };
    }
  }

  for (const role of CONFIGURABLE_ROLES) {
    const raw = rawRoles[role];
    const n = raw === undefined ? defaults.roleConfig[role] : Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > maxPlayers) {
      return { error: `Role count for ${role} must be an integer between 0 and ${maxPlayers}.` };
    }
    roleConfig[role] = n;
  }

  if (roleConfig.werewolf < 1) {
    return { error: 'At least one werewolf is required.' };
  }

  const specialTotal = sumRoles(roleConfig);
  if (specialTotal > maxPlayers) {
    return { error: `Configured roles (${specialTotal}) exceed the room size (${maxPlayers}).` };
  }

  const balanceError = checkFactionBalance(roleConfig, maxPlayers);
  if (balanceError) return { error: balanceError };

  const phaseDurations = {};
  const rawDurations = input.phaseDurations ?? {};
  if (typeof rawDurations !== 'object' || rawDurations === null) {
    return { error: 'config.phaseDurations must be an object.' };
  }

  for (const key of Object.keys(rawDurations)) {
    if (!(key in DURATION_LIMITS)) {
      return { error: `Unknown phase duration: ${key}.` };
    }
  }

  for (const [phase, limits] of Object.entries(DURATION_LIMITS)) {
    const raw = rawDurations[phase];
    const n = raw === undefined ? DEFAULT_PHASE_DURATIONS[phase] : Number(raw);
    if (!Number.isInteger(n) || n < limits.min || n > limits.max) {
      return {
        error: `Duration for ${phase} must be an integer between ${limits.min} and ${limits.max} seconds.`,
      };
    }
    phaseDurations[phase] = n;
  }

  const revealRoleOnDeath = input.revealRoleOnDeath === true;

  return { config: { roleConfig, phaseDurations, revealRoleOnDeath } };
}

export function validateConfigForPlayerCount(roleConfig, playerCount) {
  const specialTotal = sumRoles(roleConfig);
  if (specialTotal > playerCount) {
    return `ตั้งบทบาทพิเศษไว้ ${specialTotal} คน แต่มีผู้เล่นแค่ ${playerCount} คน แก้การตั้งค่าห้องหรือรอคนเพิ่ม`;
  }
  return checkFactionBalance(roleConfig, playerCount);
}

function sumRoles(roleConfig) {
  return CONFIGURABLE_ROLES.reduce((sum, role) => sum + (roleConfig[role] || 0), 0);
}

function checkFactionBalance(roleConfig, playerCount) {
  const ROLE_FACTION = getRoleFactionMap();
  const wolves = roleConfig.werewolf || 0;
  const villagers = CONFIGURABLE_ROLES
    .filter((role) => ROLE_FACTION[role] === 'village')
    .reduce((sum, role) => sum + (roleConfig[role] || 0), 0)
    + fillerVillagerCount(roleConfig, playerCount);

  if (wolves >= villagers) {
    return `หมาป่า ${wolves} ตัว เทียบกับชาวบ้าน ${villagers} คน หมาป่าชนะทันทีที่เริ่มเกม ต้องมีชาวบ้านมากกว่าหมาป่า`;
  }
  return null;
}

function fillerVillagerCount(roleConfig, playerCount) {
  return Math.max(0, playerCount - sumRoles(roleConfig));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildChaosRoleConfig(playerCount) {
  const config = { werewolf: 0, seer: 0, bodyguard: 0, silencer: 0, fool: 0 };

  const maxWolves = Math.max(1, Math.floor(playerCount / 4));
  config.werewolf = randInt(1, maxWolves);

  for (const role of shuffled(['seer', 'bodyguard', 'silencer', 'fool'])) {
    if (Math.random() < 0.6) {
      const trial = { ...config, [role]: 1 };
      if (!validateConfigForPlayerCount(trial, playerCount)) config[role] = 1;
    }
  }

  if (validateConfigForPlayerCount(config, playerCount)) {
    return buildDefaultRoleConfig(playerCount);
  }
  return config;
}
