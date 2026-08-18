import pool from '../../db/connection.js';

export async function logAdminAction(adminId, adminUsername, actionType, targetId = null, targetName = null, details = null) {
  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, admin_username, action_type, target_id, target_name, details) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, adminUsername, actionType, targetId, targetName, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('[AdminLogger] Error logging admin action:', error);
  }
}