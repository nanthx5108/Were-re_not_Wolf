import { ROLE_DISTRIBUTION, PLAYER_LIMITS, ROLE_FACTION } from './constants.js';

// บทบาทที่ host กำหนดจำนวนเองได้ — ที่เหลือเติมเป็น villager อัตโนมัติ
// เพิ่ม role ใหม่ (เช่น silencer) = เพิ่มชื่อในนี้ + ROLE_FACTION แล้ว validation ตามมาเอง
export const CONFIGURABLE_ROLES = Object.freeze(['werewolf', 'seer', 'bodyguard', 'fool']);

export const DEFAULT_PHASE_DURATIONS = Object.freeze({
  night:  30,
  day:    60,
  voting: 30,
});

// ขอบเขตเวลาแต่ละ phase (วินาที) — กัน host ตั้งจนเกมเล่นไม่ได้
export const DURATION_LIMITS = Object.freeze({
  night:  { min: 15, max: 180 },
  day:    { min: 30, max: 600 },
  voting: { min: 15, max: 300 },
});

// ค่าเริ่มต้นของจำนวน role อิงตารางเดิม เพื่อให้ห้องที่ไม่ตั้ง config ได้สมดุลเท่าของเก่า
export function buildDefaultRoleConfig(maxPlayers) {
  const preset = ROLE_DISTRIBUTION[maxPlayers] || ROLE_DISTRIBUTION[PLAYER_LIMITS.MAX];
  const config = {};
  for (const role of CONFIGURABLE_ROLES) {
    config[role] = preset.filter((r) => r === role).length;
  }
  return config;
}

export function buildDefaultRoomConfig(maxPlayers) {
  return {
    roleConfig:     buildDefaultRoleConfig(maxPlayers),
    phaseDurations: { ...DEFAULT_PHASE_DURATIONS },
  };
}

/**
 * ตรวจและทำให้ config ที่รับมาจาก client อยู่ในรูปที่เชื่อถือได้
 * คืน { config } เมื่อผ่าน หรือ { error } เมื่อไม่ผ่าน — ห้าม throw เพื่อให้ controller ตอบ 400 ได้ตรงๆ
 */
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

  return { config: { roleConfig, phaseDurations } };
}

/**
 * ตรวจ config กับจำนวนผู้เล่นที่มีอยู่จริงตอนกดเริ่มเกม
 * (config ตั้งไว้ตาม maxPlayers แต่คนเข้าจริงอาจน้อยกว่า) — คืน error string หรือ null
 */
export function validateConfigForPlayerCount(roleConfig, playerCount) {
  const specialTotal = sumRoles(roleConfig);
  if (specialTotal > playerCount) {
    return `ตั้งบทบาทพิเศษไว้ ${specialTotal} คน แต่มีผู้เล่นแค่ ${playerCount} คน — แก้การตั้งค่าห้องหรือรอคนเพิ่ม`;
  }
  return checkFactionBalance(roleConfig, playerCount);
}

function sumRoles(roleConfig) {
  return CONFIGURABLE_ROLES.reduce((sum, role) => sum + (roleConfig[role] || 0), 0);
}

// หมาป่าต้องน้อยกว่าฝ่ายชาวบ้าน ไม่งั้นเกมจบทันทีที่เริ่ม (win condition: wolves >= villagers)
function checkFactionBalance(roleConfig, playerCount) {
  const wolves = roleConfig.werewolf || 0;
  const villagers = CONFIGURABLE_ROLES
    .filter((role) => ROLE_FACTION[role] === 'village')
    .reduce((sum, role) => sum + (roleConfig[role] || 0), 0)
    + fillerVillagerCount(roleConfig, playerCount);

  if (wolves >= villagers) {
    return `หมาป่า ${wolves} ตัว เทียบกับชาวบ้าน ${villagers} คน — หมาป่าชนะทันทีที่เริ่มเกม ต้องมีชาวบ้านมากกว่าหมาป่า`;
  }
  return null;
}

function fillerVillagerCount(roleConfig, playerCount) {
  return Math.max(0, playerCount - sumRoles(roleConfig));
}
