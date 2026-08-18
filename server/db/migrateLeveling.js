import { levelFromGamesPlayed } from '../../shared/leveling.js';

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
