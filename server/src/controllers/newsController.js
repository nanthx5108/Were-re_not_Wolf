import pool from '../../db/connection.js';

/**
 * ดึงข่าวสารทั้งหมดสำหรับแสดงผลสาธารณะ
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export async function getPublicNews(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const tag = req.query.tag || ''; // Optional tag filter
  const offset = (page - 1) * limit;

  try {
    let countQuery = 'SELECT COUNT(*) as total FROM news';
    let dataQuery = 'SELECT id, title, content, content AS desc, tag, author_username, created_at, created_at AS date FROM news';
    const params = [];

    if (tag) {
      countQuery += ' WHERE tag = ?';
      dataQuery += ' WHERE tag = ?';
      params.push(tag);
    }

    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [[{ total }]] = await pool.query(countQuery, params.slice(0, -2)); // Count query doesn't need limit/offset
    const [news] = await pool.query(dataQuery, params);

    res.json({ news, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('[News] Error fetching public news:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข่าวสารได้' });
  }
}