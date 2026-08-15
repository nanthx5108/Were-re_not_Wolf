export const PLAYER_LIMITS = Object.freeze({ MIN: 4, MAX: 8 });
export const PHASES = Object.freeze({
  LOBBY:      'lobby',
  NIGHT_ZERO: 'night_zero',
  NIGHT:      'night',
  DAY:        'day',
  VOTING:     'voting',
  RESULTS:    'results',
  ENDED:      'ended',
});

export const PHASE_DURATIONS_SEC = Object.freeze({
  night:   30,
  day:     60,
  voting:  30,
  results: 10,
});

// ── Room config (mirror ของ server/src/game/roomConfig.js) ──────────────────
// ใช้ทำ UI + เตือนล่วงหน้าเท่านั้น — server validate ซ้ำเสมอและเป็นผู้ตัดสินสุดท้าย.
// CONFIGURABLE_ROLES_KEYS คือรายการ key ของบทบาทที่ host สามารถกำหนดจำนวนได้
// ข้อมูลบทบาทเต็ม (label, icon, hint) จะถูกดึงมาจาก GameDataContext
export const CONFIGURABLE_ROLES_KEYS = Object.freeze(['werewolf', 'seer', 'bodyguard', 'silencer', 'fool']);

export const DURATION_LIMITS = Object.freeze({ // These are client-side UI limits, not server-side
  night:  { min: 15, max: 180, label: 'กลางคืน' },
  day:    { min: 30, max: 600, label: 'พูดคุย' },
  voting: { min: 15, max: 300, label: 'โหวต' },
});

export const DEFAULT_PHASE_DURATIONS = Object.freeze({ night: 30, day: 60, voting: 30 });

// ค่าเริ่มต้นของจำนวน role ตามขนาดห้อง — ต้องตรงกับ ROLE_DISTRIBUTION ฝั่ง server
const ROLE_PRESETS = Object.freeze({
  4: { werewolf: 1, seer: 1, bodyguard: 0, silencer: 0, fool: 0 },
  5: { werewolf: 1, seer: 1, bodyguard: 1, silencer: 0, fool: 0 },
  6: { werewolf: 2, seer: 1, bodyguard: 1, silencer: 0, fool: 1 },
  7: { werewolf: 2, seer: 1, bodyguard: 1, silencer: 0, fool: 1 },
  8: { werewolf: 2, seer: 1, bodyguard: 1, silencer: 0, fool: 1 },
});

export function defaultRoleConfig(maxPlayers) {
  return { ...(ROLE_PRESETS[maxPlayers] || ROLE_PRESETS[8]) };
}

/** เตือนล่วงหน้าแบบเดียวกับที่ server จะบล็อก — คืนข้อความ error หรือ null.
 *  ต้องรับ roles (จาก GameDataContext) เพื่อใช้ข้อมูล faction และ configurable roles */
export function validateRoleConfig(roleConfig, playerCount, allRoles) {
  const wolves = roleConfig.werewolf || 0;
  if (wolves < 1) return 'ต้องมีหมาป่าอย่างน้อย 1 ตัว';

  const roleMap = new Map(allRoles.map(r => [r.name_en, r]));
  const getFaction = (roleName) => roleMap.get(roleName)?.faction;

  const special = CONFIGURABLE_ROLES_KEYS.reduce((sum, rKey) => sum + (roleConfig[rKey] || 0), 0);
  if (special > playerCount) {
    return `ตั้งบทบาทพิเศษไว้ ${special} คน แต่ห้องมีแค่ ${playerCount} ที่นั่ง`;
  }

  // Fool เป็นกลาง ไม่นับเป็นชาวบ้าน — ที่นั่งที่เหลือถึงจะเป็น Villager
  const villagers = CONFIGURABLE_ROLES_KEYS
    .filter((roleKey) => getFaction(roleKey) === 'village')
    .reduce((sum, rKey) => sum + (roleConfig[rKey] || 0), 0)
    + fillerVillagerCount(roleConfig, playerCount, allRoles);

  if (wolves >= villagers) {
    return `หมาป่า ${wolves} ตัว เทียบกับชาวบ้าน ${villagers} คน หมาป่าชนะทันทีที่เริ่มเกม`;
  }
  return null;
}

function fillerVillagerCount(roleConfig, playerCount, allRoles) {
  const specialTotal = CONFIGURABLE_ROLES_KEYS.reduce((sum, rKey) => sum + (roleConfig[rKey] || 0), 0);
  return Math.max(0, playerCount - specialTotal);
}

export const CARD_BACK = '/roles/back.png';

/** โอกาสโดยประมาณของเหตุการณ์นั้นในเช้าปกติ (%) — คิดจาก weight เทียบกับเหตุการณ์ที่เกิดได้เสมอ
 *  ตัวเลขจริงขยับได้ตามตัวคูณ/คูลดาวน์/จำนวนคนรอด จึงเป็นค่าประมาณ ไม่ใช่ค่าตายตัว */
export function morningEventChance(event, list) {
  if (event.conditional) return null;
  const total = list.filter(e => !e.conditional).reduce((sum, e) => sum + e.weight, 0);
  return Math.round((event.weight / total) * 1000) / 10;
}

// สีมาจาก design system (global.css) ไม่ใช่ hex ลอย ๆ — เปลี่ยนธีมทีเดียวได้ทั้งระบบ
export const PHASE_CONFIG = Object.freeze({
  night:   { label: 'Night',   color: 'var(--phase-night)' },
  day:     { label: 'Day',     color: 'var(--phase-day)' },
  voting:  { label: 'Voting',  color: 'var(--phase-voting)' },
  results: { label: 'Results', color: 'var(--phase-results)' },
  lobby:   { label: 'Lobby',   color: 'var(--phase-lobby)' },
});