import pool from '../../db/connection.js';

/**
 * บันทึกการกระทำของ Admin ลงในฐานข้อมูล
 * @param {string} adminId - ID ของ Admin ที่กระทำ
 * @param {string} adminUsername - Username ของ Admin ที่กระทำ
 * @param {string} actionType - ประเภทของการกระทำ (เช่น 'user_update', 'user_ban', 'room_close')
 * @param {string} [targetId=null] - ID ของผู้ใช้/ห้องที่ถูกกระทำ
 * @param {string} [targetName=null] - ชื่อของผู้ใช้/ห้องที่ถูกกระทำ
 * @param {object} [details=null] - รายละเอียดเพิ่มเติมของการกระทำ (เช่น ค่าเก่า/ใหม่, เหตุผล)
 */
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