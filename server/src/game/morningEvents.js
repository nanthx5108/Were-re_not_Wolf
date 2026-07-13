import { getRoom, updateRoom, getPlayersArray } from './gameStore.js';

export const DEFAULT_EVENT_ID = 'full_moon';

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
//   dayTimerMod(ms)            — ปรับเวลาแชท Day Phase (optional)
//   buildAnnouncement(ctx)     — ข้อความประกาศเพิ่มเติมต่อท้าย narrator (optional)
//   buildPrivateNote(ctx)      — ข้อความส่วนตัวถึงผู้เล่นคนเดียว (optional)
export const MORNING_EVENTS = [
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
    icon: '🎣',
    title: 'เรือกลับเข้าฝั่ง',
    narrator: 'เรือกลับเข้าฝั่งพร้อมปลาเต็มลำ ชาวบ้านฮึกเหิม... ก็ดีนะ ได้มีแรงสงสัยกันต่อ คืนนี้ผู้พิทักษ์แข็งแรงพอจะเฝ้าได้สองบ้าน',
    effect: 'คืนนี้ผู้พิทักษ์ (Bodyguard) เลือกป้องกันได้ 2 คน แทนที่จะเป็นคนเดียว',
    baseWeight: 30,
    cooldownDays: 2,
    requires: (ctx) => ctx.lastNight.prevented,
    nightEffect: 'double_guard',
  },
  {
    id: 'high_tide', // B4
    icon: '🌊',
    title: 'น้ำขึ้นสูง',
    narrator: 'น้ำทะเลหนุนถึงลานหมู่บ้าน รีบคุยกันหน่อย เดี๋ยวได้ประชุมกันทั้งที่เท้าแช่น้ำ',
    effect: 'เวลาพูดคุยของวันนี้เหลือแค่ครึ่งเดียว รีบหาข้อสรุปก่อนถึงเวลาโหวต',
    baseWeight: 10,
    cooldownDays: 2,
    dayTimerMod: (ms) => Math.floor(ms / 2),
  },
  {
    id: 'distant_howl', // A1
    icon: '🐺',
    title: 'เสียงหอนแต่ไกล',
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
    icon: '🦅',
    title: 'อีกาบินวน',
    narrator: 'อีกาบินวนเหนือหมู่บ้านทั้งคืน มันเห็นทุกอย่าง... แต่บอกได้แค่ตัวเลข',
    effect: 'ทุกคนได้รู้ว่าเมื่อคืนมีการใช้ความสามารถทั้งหมดกี่ครั้ง (แต่ไม่บอกว่าใครใช้)',
    baseWeight: 10,
    weightMultiplier: (ctx) => (ctx.lastNight.skillCount >= 2 ? 2 : 1),
    buildAnnouncement: (ctx) =>
      `เมื่อคืนมีการใช้ความสามารถทั้งหมด ${ctx.lastNight.skillCount} ครั้ง`,
  },
  {
    id: 'full_moon', // A3 — default fallback
    icon: '🌙',
    title: 'จันทร์เต็มดวง',
    narrator: 'จันทร์เต็มดวงลอยเด่นเหนือทะเล ผู้เฒ่าว่าคืนแบบนี้อันตรายกว่าปกติ... หรือแกก็แค่อยากขู่ ใครจะรู้',
    effect: 'ไม่มีผลต่อเกม ทุกอย่างดำเนินไปตามปกติ',
    baseWeight: 12,
  },
  {
    id: 'bonfire', // A4
    icon: '🔥',
    title: 'กองไฟกลางหมู่บ้าน',
    narrator: 'ใครบางคนก่อกองไฟกลางลาน คุยกันได้ยาวขึ้นอีกหน่อย... จะได้กล่าวหากันอย่างทั่วถึง',
    effect: 'เวลาพูดคุยของวันนี้เพิ่มขึ้นอีก 30 วินาที',
    baseWeight: 12,
    dayTimerMod: (ms) => ms + 30_000,
  },
  {
    id: 'nameless_letter', // A5
    icon: '📜',
    title: 'จดหมายไร้ชื่อ',
    narrator: 'มีจดหมายไร้ชื่อเสียบอยู่ที่ประตูบ้านใครบางคน... เชื่อได้แค่ไหนก็อีกเรื่อง',
    effect: 'สุ่มผู้เล่น 1 คนให้ได้เบาะแสลับว่า "คนนี้ไม่ใช่หมาป่า" — แต่มีโอกาสครึ่งหนึ่งที่เบาะแสนั้นโกหก',
    baseWeight: 7,
    minAlive: 3,
    buildPrivateNote: (ctx) => buildLetterNote(ctx),
  },
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
  });

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

// ─── A5 จดหมายไร้ชื่อ ────────────────────────────────────────────────────────
// 50/50 เบาะแสจริง/ลวง — รูปแบบข้อความเหมือนกัน ผู้รับแยกไม่ออก
function buildLetterNote(ctx, rng = Math.random) {
  const alive = ctx.alive;
  if (alive.length < 3) return null;

  const receiver = alive[Math.floor(rng() * alive.length)];
  const candidates = alive.filter((p) => p.id !== receiver.id);

  const truthful = rng() < 0.5;
  const pool = truthful
    ? candidates.filter((p) => p.role !== 'werewolf')
    : candidates;
  if (pool.length === 0) return null;

  const subject = pool[Math.floor(rng() * pool.length)];

  return {
    playerId: receiver.id,
    message: `จดหมายไร้ชื่อกระซิบว่า... "${subject.nickname} ไม่ใช่หมาป่า" จะเชื่อหรือไม่ ก็ตามใจ`,
  };
}
