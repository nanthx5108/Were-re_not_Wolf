export const PLAYER_LIMITS = Object.freeze({ MIN: 4, MAX: 8 });

export const ROLES = Object.freeze({
  VILLAGER:   'villager',
  WEREWOLF:   'werewolf',
  SEER:       'seer',
  BODYGUARD:  'bodyguard',
  SILENCER:   'silencer',
  FOOL:       'fool',
});

export const PHASES = Object.freeze({
  LOBBY:   'lobby',
  NIGHT:   'night',
  DAY:     'day',
  VOTING:  'voting',
  RESULTS: 'results',
  ENDED:   'ended',
});

export const PHASE_DURATIONS_SEC = Object.freeze({
  night:   30,
  day:     60,
  voting:  30,
  results: 10,
});

// ── Room config (mirror ของ server/src/game/roomConfig.js) ──────────────────
// ใช้ทำ UI + เตือนล่วงหน้าเท่านั้น — server validate ซ้ำเสมอและเป็นผู้ตัดสินสุดท้าย
export const CONFIGURABLE_ROLES = Object.freeze([
  { key: 'werewolf',  label: 'Werewolf',  icon: '🐺', hint: 'ร่วมกันฆ่า 1 คนทุกคืน เห็นทีมกันเอง' },
  { key: 'seer',      label: 'Seer',      icon: '🔮', hint: 'ตรวจ 1 คนทุกคืน รู้แค่ฝ่าย' },
  { key: 'bodyguard', label: 'Bodyguard', icon: '🛡️', hint: 'ป้องกัน 1 คนจากการถูกฆ่า ห้ามซ้ำคนเดิม 2 คืนติด' },
  { key: 'silencer',  label: 'Silencer',  icon: '🤐', hint: 'ปิดปาก 1 คน พิมพ์ไม่ได้ตลอดวันถัดไป' },
  { key: 'fool',      label: 'Fool',      icon: '🃏', hint: 'ชนะทันทีถ้าถูกโหวตเนรเทศ' },
]);

export const DURATION_LIMITS = Object.freeze({
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

/** เตือนล่วงหน้าแบบเดียวกับที่ server จะบล็อก — คืนข้อความ error หรือ null */
export function validateRoleConfig(roleConfig, playerCount) {
  const wolves = roleConfig.werewolf || 0;
  if (wolves < 1) return 'ต้องมีหมาป่าอย่างน้อย 1 ตัว';

  const special = CONFIGURABLE_ROLES.reduce((sum, r) => sum + (roleConfig[r.key] || 0), 0);
  if (special > playerCount) {
    return `ตั้งบทบาทพิเศษไว้ ${special} คน แต่ห้องมีแค่ ${playerCount} ที่นั่ง`;
  }

  // Fool เป็นกลาง ไม่นับเป็นชาวบ้าน — ที่นั่งที่เหลือถึงจะเป็น Villager
  const villagers = (roleConfig.seer || 0) + (roleConfig.bodyguard || 0)
    + (roleConfig.silencer || 0) + (playerCount - special);
  if (wolves >= villagers) {
    return `หมาป่า ${wolves} ตัว vs ชาวบ้าน ${villagers} คน — หมาป่าชนะทันทีที่เริ่มเกม`;
  }
  return null;
}

export const PHASE_CONFIG = Object.freeze({
  night:   { label: 'Night',   color: '#c0392b' },
  day:     { label: 'Day',     color: '#e8a027' },
  voting:  { label: 'Voting',  color: '#7c6bbf' },
  results: { label: 'Results', color: '#27ae60' },
  lobby:   { label: 'Lobby',   color: '#8a9ab0' },
});