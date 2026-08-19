import pool from '../../db/connection.js';
import { getAllRooms, getRoom } from '../game/gameStore.js';
import { teardownRoom } from '../game/roomMaintenance.js';
import { logAdminAction } from '../utils/adminLogger.js';
import { refreshGameData } from '../services/gameDataService.js';
import { refreshSettings } from '../services/gameSettingsService.js';

/**
 * ดึงข้อมูลผู้ใช้ทั้งหมด
 */
export async function getAllUsers(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let dataQuery = `
      SELECT u.id, u.username, u.display_name AS displayName, u.email, u.level, u.exp,
             u.games_played AS gamesPlayed, u.created_at, u.banned_until, a.user_id IS NOT NULL AS isAdmin
      FROM users u
      LEFT JOIN admins a ON u.id = a.user_id`;
    const params = [];
    const countParams = [];

    if (search) {
      const searchQuery = ' WHERE username LIKE ? OR display_name LIKE ? OR email LIKE ?';
      countQuery += searchQuery;
      dataQuery += searchQuery;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [[{ total }]] = await pool.query(countQuery, countParams);
    const [users] = await pool.query(dataQuery, params);

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching all users:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' });
  }
}

/**
 * อัปเดตข้อมูลผู้ใช้
 */
export async function updateUser(req, res) {
  const { id } = req.params;
  const { displayName, email, level, exp, isAdmin } = req.body; // isAdmin is now a separate action

  try {
    const fieldsToUpdate = {};
    if (displayName !== undefined) fieldsToUpdate.display_name = displayName;
    if (email !== undefined) fieldsToUpdate.email = email;
    if (level !== undefined) fieldsToUpdate.level = level;
    if (exp !== undefined) fieldsToUpdate.exp = exp;

    if (Object.keys(fieldsToUpdate).length > 0) {
      await pool.query('UPDATE users SET ? WHERE id = ?', [fieldsToUpdate, id]);
    }

    if (isAdmin !== undefined) {
      if (isAdmin) {
        await pool.query('INSERT IGNORE INTO admins (user_id) VALUES (?)', [id]);
      } else {
        if (id === req.user.id) {
          return res.status(400).json({ error: 'ไม่สามารถยกเลิกสิทธิ์ Admin ของตัวเองได้' });
        }
        await pool.query('DELETE FROM admins WHERE user_id = ?', [id]);
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0 && isAdmin === undefined) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลให้อัปเดต' });
    }

    const [[updatedUser]] = await pool.query('SELECT username, display_name AS displayName FROM users WHERE id = ?', [id]);

    res.json({ message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' });
    logAdminAction(
      req.user.id,
      req.user.username,
      'user_update',
      id,
      updatedUser?.displayName || updatedUser?.username,
      { ...fieldsToUpdate, isAdmin: isAdmin !== undefined ? isAdmin : undefined }
    );

  } catch (error) {
    console.error(`[Admin] Error updating user ${id}:`, error);
    res.status(500).json({ error: 'อัปเดตข้อมูลผู้ใช้ไม่สำเร็จ' });
  }
}

/**
 * แบนหรือยกเลิกการแบนผู้ใช้
 */
export async function banUser(req, res) {
  const { id } = req.params;
  const { action, duration, reason } = req.body; // action: 'ban' or 'unban'

  if (id === String(req.user.id)) {
    return res.status(400).json({ error: 'ไม่สามารถแบนตัวเองได้' });
  }

  try {
    const [[targetUser]] = await pool.query(
      'SELECT u.username, a.user_id IS NOT NULL AS isAdmin FROM users u LEFT JOIN admins a ON u.id = a.user_id WHERE u.id = ?',
      [id]
    );
    if (!targetUser) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    if (targetUser.isAdmin) {
      return res.status(403).json({ error: 'ไม่สามารถแบนผู้ดูแลระบบคนอื่นได้' });
    }

    let banned_until = null;
    let ban_reason = null;

    if (action === 'ban') {
      const now = new Date();
      if (duration === '1d') banned_until = new Date(now.setDate(now.getDate() + 1));
      else if (duration === '7d') banned_until = new Date(now.setDate(now.getDate() + 7));
      else if (duration === 'perm') banned_until = new Date('9999-12-31 23:59:59');
      else return res.status(400).json({ error: 'ระยะเวลาการแบนไม่ถูกต้อง' });
      ban_reason = reason || null;
    }

    await pool.query('UPDATE users SET banned_until = ?, ban_reason = ? WHERE id = ?', [banned_until, ban_reason, id]);

    const message = action === 'unban' ? 'ยกเลิกการแบนผู้ใช้สำเร็จ' : 'แบนผู้ใช้สำเร็จ';
    logAdminAction(
      req.user.id,
      req.user.username,
      action === 'unban' ? 'user_unban' : 'user_ban',
      id,
      targetUser.username,
      { action, duration, reason, banned_until }
    );
    res.json({ message });

  } catch (error) {
    console.error(`[Admin] Error banning user ${id}:`, error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแบนผู้ใช้' });
  }
}

/**
 * ลบผู้ใช้
 */
export async function deleteUser(req, res) {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'ไม่สามารถลบตัวเองได้' });
  }

  try {
    const [[userToDelete]] = await pool.query('SELECT username FROM users WHERE id = ?', [id]);
    if (!userToDelete) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    // In a real-world app, you might want to handle related data (e.g., reassigning content)
    // or perform a soft delete. For now, we'll do a hard delete.
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) { // This case is now handled by the check above
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
    logAdminAction(
      req.user.id,
      req.user.username,
      'user_delete',
      id,
      userToDelete.username
    );
  } catch (error) {
    console.error(`[Admin] Error deleting user ${id}:`, error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'ไม่สามารถลบผู้ใช้ได้เนื่องจากมีข้อมูลอื่นเชื่อมโยงอยู่' });
    }
    res.status(500).json({ error: 'ลบผู้ใช้ไม่สำเร็จ' });
  }
}

/**
 * ดึงข้อมูลห้องทั้งหมดจาก Memory
 */
export async function getAllRoomsAdmin(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    let allRooms = getAllRooms().map(room => ({
      id: room.id,
      name: room.name,
      status: room.status,
      gameMode: room.gameMode,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      createdAt: room.createdAt,
    }));

    if (search) {
      const searchTerm = search.toLowerCase();
      allRooms = allRooms.filter(
        room => room.id.toLowerCase().includes(searchTerm) || room.name.toLowerCase().includes(searchTerm)
      );
    }

    const total = allRooms.length;
    const rooms = allRooms.slice(offset, offset + limit);

    res.json({
      rooms,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin] Error fetching all rooms:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลห้องได้' });
  }
}

/**
 * บังคับปิดห้อง
 */
export async function closeRoom(req, res) {
  const { id } = req.params;
  const room = getRoom(id);

  if (!room) {
    return res.status(404).json({ error: 'ไม่พบห้องในระบบ' });
  }

  try {
    await teardownRoom(id);
    const io = req.app.get('io');
    io.to(id).emit('room:closed', { message: 'ห้องถูกปิดโดยผู้ดูแลระบบ' });
    io.in(id).socketsLeave(id);
    res.json({ message: `ห้อง ${id} ถูกปิดเรียบร้อยแล้ว` });
    logAdminAction(
      req.user.id,
      req.user.username,
      'room_close',
      id,
      room.name
    );
  } catch (error) {
    console.error(`[Admin] Error closing room ${id}:`, error);
    res.status(500).json({ error: 'ปิดห้องไม่สำเร็จ' });
  }
}

/**
 * ดึง Admin Logs
 */
export async function getAdminLogs(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    let countQuery = 'SELECT COUNT(*) as total FROM admin_logs';
    let dataQuery = 'SELECT id, admin_id, admin_username, action_type, target_id, target_name, details, created_at FROM admin_logs';
    const params = [];
    const countParams = [];

    if (search) {
      const searchQuery = ' WHERE admin_username LIKE ? OR action_type LIKE ? OR target_name LIKE ?';
      countQuery += searchQuery;
      dataQuery += searchQuery;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [[{ total }]] = await pool.query(countQuery, countParams);
    const [logs] = await pool.query(dataQuery, params);

    res.json({ logs, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('[Admin] Error fetching admin logs:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูล Admin Logs ได้' });
  }
}

/**
 * ดึงข่าวสารทั้งหมดสำหรับ Admin
 */
export async function getAllNewsAdmin(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    let countQuery = 'SELECT COUNT(*) as total FROM news';
    let dataQuery = 'SELECT id, title, content, tag, author_username, created_at, updated_at FROM news';
    const params = [];
    const countParams = [];

    if (search) {
      const searchQuery = ' WHERE title LIKE ? OR content LIKE ? OR author_username LIKE ?';
      countQuery += searchQuery;
      dataQuery += searchQuery;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [[{ total }]] = await pool.query(countQuery, countParams);
    const [news] = await pool.query(dataQuery, params);

    res.json({ news, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('[Admin] Error fetching all news:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข่าวสารได้' });
  }
}

/**
 * สร้างข่าวสารใหม่
 */
export async function createNews(req, res) {
  const { title, content, tag } = req.body;

  if (!title || !content || !tag) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน: title, content, tag' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO news (title, content, tag, author_id, author_username) VALUES (?, ?, ?, ?, ?)',
      [title, content, tag, req.user.id, req.user.username]
    );
    res.status(201).json({ message: 'สร้างข่าวสารสำเร็จ', newsId: result.insertId });
    // No need to refresh game data for news
    logAdminAction(req.user.id, req.user.username, 'news_create', result.insertId, title, { title, tag });
  } catch (error) {
    console.error('[Admin] Error creating news:', error);
    res.status(500).json({ error: 'สร้างข่าวสารไม่สำเร็จ' });
  }
}

/**
 * อัปเดตข่าวสาร
 */
export async function updateNews(req, res) {
  const { id } = req.params;
  const { title, content, tag } = req.body;

  if (!title || !content || !tag) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน: title, content, tag' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE news SET title = ?, content = ?, tag = ? WHERE id = ?',
      [title, content, tag, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบข่าวสาร' });
    }
    res.json({ message: 'อัปเดตข่าวสารสำเร็จ' });
    // No need to refresh game data for news
    logAdminAction(req.user.id, req.user.username, 'news_update', id, title, { title, tag });
  } catch (error) {
    console.error(`[Admin] Error updating news ${id}:`, error);
    res.status(500).json({ error: 'อัปเดตข่าวสารไม่สำเร็จ' });
  }
}

/**
 * ลบข่าวสาร
 */
export async function deleteNews(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM news WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบข่าวสาร' });
    }
    res.json({ message: 'ลบข่าวสารสำเร็จ' });
    // No need to refresh game data for news
    logAdminAction(req.user.id, req.user.username, 'news_delete', id, `News ID: ${id}`);
  } catch (error) {
    console.error(`[Admin] Error deleting news ${id}:`, error);
    res.status(500).json({ error: 'ลบข่าวสารไม่สำเร็จ' });
  }
}

/**
 * ดึงสถิติโดยรวมของเกม
 */
export async function getGameStats(req, res) {
  try {
    // สถิติจาก DB
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(id) AS totalUsers FROM users');
    const [[{ totalRoomsCreated }]] = await pool.query('SELECT COUNT(id) AS totalRoomsCreated FROM rooms');
    const [[{ totalGamesFinished }]] = await pool.query('SELECT COUNT(id) AS totalGamesFinished FROM rooms WHERE status = "finished"');

    // สถิติจาก Memory (real-time)
    const allRooms = getAllRooms();
    const totalActiveRooms = allRooms.length;
    const totalPlayersInRooms = allRooms.reduce((sum, room) => sum + room.players.size, 0);

    res.json({
      totalUsers,
      totalRoomsCreated,
      totalGamesFinished,
      totalActiveRooms,
      totalPlayersInRooms,
      // สามารถเพิ่มสถิติอื่นๆ ได้ในอนาคต เช่น averagePlayersPerRoom, mostPlayedRole, etc.
    });
  } catch (error) {
    console.error('[Admin] Error fetching game stats:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลสถิติเกมได้' });
  }
}

/**
 * ดึงการตั้งค่าเกมทั้งหมด
 */
export async function getAllGameSettings(req, res) {
  try {
    const [settings] = await pool.query('SELECT setting_key, setting_value, value_type, description FROM game_settings');
    const formattedSettings = settings.map(s => {
      let value = s.setting_value;
      if (s.value_type === 'number') value = Number(value);
      else if (s.value_type === 'boolean') value = value === 'true';
      else if (s.value_type === 'json') {
        try { value = JSON.parse(value); } catch { /* ignore */ }
      }
      return { ...s, setting_value: value };
    });
    res.json({ settings: formattedSettings });
  } catch (error) {
    console.error('[Admin] Error fetching game settings:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงการตั้งค่าเกมได้' });
  }
}

/**
 * อัปเดตการตั้งค่าเกม
 */
export async function updateGameSetting(req, res) {
  const { key } = req.params;
  let { setting_value, value_type } = req.body;

  if (!key || setting_value === undefined || !value_type) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน: key, value, type' });
  }

  // Validate and convert value based on type
  if (value_type === 'number') {
    setting_value = Number(setting_value);
    if (isNaN(setting_value)) return res.status(400).json({ error: 'ค่าต้องเป็นตัวเลข' });
  } else if (value_type === 'boolean') {
    setting_value = String(setting_value) === 'true';
  } else if (value_type === 'json') {
    try {
      JSON.parse(setting_value);
    } catch (e) {
      return res.status(400).json({ error: 'ค่าต้องเป็น JSON ที่ถูกต้อง' });
    }
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO game_settings (setting_key, setting_value, value_type) VALUES (?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), value_type = VALUES(value_type)',
      [key, String(setting_value), value_type]
    );

    res.json({ message: `อัปเดตการตั้งค่า ${key} สำเร็จ` });
    refreshSettings(); // Refresh cached settings
    // No need to refresh game data for settings
    logAdminAction(
      req.user.id,
      req.user.username,
      'game_setting_update',
      key,
      key,
      { new_value: setting_value, value_type }
    );
  } catch (error) {
    console.error(`[Admin] Error updating game setting ${key}:`, error);
    res.status(500).json({ error: 'อัปเดตการตั้งค่าเกมไม่สำเร็จ' });
  }
}

/**
 * ดึงบทบาททั้งหมดสำหรับ Admin
 */
export async function getAllRolesAdmin(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    let countQuery = 'SELECT COUNT(*) as total FROM roles';
    let dataQuery = 'SELECT id, name_en, name_th, description_th, faction, icon, night_action, is_active, created_at, updated_at FROM roles';
    const params = [];
    const countParams = [];

    if (search) {
      const searchQuery = ' WHERE name_en LIKE ? OR name_th LIKE ? OR description_th LIKE ?';
      countQuery += searchQuery;
      dataQuery += searchQuery;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    dataQuery += ' ORDER BY name_en ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [[{ total }]] = await pool.query(countQuery, countParams);
    const [roles] = await pool.query(dataQuery, params);

    res.json({ roles, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('[Admin] Error fetching all roles:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลบทบาทได้' });
  }
}

/**
 * สร้างบทบาทใหม่
 */
export async function createRole(req, res) {
  const { name_en, name_th, description_th, faction, icon, night_action, is_active } = req.body;

  if (!name_en || !name_th || !description_th || !faction || !icon) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลบทบาทให้ครบถ้วน' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO roles (name_en, name_th, description_th, faction, icon, night_action, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name_en, name_th, description_th, faction, icon, night_action, is_active]
    );
    res.status(201).json({ message: 'สร้างบทบาทสำเร็จ', roleId: result.insertId });
    refreshGameData(); // Refresh cached roles
    logAdminAction(req.user.id, req.user.username, 'role_create', result.insertId, name_en, { name_en, faction });
  } catch (error) {
    console.error('[Admin] Error creating role:', error);
    res.status(500).json({ error: 'สร้างบทบาทไม่สำเร็จ' });
  }
}

/**
 * อัปเดตบทบาท
 */
export async function updateRole(req, res) {
  const { id } = req.params;
  const { name_en, name_th, description_th, faction, icon, night_action, is_active } = req.body;

  if (!name_en || !name_th || !description_th || !faction || !icon) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลบทบาทให้ครบถ้วน' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE roles SET name_en = ?, name_th = ?, description_th = ?, faction = ?, icon = ?, night_action = ?, is_active = ? WHERE id = ?',
      [name_en, name_th, description_th, faction, icon, night_action, is_active, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบบทบาท' });
    }
    res.json({ message: 'อัปเดตบทบาทสำเร็จ' });
    refreshGameData(); // Refresh cached roles
    logAdminAction(req.user.id, req.user.username, 'role_update', id, name_en, { name_en, faction });
  } catch (error) {
    console.error(`[Admin] Error updating role ${id}:`, error);
    res.status(500).json({ error: 'อัปเดตบทบาทไม่สำเร็จ' });
  }
}

/**
 * ลบบทบาท
 */
export async function deleteRole(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM roles WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบบทบาท' });
    }
    res.json({ message: 'ลบบทบาทสำเร็จ' });
    refreshGameData(); // Refresh cached roles
    logAdminAction(req.user.id, req.user.username, 'role_delete', id, `Role ID: ${id}`);
  } catch (error) {
    console.error(`[Admin] Error deleting role ${id}:`, error);
    res.status(500).json({ error: 'ลบบทบาทไม่สำเร็จ' });
  }
}

/**
 * ดึงการ์ดโชคทั้งหมดสำหรับ Admin
 */
export async function getAllFortuneCardsAdmin(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  try {
    let countQuery = 'SELECT COUNT(*) as total FROM fortune_cards';
    let dataQuery = 'SELECT id, name_en, name_th, description_th, type, icon, is_active, created_at, updated_at FROM fortune_cards';
    const params = [];
    const countParams = [];

    if (search) {
      const searchQuery = ' WHERE name_en LIKE ? OR name_th LIKE ? OR description_th LIKE ?';
      countQuery += searchQuery;
      dataQuery += searchQuery;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    dataQuery += ' ORDER BY type ASC, name_en ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [[{ total }]] = await pool.query(countQuery, countParams);
    const [cards] = await pool.query(dataQuery, params);

    res.json({ cards, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('[Admin] Error fetching all fortune cards:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลการ์ดโชคได้' });
  }
}

/**
 * สร้างการ์ดโชคใหม่
 */
export async function createFortuneCard(req, res) {
  const { name_en, name_th, description_th, type, icon, is_active } = req.body;

  if (!name_en || !name_th || !description_th || !type || !icon) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลการ์ดให้ครบถ้วน' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO fortune_cards (name_en, name_th, description_th, type, icon, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name_en, name_th, description_th, type, icon, is_active]
    );
    res.status(201).json({ message: 'สร้างการ์ดสำเร็จ', cardId: result.insertId });
    refreshGameData(); // Refresh cached fortune cards
    logAdminAction(req.user.id, req.user.username, 'card_create', result.insertId, name_en, { name_en, type });
  } catch (error) {
    console.error('[Admin] Error creating fortune card:', error);
    res.status(500).json({ error: 'สร้างการ์ดไม่สำเร็จ' });
  }
}

/**
 * อัปเดตการ์ดโชค
 */
export async function updateFortuneCard(req, res) {
  const { id } = req.params;
  const { name_en, name_th, description_th, type, icon, is_active } = req.body;

  if (!name_en || !name_th || !description_th || !type || !icon) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลการ์ดให้ครบถ้วน' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE fortune_cards SET name_en = ?, name_th = ?, description_th = ?, type = ?, icon = ?, is_active = ? WHERE id = ?',
      [name_en, name_th, description_th, type, icon, is_active, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบการ์ด' });
    }
    res.json({ message: 'อัปเดตการ์ดสำเร็จ' });
    refreshGameData(); // Refresh cached fortune cards
    logAdminAction(req.user.id, req.user.username, 'card_update', id, name_en, { name_en, type });
  } catch (error) {
    console.error(`[Admin] Error updating fortune card ${id}:`, error);
    res.status(500).json({ error: 'อัปเดตการ์ดไม่สำเร็จ' });
  }
}

/**
 * ลบการ์ดโชค
 */
export async function deleteFortuneCard(req, res) {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM fortune_cards WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ไม่พบการ์ด' });
    }
    res.json({ message: 'ลบการ์ดสำเร็จ' });
    refreshGameData(); // Refresh cached fortune cards
    logAdminAction(req.user.id, req.user.username, 'card_delete', id, `Card ID: ${id}`);
  } catch (error) {
    console.error(`[Admin] Error deleting fortune card ${id}:`, error);
    res.status(500).json({ error: 'ลบการ์ดไม่สำเร็จ' });
  }
}