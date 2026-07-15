import { Router } from 'express';
import pool from '../../db/connection.js';

const router = Router();

/**
 * ทำเนียบนักล่า — top ผู้เล่นเรียงตามเลเวล (เสมอกันดู exp แล้วดูจำนวนเกม)
 * ส่งเฉพาะข้อมูลที่โชว์หน้าแรกได้ ไม่มี email/id หลุดออกไป
 */
router.get('/leaderboard', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT COALESCE(NULLIF(display_name, ''), username) AS name,
              avatar_url AS avatarUrl,
              level, exp, games_played AS gamesPlayed
       FROM users
       ORDER BY level DESC, exp DESC, games_played DESC
       LIMIT 5`
    );
    res.json({ players: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
