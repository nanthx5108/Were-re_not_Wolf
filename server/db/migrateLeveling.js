import { levelFromGamesPlayed } from '../../shared/leveling.js';

/**
 * ย้อนคำนวณ level/exp ให้ผู้ใช้เดิมที่มีสถิติ games_played อยู่แล้วแต่ยังไม่มีเลเวล
 * ทำใน JS เพราะ curve เป็น loop — SQL ล้วนคำนวณไม่ได้
 *
 * idempotent: รันซ้ำได้ เพราะแตะเฉพาะแถวที่ level=0 AND exp=0 AND games_played>0
 * (ผู้ใช้ที่ backfill ไปแล้วจะมี exp หรือ level ไม่เป็นศูนย์ จึงถูกข้าม)
 */
export async function migrateLeveling(pool) {
  const [rows] = await pool.query(
    `SELECT id, games_played FROM users
     WHERE games_played > 0 AND level = 0 AND exp = 0`
  );
  if (rows.length === 0) return 0;

  for (const row of rows) {
    const { level, exp } = levelFromGamesPlayed(row.games_played);
    await pool.query('UPDATE users SET level = ?, exp = ? WHERE id = ?', [level, exp, row.id]);
  }

  console.log(`🎚️  backfilled level/exp for ${rows.length} existing user(s)`);
  return rows.length;
}
