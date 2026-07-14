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
    return `หมาป่า ${wolves} ตัว เทียบกับชาวบ้าน ${villagers} คน หมาป่าชนะทันทีที่เริ่มเกม`;
  }
  return null;
}

// ── บทบาท: ข้อมูลเต็มไว้แสดงในการ์ด "บทบาทของเจ้า" กลางเกม ────────────────────
// ผู้เล่นเห็นเฉพาะของตัวเอง — server ส่ง myRole มาให้เจ้าตัวคนเดียวอยู่แล้ว
export const ROLE_INFO = Object.freeze({
  villager:  {
    icon: '🧑‍🌾', label: 'ชาวบ้าน', faction: 'ฝ่ายหมู่บ้าน',
    summary: 'ไม่มีความสามารถพิเศษ อาวุธเดียวคือปากกับหัว',
    detail:  'กลางคืนได้แต่นอน กลางวันคุยและโหวตขับคนที่สงสัยว่าเป็นหมาป่า',
  },
  werewolf:  {
    icon: '🐺', label: 'หมาป่า', faction: 'ฝ่ายหมาป่า',
    summary: 'ทุกคืนหมาป่าร่วมกันเลือกฆ่า 1 คน',
    detail:  'เจ้าเห็นเพื่อนหมาป่าและคุยกันได้ในช่องแชทหมาป่า กลางวันต้องเนียนให้รอด',
  },
  seer:      {
    icon: '🔮', label: 'ผู้หยั่งรู้', faction: 'ฝ่ายหมู่บ้าน',
    summary: 'ทุกคืนตรวจได้ 1 คน รู้แค่ว่าเป็นหมาป่าหรือไม่',
    detail:  'ผลตรวจมาถึงตอนเช้า และรู้แค่ฝ่าย ไม่รู้บทบาท — เปิดตัวเร็วไปอาจโดนฆ่าคืนนั้นเลย',
  },
  bodyguard: {
    icon: '🛡️', label: 'ผู้พิทักษ์', faction: 'ฝ่ายหมู่บ้าน',
    summary: 'ทุกคืนป้องกันได้ 1 คนจากการถูกหมาป่าฆ่า',
    detail:  'ห้ามเฝ้าคนเดิมสองคืนติด และป้องกันตัวเองไม่ได้',
  },
  silencer:  {
    icon: '🤐', label: 'ผู้ปิดปาก', faction: 'ฝ่ายหมู่บ้าน',
    summary: 'ทุกคืนปิดปากได้ 1 คน คนนั้นพิมพ์ไม่ได้ตลอดวันถัดไป',
    detail:  'ไม่มีใครรู้ว่าใครโดน นอกจากคนที่โดนเอง — ใช้ผิดคนคือปิดปากฝ่ายตัวเอง',
  },
  fool:      {
    icon: '🃏', label: 'คนโง่', faction: 'ฝ่ายเป็นกลาง',
    summary: 'ชนะทันทีถ้าถูกชาวบ้านโหวตขับออก',
    detail:  'เป้าหมายคือทำตัวน่าสงสัยให้โดนโหวต — แต่ถ้าถูกหมาป่าฆ่ากลางคืน ถือว่าแพ้',
  },
});

// ── เหตุการณ์ประจำเช้า: ตารางสรุปไว้อธิบายในหน้า Lobby ─────────────────────────
// ข้อความต้องตรงกับฟิลด์ effect ใน server/src/game/morningEvents.js
// (server เป็นเจ้าของ logic — ตารางนี้มีไว้ให้อ่านก่อนเริ่มเกมเท่านั้น)
export const MORNING_EVENT_INFO = Object.freeze([
  { icon: '🌙', title: 'จันทร์เต็มดวง',    effect: 'ไม่มีผลต่อเกม ทุกอย่างดำเนินไปตามปกติ' },
  { icon: '🕯️', title: 'ไฟดับทั้งหมู่บ้าน', effect: 'คืนนี้การป้องกันของผู้พิทักษ์ใช้ไม่ได้ผล ใครถูกหมาป่าเลือก คนนั้นตายแน่นอน' },
  { icon: '🌫️', title: 'หมอกลงจัด',       effect: 'คืนนี้ผู้หยั่งรู้ตรวจใครก็ไม่ได้คำตอบ ผลจะขึ้นว่า "มองไม่ชัด"' },
  { icon: '🎣', title: 'เรือกลับเข้าฝั่ง',  effect: 'คืนนี้ผู้พิทักษ์เลือกป้องกันได้ 2 คน' },
  { icon: '🌊', title: 'น้ำขึ้นสูง',        effect: 'เวลาพูดคุยของวันนี้เหลือแค่ครึ่งเดียว' },
  { icon: '🔥', title: 'กองไฟกลางหมู่บ้าน', effect: 'เวลาพูดคุยของวันนี้เพิ่มขึ้นอีก 30 วินาที' },
  { icon: '🐺', title: 'เสียงหอนแต่ไกล',   effect: 'ทุกคนได้รู้ว่ายังเหลือหมาป่ากี่ตัว' },
  { icon: '🦅', title: 'อีกาบินวน',        effect: 'ทุกคนได้รู้ว่าเมื่อคืนมีการใช้ความสามารถกี่ครั้ง แต่ไม่บอกว่าใครใช้' },
  { icon: '📜', title: 'จดหมายไร้ชื่อ',     effect: 'สุ่มผู้เล่น 1 คนให้ได้เบาะแสลับ ซึ่งมีโอกาสครึ่งหนึ่งที่จะเป็นเรื่องโกหก' },
]);

// สีมาจาก design system (global.css) ไม่ใช่ hex ลอย ๆ — เปลี่ยนธีมทีเดียวได้ทั้งระบบ
export const PHASE_CONFIG = Object.freeze({
  night:   { label: 'Night',   color: 'var(--phase-night)' },
  day:     { label: 'Day',     color: 'var(--phase-day)' },
  voting:  { label: 'Voting',  color: 'var(--phase-voting)' },
  results: { label: 'Results', color: 'var(--phase-results)' },
  lobby:   { label: 'Lobby',   color: 'var(--phase-lobby)' },
});