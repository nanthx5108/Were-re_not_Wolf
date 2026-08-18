const CJK_THAI_WORDS = [
  'ควย', 'หี', 'เหี้ย', 'สัส', 'เย็ด', 'แตด', 'ระยำ', 'ชาติชั่ว', 'ไอ้เวร',
  'ดอกทอง', 'กระหรี่', 'อีดอก', 'ตอแหล', 'ส้นตีน', 'หน้าหี', 'เงี่ยน',
  'จัญไร', 'ชิบหาย', 'ฉิบหาย', 'แม่ง', 'พ่อมึง', 'แม่มึง', 'อีเหี้ย', 'ไอ้สัตว์',
  'くそ', 'クソ', 'しね', '死ね', 'まんこ', 'ちんこ',
  '씨발', '시발', '개새끼', '병신', '좆',
  '操你妈', '傻逼', '他妈的', '妈的', '肏',
];

const WORD_BOUNDED = [
  // English
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bullshit', 'bitch',
  'bastard', 'asshole', 'dickhead', 'cunt', 'whore', 'slut', 'retard',
  'nigger', 'nigga', 'faggot', 'cock', 'pussy', 'wanker', 'twat', 'dumbass',
  // Español / Português
  'puta', 'puto', 'pendejo', 'cabron', 'mierda', 'gilipollas',
  'caralho', 'porra', 'merda', 'foda',
  'blyat', 'suka', 'pizdec', 'сука', 'блять', 'блядь', 'пизда', 'хуй', 'ебать',
];

const LEET_MAP = { 4: 'a', '@': 'a', 8: 'b', 3: 'e', 1: 'i', '!': 'i', 0: 'o', 5: 's', $: 's', 7: 't' };

function normalize(text) {
  return text.toLowerCase().replace(/[4@83105!$7]/g, (ch) => LEET_MAP[ch] ?? ch);
}

function escapeRe(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

export function censorProfanity(text) {
  if (!text) return { clean: text ?? '', censored: false };

  let censored = false;
  const mask = (word) => {
    censored = true;
    return '*'.repeat([...word].length);
  };

  let clean = text.replace(new RegExp(SUBSTR_SRC, 'gi'), mask);

  const norm = normalize(clean);

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
