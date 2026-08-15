/**
 * System 3: Fortune Cards
 * This system introduces a random "luck" element to each day phase.
 * Each living player draws one card, which can be good or bad.
 * Bad cards follow the "Iron Rule": they must only cause UI/UX disruption
 * and not affect the game's outcome, with one approved exception.
 */

// --- Default configuration ---
const DEFAULT_LUCK_CONFIG = Object.freeze({
  goodChance: 0.5, // 50% chance of getting a good card by default
});

// --- Card Catalogs ---

// Note: Effects with `serverEffect: true` require special handling on the server.
// All other effects are purely client-side (`clientEffect`).

export const GOOD_FORTUNE_CARDS = [
  {
    id: 'talkative',
    type: 'good',
    name: 'ปากมาก',
    description: 'คุณสามารถส่งข้อความได้โดยไม่มีดีเลย์เป็นเวลา 30 วินาที',
    clientEffect: { type: 'CHAT_NO_COOLDOWN', duration: 30000 },
  },
  {
    id: 'like_the_wind',
    type: 'good',
    name: 'พริ้วไหวดั่งสายลม',
    description: 'การโหวตของคุณในรอบนี้จะไม่ระบุชื่อ (คนอื่นจะเห็นเป็น "???")',
    serverEffect: true, // Server needs to mask the vote from this player
    clientEffect: { type: 'ANONYMOUS_VOTE' },
  },
  {
    id: 'observant',
    type: 'good',
    name: 'ขี้สังเกต',
    description: 'คุณจะเห็นว่าใครกำลังพิมพ์อยู่ตลอดเวลา โดยไม่มีดีเลย์',
    clientEffect: { type: 'REALTIME_TYPING_INDICATOR' },
  },
  {
    id: 'opportunist',
    type: 'good',
    name: 'ฉวยโอกาส',
    description: 'คุณสามารถเปลี่ยนโหวตของคุณได้ 1 ครั้งภายใน 5 วินาทีสุดท้าย',
    clientEffect: { type: 'LAST_MINUTE_VOTE_CHANGE' },
  },
  {
    id: 'whisper',
    type: 'good',
    name: 'กระซิบข้างหู',
    description: 'คุณสามารถส่งข้อความส่วนตัวถึงผู้เล่นคนอื่นได้ 1 ครั้งในรอบนี้',
    clientEffect: { type: 'ALLOW_WHISPER', count: 1 },
  },
  {
    id: 'broken_home',
    type: 'good',
    name: 'บ้านแตก',
    description: 'เมื่อจบการโหวต คุณจะเห็นว่าผู้เล่น 2 คนที่ถูกโหวตสูงสุดโหวตให้ใคร',
    serverEffect: true, // Server needs to send this extra info to the player
    clientEffect: { type: 'REVEAL_TOP_VOTES', count: 2 },
  },
  {
    id: 'good_to_know',
    type: 'good',
    name: 'รู้ไว้ไม่เสียหาย',
    description: 'คุณจะรู้ว่าเมื่อคืนมีคนตายหรือไม่ ก่อนที่ทุกคนจะรู้พร้อมกัน',
    serverEffect: true, // Server needs to send this early info
    clientEffect: { type: 'EARLY_DEATH_INFO' },
  },
  {
    id: 'injury_time',
    type: 'good',
    name: 'ต่อเวลาบาดเจ็บ',
    description: 'คุณสามารถกดปุ่มเพื่อขอต่อเวลาในช่วงพูดคุยได้ 20 วินาที (ใช้ได้ครั้งเดียว)',
    clientEffect: { type: 'REQUEST_EXTRA_TIME', duration: 20000 },
  },
  {
    id: 'heavenly_voice',
    type: 'good',
    name: 'เสียงสวรรค์',
    description: 'ข้อความถัดไปของคุณจะถูกเน้นให้โดดเด่นเป็นพิเศษในช่องแชท',
    clientEffect: { type: 'HIGHLIGHT_NEXT_MESSAGE' },
  },
  {
    id: 'magic_eyes',
    type: 'good',
    name: 'ตาวิเศษ',
    description: 'คุณจะเห็นจำนวนโหวตทั้งหมดแบบ real-time ในช่วง 5 วินาทีสุดท้ายของการโหวต',
    serverEffect: true, // Server needs to stream vote counts
    clientEffect: { type: 'REALTIME_VOTE_COUNT' },
  },
];

export const BAD_FORTUNE_CARDS = [
  {
    id: 'deaf',
    type: 'bad',
    name: 'หูหนวก',
    description: 'ข้อความบางส่วนในแชทจะถูกแทนที่ด้วย "...”',
    clientEffect: { type: 'GARBLE_CHAT', chance: 0.3 },
  },
  {
    id: 'blurry_vision',
    type: 'bad',
    name: 'ตาพร่ามัว',
    description: 'หน้าจอของคุณจะเบลอเป็นพักๆ ทำให้มองเห็นได้ไม่ชัดเจน',
    clientEffect: { type: 'UI_BLUR', intensity: 'medium', interval: 20000 },
  },
  {
    id: 'outsider',
    type: 'bad',
    name: 'คนนอก',
    description: 'ชื่อของคุณในช่องแชทจะแสดงเป็นสีที่ดูน่าสงสัยในสายตาคนอื่น',
    clientEffect: { type: 'SUSPICIOUS_NAME_COLOR' },
  },
  {
    id: 'brain_drain',
    type: 'bad',
    name: 'สมองไหล',
    description: 'ช่องพิมพ์แชทของคุณจะพิมพ์กลับหลังเป็นบางครั้ง',
    clientEffect: { type: 'REVERSE_TYPING', chance: 0.25 },
  },
  {
    id: 'confused',
    type: 'bad',
    name: 'สับสนกับตัวเอง',
    description: 'คุณจะพลาดการโหวตในรอบนี้โดยอัตโนมัติ (มีโอกาส 10% ที่จะเกิดซ้ำในรอบถัดไป)',
    serverEffect: true, // The only bad card with a server-side effect
    clientEffect: { type: 'DISABLE_VOTE', message: 'คุณกำลังสับสนกับตัวเอง' },
  },
  {
    id: 'insane',
    type: 'bad',
    name: 'สติไม่ดี',
    description: 'ปุ่มบางปุ่มบนหน้าจอจะสลับตำแหน่งกันไปมา',
    clientEffect: { type: 'SHUFFLE_UI_ELEMENTS', elements: ['vote_button', 'role_card'] },
  },
  {
    id: 'panic',
    type: 'bad',
    name: 'ตื่นตระหนก',
    description: 'หน้าจอของคุณจะสั่นเมื่อมีคนส่งข้อความใหม่เข้ามา',
    clientEffect: { type: 'SCREEN_SHAKE_ON_MESSAGE' },
  },
  {
    id: 'sleepless',
    type: 'bad',
    name: 'นอนน้อย',
    description: 'หน้าจอของคุณจะมืดลงเรื่อยๆ เหมือนคนง่วงนอน',
    clientEffect: { type: 'UI_DARKEN', speed: 'slow' },
  },
  {
    id: 'wobbly_walk',
    type: 'bad',
    name: 'เดินไม่ตรงทาง',
    description: 'การเคลื่อนไหวของเมาส์จะดูสั่นๆ และไม่แม่นยำ',
    clientEffect: { type: 'MOUSE_JITTER', intensity: 'low' },
  },
  {
    id: 'forgot_refuel',
    type: 'bad',
    name: 'ลืมเติมไฟ',
    description: 'แสงสว่างบนหน้าจอของคุณจะริบหรี่เหมือนตะเกียงใกล้หมดน้ำมัน',
    clientEffect: { type: 'UI_FLICKER' },
  },
];

const ALL_CARDS = [...GOOD_FORTUNE_CARDS, ...BAD_FORTUNE_CARDS];
export const FORTUNE_CARD_MAP = new Map(ALL_CARDS.map(c => [c.id, c]));

// --- Drawing Logic ---

/**
 * Draws a random fortune card for a player.
 * @param {object | null} luckBias - Optional bias from morning events, e.g., { goodChance: 0.7 }.
 * @param {function} rng - Random number generator for testing.
 * @returns {object} The drawn card object.
 */
export function drawFortuneCard(luckBias = null, rng = Math.random) {
  const config = luckBias || DEFAULT_LUCK_CONFIG;
  const isGood = rng() < config.goodChance;

  if (isGood) {
    const index = Math.floor(rng() * GOOD_FORTUNE_CARDS.length);
    return GOOD_FORTUNE_CARDS[index];
  } else {
    const index = Math.floor(rng() * BAD_FORTUNE_CARDS.length);
    return BAD_FORTUNE_CARDS[index];
  }
}