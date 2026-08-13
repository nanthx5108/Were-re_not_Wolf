import { getRoom, updateRoom, getPlayersArray } from './gameStore.js';

// fallback ตอนไม่มี event ไหน eligible เลย — ต้องเป็นใบที่ "ไม่มีผลต่อเกม" เสมอ
// (เดิมเป็น full_moon แต่ตอนนี้ full_moon ให้ผลดีกับผู้เล่นแล้ว จะกลายเป็นแจกของฟรี)
export const DEFAULT_EVENT_ID = 'quiet_morning';

// ─── ค่าปรับได้ของ 🌙 จันทร์เต็มดวง ──────────────────────────────────────────
// อัตราโชคดี:โชคร้ายของการ์ดโชค (System 3) เฉพาะรอบที่ใบนี้ออก
// แยกออกมาเป็น config เพื่อให้จูนได้โดยไม่ต้องไปแก้ใน catalog
export const FULL_MOON_CONFIG = Object.freeze({
  goodChance: 0.7, // 70:30 — รอบปกติใช้ค่าตั้งต้นของ System 3 เอง
  weight: 8,       // ลดจาก 12 เพราะเปลี่ยนจากใบเปล่าเป็นใบที่ผู้เล่นได้เปรียบ
});

// ─── Event catalog ───────────────────────────────────────────────────────────
// เพิ่ม event ใหม่ = เพิ่ม object ใหม่ในนี้ ไม่ต้องแก้ logic กลาง
//
// ฟิลด์ของแต่ละ event:
//   id, icon, title, narrator  — ข้อมูลแสดงผล
//   effect                     — ผลต่อเกมเป็นภาษาบ้าน ๆ (narrator เล่าเป็นนิทาน อ่านแล้วเดาผลไม่ออก)
//                                ข้อความนี้ขึ้นกลางจอตอนเช้า และใช้เป็นคำอธิบายในหน้า Lobby ด้วย
//   baseWeight                 — น้ำหนักพื้นฐานในการสุ่ม
//   cooldownDays               — จำนวนวันที่ห้ามเกิดซ้ำหลังเกิดแล้ว
//   minAlive                   — จำนวนผู้เล่นมีชีวิตขั้นต่ำ (optional)
//   requires(ctx)              — เงื่อนไข trigger เพิ่มเติม (optional)
//   weightMultiplier(ctx)      — ตัวคูณน้ำหนักตามสถานะคืนก่อน (optional, default 1)
//   nightEffect                — ผลที่มีต่อคืนถัดไป: 'blackout' | 'fog' | 'double_guard'
//   luckBias                   — ปรับน้ำหนักการสุ่มการ์ดโชค (System 3) เฉพาะรอบนั้น (optional)
//   dayTimerMod(ms)            — ปรับเวลาแชท Day Phase (optional)
//   buildAnnouncement(ctx)     — ข้อความประกาศเพิ่มเติมต่อท้าย narrator (optional)
//   buildPrivateNote(ctx)      — ข้อความส่วนตัวถึงผู้เล่นคนเดียว (optional)
// เช้าที่ไม่มีอะไรเกิดขึ้น — เป็นตัวเลือกหนึ่งในการสุ่มเหมือน event อื่น ๆ
// ต่างกันแค่ตอนถูกเลือกแล้วจะไม่มีป้ายขึ้นกลางจอ (rollMorningEvent คืน null)
// มีไว้เพื่อไม่ให้ผู้เล่นชินว่า "เช้าไหนก็ต้องมีอะไรสักอย่าง" — ความเงียบก็เป็นข้อมูลอย่างหนึ่ง
export const NO_EVENT = Object.freeze({
  id: 'quiet_morning',
  icon: '—',
  title: 'เช้าที่เงียบสงบ',
  effect: 'ไม่มีเหตุการณ์เกิดขึ้นเลย เกมดำเนินไปตามปกติ',
  baseWeight: 20,
});

export const MORNING_EVENTS = [
  NO_EVENT,
  {
    id: 'blackout', // B1
    icon: '🕯️',
    title: 'ไฟดับทั้งหมู่บ้าน',
    narrator: 'โคมไฟทุกดวงดับลงพร้อมกัน... ช่างบังเอิญเหลือเกิน คืนนี้ต่อให้ใครเฝ้าใครอยู่ ก็คงมองไม่เห็นอะไรทั้งนั้น',
    effect: 'คืนนี้การป้องกันของผู้พิทักษ์ใช้ไม่ได้ผล ใครถูกหมาป่าเลือก คนนั้นตายแน่นอน',
    baseWeight: 2,
    cooldownDays: 3,
    minAlive: 5,
    weightMultiplier: (ctx) => (ctx.lastNight.someoneKilled ? 1 : 3),
    nightEffect: 'blackout',
  },
  {
    id: 'fog', // B2
    icon: '🌫️',
    title: 'หมอกลงจัด',
    narrator: 'หมอกทะเลหนาจนมองไม่เห็นปลายจมูกตัวเอง... ตาทิพย์แค่ไหน คืนนี้ก็เห็นแค่เงาราง ๆ',
    effect: 'คืนนี้ผู้หยั่งรู้ (Seer) ตรวจใครก็ไม่ได้คำตอบ ผลจะขึ้นว่า "มองไม่ชัด"',
    baseWeight: 5,
    cooldownDays: 2,
    nightEffect: 'fog',
  },
  {
    id: 'boat_return', // B3
    icon: '🛡️',
    title: 'คืนที่ปลอดภัย',
    narrator: 'คืนนี้ทุกบ้านปิดประตูแน่นหนากว่าเคย... ผู้พิทักษ์เลยมีแรงพอจะเฝ้าได้ถึงสองหลัง',
    effect: 'คืนนี้ผู้พิทักษ์ (Bodyguard) เลือกป้องกันได้ 2 คน แทนที่จะเป็นคนเดียว',
    baseWeight: 30,
    cooldownDays: 2,
    requires: (ctx) => ctx.lastNight.prevented,
    nightEffect: 'double_guard',
  },
  {
    id: 'high_tide', // B4
    icon: '⏳',
    title: 'เหมายัน',
    narrator: 'กลางวันสั้นที่สุดของปี พระอาทิตย์ลาไปก่อนใครจะทันพูดจบประโยค',
    effect: 'เวลาพูดคุยของวันนี้เหลือแค่ครึ่งเดียว รีบหาข้อสรุปก่อนถึงเวลาโหวต',
    baseWeight: 10,
    cooldownDays: 2,
    dayTimerMod: (ms) => Math.floor(ms / 2),
  },
  {
    id: 'distant_howl', // A1
    icon: '🐺',
    title: 'เปิดเผยจำนวน',
    narrator: 'เสียงหอนลอยมาตามลม... นับดูสิว่ากี่ตัว เผื่อจะได้นอนหลับสนิทขึ้น (หรือไม่)',
    effect: 'ทุกคนได้รู้ว่าตอนนี้ยังเหลือหมาป่ากี่ตัว (เป็นตัวเลขจริง ไม่หลอก)',
    baseWeight: 10,
    weightMultiplier: (ctx) => (ctx.lastNight.someoneKilled ? 2 : 1),
    buildAnnouncement: (ctx) => {
      const wolves = ctx.alive.filter((p) => p.role === 'werewolf').length;
      return `ยังมีหมาป่าหลงเหลืออยู่ ${wolves} ตัวในหมู่บ้าน`;
    },
  },
  {
    id: 'circling_crow', // A2
    icon: '🐦‍⬛',
    title: 'ร่องรอยเมื่อคืน',
    narrator: 'อีกาบินวนเหนือหมู่บ้านทั้งคืน มันเห็นทุกอย่าง... แต่บอกได้แค่ตัวเลข',
    effect: 'ทุกคนได้รู้ว่าเมื่อคืนมีการใช้ความสามารถทั้งหมดกี่ครั้ง (แต่ไม่บอกว่าใครใช้)',
    baseWeight: 10,
    weightMultiplier: (ctx) => (ctx.lastNight.skillCount >= 2 ? 2 : 1),
    buildAnnouncement: (ctx) =>
      `เมื่อคืนมีการใช้ความสามารถทั้งหมด ${ctx.lastNight.skillCount} ครั้ง`,
  },
  {
    id: 'full_moon', // A3
    icon: '🌙',
    title: 'จันทร์เต็มดวง',
    narrator: 'จันทร์เต็มดวงลอยเด่นเหนือทะเล ผู้เฒ่าว่าคืนแบบนี้ดวงของทุกคนจะดีกว่าปกติ... หรือแกก็แค่อยากปลอบใจ ใครจะรู้',
    effect: 'วันนี้เป็นวันที่โชคดี — โอกาสได้รับการ์ดโชคดีสูงกว่าปกติ',
    baseWeight: FULL_MOON_CONFIG.weight,
    // System 3 (การ์ดโชค) อ่านค่านี้ผ่าน consumeLuckBias()/getActiveLuckBias()
    // ถ้า System 3 ยังไม่ถูก implement ค่านี้จะถูกตั้งแล้วไม่มีใครอ่าน — ไม่กระทบเกม
    luckBias: { goodChance: FULL_MOON_CONFIG.goodChance },
  },
  {
    id: 'bonfire', // A4
    icon: '🔥',
    title: 'คืนนี้ยาวนาน',
    narrator: 'ใครบางคนก่อกองไฟกลางลาน คุยกันได้ยาวขึ้นอีกหน่อย... จะได้กล่าวหากันอย่างทั่วถึง',
    effect: 'เวลาพูดคุยของวันนี้เพิ่มขึ้นอีก 30 วินาที',
    baseWeight: 12,
    dayTimerMod: (ms) => ms + 30_000,
  },
  // TODO: การ์ดใบที่ 10 — ยังไม่ได้กำหนดชื่อ/effect/ไอคอน (รอสเปคจากเจ้าของโปรเจกต์)
  //       ห้ามเดา effect เอง ใส่เข้ามาในอาร์เรย์นี้ได้เลยเมื่อได้สเปค
  //       กลไก buildPrivateNote (ข้อความลับถึงผู้เล่นคนเดียว) ยังพร้อมใช้อยู่ ดู rollMorningEvent
];

// ─── Selection ───────────────────────────────────────────────────────────────

export function buildEventContext(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const alive = getPlayersArray(roomId).filter((p) => p.isAlive);
  const nightResult = room.nightResult || {};

  return {
    room,
    alive,
    aliveCount: alive.length,
    round: room.round ?? 1,
    lastNight: {
      someoneKilled: Boolean(nightResult.killedId),
      prevented:     Boolean(nightResult.prevented),
      skillCount:    nightResult.skillCount ?? 0,
    },
  };
}

export function getEligibleEvents(ctx, history, events = MORNING_EVENTS) {
  return events.filter((event) => {
    if (event.minAlive && ctx.aliveCount < event.minAlive) return false;
    if (event.requires && !event.requires(ctx)) return false;

    if (event.cooldownDays) {
      const last = [...history].reverse().find((h) => h.id === event.id);
      if (last && ctx.round - last.round <= event.cooldownDays) return false;
    }
    return true;
  });
}

export function weightedPick(events, ctx, rng = Math.random) {
  const weighted = events.map((event) => ({
    event,
    weight: event.baseWeight * (event.weightMultiplier ? event.weightMultiplier(ctx) : 1),
  })).filter((w) => w.weight > 0);

  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  if (total <= 0) return null;

  let roll = rng() * total;
  for (const w of weighted) {
    roll -= w.weight;
    if (roll <= 0) return w.event;
  }
  return weighted[weighted.length - 1].event;
}

// สุ่ม event ประจำเช้าของห้อง บันทึกลง history และตั้ง night effect ของคืนถัดไป
export function rollMorningEvent(roomId, rng = Math.random) {
  const ctx = buildEventContext(roomId);
  if (!ctx) return null;

  const history = ctx.room.eventHistory || [];
  const eligible = getEligibleEvents(ctx, history);

  const event = weightedPick(eligible, ctx, rng)
    || MORNING_EVENTS.find((e) => e.id === DEFAULT_EVENT_ID);

  updateRoom(roomId, {
    eventHistory:      [...history, { id: event.id, round: ctx.round }],
    activeNightEffect: event.nightEffect || null,
    activeLuckBias:    event.luckBias || null,
  });

  // เช้าเงียบ — ยังบันทึกลง history (เพื่อให้ cooldown ของอันอื่นเดินต่อ) แต่ไม่มีอะไรจะประกาศ
  if (event.id === NO_EVENT.id) return null;

  return {
    event,
    announcement: event.buildAnnouncement ? event.buildAnnouncement(ctx) : null,
    privateNote:  event.buildPrivateNote ? event.buildPrivateNote(ctx) : null,
  };
}

// อ่านแล้วล้าง night effect (เรียกตอน resolve คืนนั้น เพื่อให้มีผลแค่คืนเดียว)
export function consumeNightEffect(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  const effect = room.activeNightEffect || null;
  updateRoom(roomId, { activeNightEffect: null });
  return effect;
}

export function getActiveNightEffect(roomId) {
  return getRoom(roomId)?.activeNightEffect || null;
}

// ─── Luck bias (hook สำหรับ System 3 การ์ดโชค) ───────────────────────────────
// จันทร์เต็มดวงตั้งค่านี้ไว้ตอนเช้า → ระบบการ์ดโชคเรียกอ่านตอนแจกการ์ดของรอบนั้น
// ตอนนี้ยังไม่มีใครเรียก (System 3 ยังไม่ถูก implement) — เป็น placeholder ที่พร้อมเสียบ
// มีผลแค่รอบเดียว: consume แล้วหาย ; รอบถัดไป rollMorningEvent เขียนทับเป็น null อยู่แล้ว
export function getActiveLuckBias(roomId) {
  return getRoom(roomId)?.activeLuckBias || null;
}

export function consumeLuckBias(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;
  const bias = room.activeLuckBias || null;
  updateRoom(roomId, { activeLuckBias: null });
  return bias;
}
