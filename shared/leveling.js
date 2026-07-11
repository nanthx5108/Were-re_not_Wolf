// แหล่งความจริงเดียวของระบบเลเวล — import ทั้งจาก server (คำนวณจริง) และ client (แสดงผล)
// ถ้าแยกกันเขียนสองที่ ตัวเลขบนแถบกับตัวเลขใน DB จะเพี้ยนไม่ตรงกันแน่นอน

// ผู้เล่นใหม่เริ่มที่ Lv.0 exp 0 (ไม่ใช่ Lv.1)
export const STARTING_LEVEL = 0;

// เล่นจบ 1 เกม = +1 exp
export const EXP_PER_GAME = 1;

/** จำนวนเกมที่ต้องเล่นเพื่อผ่านเลเวลนี้ — Lv.0 ต้อง 5 เกม, Lv.1 ต้อง 7, Lv.10 ต้อง 25 */
export function expNeeded(level) {
  return 5 + Math.max(0, level) * 2;
}

/**
 * บวก exp แล้วเลื่อนเลเวลจนกว่าจะไม่พอ — คืนค่าใหม่ ไม่แก้ของเดิม
 * ใช้ while ไม่ใช่ if เพราะการ backfill อาจกระโดดหลายเลเวลรวดเดียว
 */
export function applyExp(level, exp, gained = EXP_PER_GAME) {
  let nextLevel = Math.max(0, level ?? 0);
  let nextExp   = Math.max(0, exp ?? 0) + gained;

  while (nextExp >= expNeeded(nextLevel)) {
    nextExp -= expNeeded(nextLevel);
    nextLevel += 1;
  }

  return { level: nextLevel, exp: nextExp };
}

/** ย้อนคำนวณเลเวล/exp จากจำนวนเกมที่เคยเล่น — ใช้ตอน migrate ผู้ใช้เดิม */
export function levelFromGamesPlayed(gamesPlayed) {
  return applyExp(STARTING_LEVEL, 0, Math.max(0, gamesPlayed ?? 0) * EXP_PER_GAME);
}

/** สัดส่วนความคืบหน้าของเลเวลปัจจุบัน (0–1) สำหรับวาดแถบ */
export function levelProgress(level, exp) {
  const need = expNeeded(level);
  if (need <= 0) return 0;
  return Math.min(1, Math.max(0, (exp ?? 0) / need));
}
