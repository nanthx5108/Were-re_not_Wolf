import { getRoom, updateRoom, getPlayersArray } from './gameStore.js';
import { getSetting } from '../services/gameSettingsService.js';

export const DEFAULT_EVENT_ID = 'quiet_morning';

export const NO_EVENT = Object.freeze({
  id: 'quiet_morning',
  icon: '—',
  title: 'เช้าที่เงียบสงบ',
  effect: 'ไม่มีเหตุการณ์เกิดขึ้นเลย เกมดำเนินไปตามปกติ',
  baseWeight: 20,
  card_image: null,
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
    card_image: '/events/blackout.png',
  },
  {
    id: 'fog',
    icon: '🌫️',
    title: 'หมอกลงจัด',
    narrator: 'หมอกทะเลหนาจนมองไม่เห็นปลายจมูกตัวเอง... ตาทิพย์แค่ไหน คืนนี้ก็เห็นแค่เงาราง ๆ',
    effect: 'คืนนี้ผู้หยั่งรู้ (Seer) ตรวจใครก็ไม่ได้คำตอบ ผลจะขึ้นว่า "มองไม่ชัด"',
    baseWeight: 5,
    cooldownDays: 2,
    nightEffect: 'fog',
    card_image: '/events/fog.png',
  },
  {
    id: 'boat_return',
    icon: '🛡️',
    title: 'คืนที่ปลอดภัย',
    narrator: 'คืนนี้ทุกบ้านปิดประตูแน่นหนากว่าเคย... ผู้พิทักษ์เลยมีแรงพอจะเฝ้าได้ถึงสองหลัง',
    effect: 'คืนนี้ผู้พิทักษ์ (Bodyguard) เลือกป้องกันได้ 2 คน แทนที่จะเป็นคนเดียว',
    baseWeight: 30,
    cooldownDays: 2,
    requires: (ctx) => ctx.lastNight.prevented,
    nightEffect: 'double_guard',
    card_image: '/events/boat_return.png',
  },
  {
    id: 'high_tide',
    icon: '⏳',
    title: 'เหมายัน',
    narrator: 'กลางวันสั้นที่สุดของปี พระอาทิตย์ลาไปก่อนใครจะทันพูดจบประโยค',
    effect: 'เวลาพูดคุยของวันนี้เหลือแค่ครึ่งเดียว รีบหาข้อสรุปก่อนถึงเวลาโหวต',
    baseWeight: 10,
    cooldownDays: 2,
    dayTimerMod: (ms) => Math.floor(ms / 2),
    card_image: '/events/high_tide.png',
  },
  {
    id: 'distant_howl',
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
    card_image: '/events/distant_howl.png',
  },
  {
    id: 'circling_crow',
    icon: '🐦‍⬛',
    title: 'ร่องรอยเมื่อคืน',
    narrator: 'อีกาบินวนเหนือหมู่บ้านทั้งคืน มันเห็นทุกอย่าง... แต่บอกได้แค่ตัวเลข',
    effect: 'ทุกคนได้รู้ว่าเมื่อคืนมีการใช้ความสามารถทั้งหมดกี่ครั้ง (แต่ไม่บอกว่าใครใช้)',
    baseWeight: 10,
    weightMultiplier: (ctx) => (ctx.lastNight.skillCount >= 2 ? 2 : 1),
    buildAnnouncement: (ctx) =>
      `เมื่อคืนมีการใช้ความสามารถทั้งหมด ${ctx.lastNight.skillCount} ครั้ง`,
    card_image: '/events/circling_crow.png',
  },
  {
    id: 'full_moon', // A3
    icon: '🌙',
    title: 'จันทร์เต็มดวง',
    narrator: 'จันทร์เต็มดวงลอยเด่นเหนือทะเล ผู้เฒ่าว่าคืนแบบนี้ดวงของทุกคนจะดีกว่าปกติ... หรือแกก็แค่อยากปลอบใจ ใครจะรู้',
    effect: 'วันนี้เป็นวันที่โชคดี — โอกาสได้รับการ์ดโชคดีสูงกว่าปกติ',
    baseWeight: getSetting('morning_event.full_moon.weight', 8),
    luckBias: { goodChance: getSetting('morning_event.full_moon.good_chance', 0.7) },
    card_image: '/events/full_moon.png',
  },
  {
    id: 'bonfire', // A4
    icon: '🔥',
    title: 'คืนนี้ยาวนาน',
    narrator: 'ใครบางคนก่อกองไฟกลางลาน คุยกันได้ยาวขึ้นอีกหน่อย... จะได้กล่าวหากันอย่างทั่วถึง',
    effect: 'เวลาพูดคุยของวันนี้เพิ่มขึ้นอีก 30 วินาที',
    baseWeight: 12,
    dayTimerMod: (ms) => ms + 30_000,
    card_image: '/events/bonfire.png',
  },
];

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

  if (event.id === NO_EVENT.id) return null;

  return {
    event,
    announcement: event.buildAnnouncement ? event.buildAnnouncement(ctx) : null,
    privateNote:  event.buildPrivateNote ? event.buildPrivateNote(ctx) : null,
  };
}

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
