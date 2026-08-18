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

export const CONFIGURABLE_ROLES_KEYS = Object.freeze(['werewolf', 'seer', 'bodyguard', 'silencer', 'fool']);

// ข้อมูลแสดงผลของแต่ละ role พิเศษ ใช้ใน RoomConfigPanel (icon/label/hint ต่อแถว)
// faction ผูกตายตัวกับ role พวกนี้อยู่แล้วในเกม (ไม่ใช่ค่าที่ยืดหยุ่นจาก DB) — ใช้ตรงนี้
// เป็น source เดียวแทนการพึ่ง allRoles จากภายนอกที่ไม่มีใครส่งเข้ามาจริง
export const CONFIGURABLE_ROLES = Object.freeze([
  { key: 'werewolf',  icon: '🐺',    label: 'หมาป่า',    hint: 'ฆ่าผู้เล่น 1 คนทุกคืน เห็นทีมกันเอง', faction: 'werewolf' },
  { key: 'seer',      icon: '🔮',    label: 'ผู้หยั่งรู้', hint: 'ตรวจฝ่ายผู้เล่น 1 คนได้ทุกคืน',        faction: 'village' },
  { key: 'bodyguard', icon: '🛡️',    label: 'ผู้พิทักษ์', hint: 'ปกป้อง 1 คนจากการถูกฆ่า ห้ามซ้ำคนเดิม 2 คืนติด', faction: 'village' },
  { key: 'silencer',  icon: '🤐',    label: 'ผู้ปิดปาก',  hint: 'ปิดปากผู้เล่น 1 คนในวันถัดไป',          faction: 'village' },
  { key: 'fool',      icon: '🃏',    label: 'ตัวตลก',    hint: 'ชนะทันทีถ้าถูกโหวตเนรเทศ',              faction: 'neutral' },
]);

export const DURATION_LIMITS = Object.freeze({
  night:  { min: 15, max: 180, label: 'กลางคืน' },
  day:    { min: 30, max: 600, label: 'พูดคุย' },
  voting: { min: 15, max: 300, label: 'โหวต' },
});

export const DEFAULT_PHASE_DURATIONS = Object.freeze({ night: 30, day: 60, voting: 30 });

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

export function validateRoleConfig(roleConfig, playerCount) {
  const wolves = roleConfig.werewolf || 0;
  if (wolves < 1) return 'ต้องมีหมาป่าอย่างน้อย 1 ตัว';

  // faction ผูกตายตัวกับ role อยู่แล้ว (ดู CONFIGURABLE_ROLES ด้านบน) ไม่ต้องพึ่ง allRoles
  // จากภายนอกที่ไม่มีจุดไหนส่งเข้ามาจริง (เดิมพังเพราะเรียก .map บน undefined)
  const getFaction = (roleKey) => CONFIGURABLE_ROLES.find((r) => r.key === roleKey)?.faction;

  const special = CONFIGURABLE_ROLES_KEYS.reduce((sum, rKey) => sum + (roleConfig[rKey] || 0), 0);
  if (special > playerCount) {
    return `ตั้งบทบาทพิเศษไว้ ${special} คน แต่ห้องมีแค่ ${playerCount} ที่นั่ง`;
  }

  const villagers = CONFIGURABLE_ROLES_KEYS
    .filter((roleKey) => getFaction(roleKey) === 'village')
    .reduce((sum, rKey) => sum + (roleConfig[rKey] || 0), 0)
    + fillerVillagerCount(roleConfig, playerCount);

  if (wolves >= villagers) {
    return `หมาป่า ${wolves} ตัว เทียบกับชาวบ้าน ${villagers} คน หมาป่าชนะทันทีที่เริ่มเกม`;
  }
  return null;
}

function fillerVillagerCount(roleConfig, playerCount) {
  const specialTotal = CONFIGURABLE_ROLES_KEYS.reduce((sum, rKey) => sum + (roleConfig[rKey] || 0), 0);
  return Math.max(0, playerCount - specialTotal);
}

export const CARD_BACK = '/roles/back.png';

export function morningEventChance(event, list) {
  if (event.conditional) return null;
  const total = list.filter(e => !e.conditional).reduce((sum, e) => sum + e.weight, 0);
  return Math.round((event.weight / total) * 1000) / 10;
}

export const PHASE_CONFIG = Object.freeze({
  night:   { label: 'Night',   color: 'var(--phase-night)' },
  day:     { label: 'Day',     color: 'var(--phase-day)' },
  voting:  { label: 'Voting',  color: 'var(--phase-voting)' },
  results: { label: 'Results', color: 'var(--phase-results)' },
  lobby:   { label: 'Lobby',   color: 'var(--phase-lobby)' },
});