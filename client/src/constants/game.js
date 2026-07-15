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

// ── เหตุการณ์ประจำเช้า ────────────────────────────────────────────────────────
// weight / effect ต้องตรงกับ server/src/game/morningEvents.js (server เป็นเจ้าของ logic จริง)
// ตารางนี้มีไว้ให้ผู้เล่นอ่านก่อนเล่นเท่านั้น — ทั้งในหน้า Lobby และหน้าต่าง "วิธีการเล่น"
//
// conditional = เกิดได้เฉพาะเมื่อเงื่อนไขครบ จึงไม่นับรวมในการคิดโอกาสของเช้าปกติ
export const MORNING_EVENT_INFO = Object.freeze([
  { icon: '—',  title: 'เช้าที่เงียบสงบ',   weight: 20, effect: 'ไม่มีเหตุการณ์เกิดขึ้นเลย เกมดำเนินไปตามปกติ',
    note: 'ความเงียบก็เป็นข้อมูล — ไม่ใช่ทุกเช้าที่เกาะจะมีอะไรให้ดู' },
  { icon: '🌙', title: 'จันทร์เต็มดวง',     weight: 12, effect: 'ไม่มีผลต่อเกม เป็นแค่บรรยากาศ' },
  { icon: '🔥', title: 'กองไฟกลางหมู่บ้าน', weight: 12, effect: 'เวลาพูดคุยของวันนี้เพิ่มขึ้นอีก 30 วินาที' },
  { icon: '🌊', title: 'น้ำขึ้นสูง',        weight: 10, effect: 'เวลาพูดคุยของวันนี้เหลือแค่ครึ่งเดียว',
    note: 'ไม่ออกซ้ำภายใน 2 วันหลังเพิ่งเกิด' },
  { icon: '🐺', title: 'เสียงหอนแต่ไกล',    weight: 10, effect: 'ทุกคนได้รู้ว่ายังเหลือหมาป่ากี่ตัว (ตัวเลขจริง ไม่หลอก)',
    note: 'โอกาสเพิ่มเป็น 2 เท่า ถ้าเมื่อคืนมีคนตาย' },
  { icon: '🦅', title: 'อีกาบินวน',         weight: 10, effect: 'ทุกคนได้รู้ว่าเมื่อคืนมีการใช้ความสามารถกี่ครั้ง แต่ไม่บอกว่าใครใช้',
    note: 'โอกาสเพิ่มเป็น 2 เท่า ถ้าเมื่อคืนมีการใช้สกิลตั้งแต่ 2 ครั้ง' },
  { icon: '📜', title: 'จดหมายไร้ชื่อ',      weight: 7,  effect: 'สุ่มผู้เล่น 1 คนให้ได้เบาะแสลับว่า "คนนี้ไม่ใช่หมาป่า" — แต่มีโอกาสครึ่งหนึ่งที่เบาะแสนั้นโกหก',
    note: 'ต้องมีผู้เล่นรอดอย่างน้อย 3 คน' },
  { icon: '🌫️', title: 'หมอกลงจัด',        weight: 5,  effect: 'คืนนี้ผู้หยั่งรู้ตรวจใครก็ไม่ได้คำตอบ ผลจะขึ้นว่า "มองไม่ชัด"',
    note: 'ไม่ออกซ้ำภายใน 2 วันหลังเพิ่งเกิด' },
  { icon: '🕯️', title: 'ไฟดับทั้งหมู่บ้าน',  weight: 2,  effect: 'คืนนี้การป้องกันของผู้พิทักษ์ใช้ไม่ได้ผล ใครถูกหมาป่าเลือก คนนั้นตายแน่นอน',
    note: 'ต้องมีผู้เล่นรอดอย่างน้อย 5 คน · ไม่ออกซ้ำภายใน 3 วัน · โอกาสเพิ่ม 3 เท่าถ้าเมื่อคืนไม่มีใครตาย' },
  { icon: '🎣', title: 'เรือกลับเข้าฝั่ง',    weight: 30, conditional: true,
    effect: 'คืนนี้ผู้พิทักษ์เลือกป้องกันได้ 2 คน แทนที่จะเป็นคนเดียว',
    note: 'เกิดได้เฉพาะเมื่อเมื่อคืนผู้พิทักษ์ป้องกันคนที่หมาป่าเล็งไว้ได้สำเร็จ — ถ้าเงื่อนไขครบ โอกาสจะสูงมาก' },
]);

/** โอกาสโดยประมาณของเหตุการณ์นั้นในเช้าปกติ (%) — คิดจาก weight เทียบกับเหตุการณ์ที่เกิดได้เสมอ
 *  ตัวเลขจริงขยับได้ตามตัวคูณ/คูลดาวน์/จำนวนคนรอด จึงเป็นค่าประมาณ ไม่ใช่ค่าตายตัว */
export function morningEventChance(event, list = MORNING_EVENT_INFO) {
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