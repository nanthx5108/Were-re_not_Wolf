// ตัวกรองคำหยาบของแชทในเกม — ทำงานฝั่ง server เท่านั้น (client ปลอมได้)
//
// วิธีคิด: ไม่ทิ้งข้อความทั้งก้อน เพราะเกมนี้เล่นด้วยการคุยกัน การตัดทั้งประโยค
// ทำให้ผู้เล่นเสียตาพูดไปฟรี ๆ — เซ็นเซอร์เฉพาะคำแทน คนอื่นยังอ่านใจความได้
// และคนพิมพ์รู้ตัวว่าโดนกรอง
//
// ครอบคลุมภาษาที่คนในห้องใช้จริงก่อน: ไทย + อังกฤษ แล้วเติมคำที่เจอบ่อยจาก
// สเปน/โปรตุเกส/รัสเซีย/ญี่ปุ่น/เกาหลี/จีน — เพิ่มคำใหม่ = เติมในลิสต์ข้างล่างพอ

// ภาษาไทย/ญี่ปุ่น/เกาหลี/จีน ไม่มีช่องว่างคั่นคำ จึงต้องจับแบบ substring
const CJK_THAI_WORDS = [
  // ไทย
  'ควย', 'หี', 'เหี้ย', 'สัส', 'เย็ด', 'แตด', 'ระยำ', 'ชาติชั่ว', 'ไอ้เวร',
  'ดอกทอง', 'กระหรี่', 'อีดอก', 'ตอแหล', 'ส้นตีน', 'หน้าหี', 'เงี่ยน',
  'จัญไร', 'ชิบหาย', 'ฉิบหาย', 'แม่ง', 'พ่อมึง', 'แม่มึง', 'อีเหี้ย', 'ไอ้สัตว์',
  // 日本語
  'くそ', 'クソ', 'しね', '死ね', 'まんこ', 'ちんこ',
  // 한국어
  '씨발', '시발', '개새끼', '병신', '좆',
  // 中文
  '操你妈', '傻逼', '他妈的', '妈的', '肏',
];

// ภาษาที่มีขอบเขตคำชัดเจน — จับด้วย \b เพื่อไม่ให้ "class" โดนเพราะมี "ass"
const WORD_BOUNDED = [
  // English
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bullshit', 'bitch',
  'bastard', 'asshole', 'dickhead', 'cunt', 'whore', 'slut', 'retard',
  'nigger', 'nigga', 'faggot', 'cock', 'pussy', 'wanker', 'twat', 'dumbass',
  // Español / Português
  'puta', 'puto', 'pendejo', 'cabron', 'mierda', 'gilipollas',
  'caralho', 'porra', 'merda', 'foda',
  // Русский (ทั้งแบบเขียนด้วยละตินและซีริลลิก)
  'blyat', 'suka', 'pizdec', 'сука', 'блять', 'блядь', 'пизда', 'хуй', 'ебать',
];

// พิมพ์เลี่ยงด้วยสัญลักษณ์ (f*ck ไม่ได้ แต่ sh1t / b!tch / @ss ได้)
// map นี้ต้องแทนที่แบบ 1 ตัวอักษรต่อ 1 ตัวอักษรเสมอ — ความยาวห้ามเปลี่ยน
// ไม่งั้น index ที่ได้จากข้อความ normalize จะไม่ตรงกับข้อความจริงตอนเซ็นเซอร์
const LEET_MAP = { 4: 'a', '@': 'a', 8: 'b', 3: 'e', 1: 'i', '!': 'i', 0: 'o', 5: 's', $: 's', 7: 't' };

function normalize(text) {
  return text.toLowerCase().replace(/[4@83105!$7]/g, (ch) => LEET_MAP[ch] ?? ch);
}

function escapeRe(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ยืดตัวอักษร (fuuuuck) ยังต้องจับได้ — ให้ทุกตัวอักษรซ้ำได้ ไม่ต้องยุบข้อความ
// (การยุบทำให้ความยาวเปลี่ยน แล้วเซ็นเซอร์จะตัดผิดตำแหน่ง)
function stretchable(word) {
  return [...escapeRe(word)].map((ch) => `${ch}+`).join('');
}

const BOUNDED_SRC = `\\b(?:${WORD_BOUNDED.map(stretchable).join('|')})\\b`;
const SUBSTR_SRC  = `(?:${CJK_THAI_WORDS.map(escapeRe).join('|')})`;

export function containsProfanity(text) {
  if (!text) return false;
  return new RegExp(BOUNDED_SRC, 'i').test(normalize(text))
      || new RegExp(SUBSTR_SRC, 'i').test(text);
}

/**
 * เซ็นเซอร์คำหยาบในข้อความ คืน { clean, censored }
 * แทนที่ด้วย * จำนวนเท่าตัวอักษรเดิม เพื่อให้ประโยคยังคงรูป
 */
export function censorProfanity(text) {
  if (!text) return { clean: text ?? '', censored: false };

  let censored = false;
  const mask = (word) => {
    censored = true;
    return '*'.repeat([...word].length);
  };

  // รอบแรก: คำที่จับแบบ substring — normalize ไม่แตะอักษรพวกนี้ จึงหาจากข้อความจริงได้เลย
  let clean = text.replace(new RegExp(SUBSTR_SRC, 'gi'), mask);

  // รอบสอง: คำที่มีขอบเขตคำ — หาตำแหน่งจากข้อความที่ normalize แล้ว (ความยาวเท่าเดิม)
  // แล้วตัดจากข้อความจริง เพื่อไม่ให้ตัวพิมพ์ใหญ่/leet ที่เหลืออยู่ถูกเขียนทับ
  const norm = normalize(clean);

  // กันเคสหายากที่ toLowerCase เปลี่ยนความยาว (เช่น 'İ') — index จะไม่ตรงกันแล้ว
  // ตกลงมาเซ็นเซอร์ตรง ๆ บนข้อความจริงแทน (จับ leet ไม่ได้ แต่ไม่ตัดผิดตำแหน่ง)
  if (norm.length !== clean.length) {
    return { clean: clean.replace(new RegExp(BOUNDED_SRC, 'gi'), mask), censored };
  }

  let result = '';
  let cursor = 0;
  for (const match of norm.matchAll(new RegExp(BOUNDED_SRC, 'gi'))) {
    result += clean.slice(cursor, match.index) + mask(match[0]);
    cursor = match.index + match[0].length;
  }
  result += clean.slice(cursor);

  return { clean: result, censored };
}
