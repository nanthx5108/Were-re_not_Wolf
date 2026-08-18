import { getUserByIdService } from '../services/authService.js';

// เดิม middleware นี้เช็ค req.user.isAdmin เฉย ๆ แต่ไม่มีจุดไหนในทั้งโปรเจกต์ set req.user
// เลย (มีแค่ req.session.userId จาก authController) ทำให้ทุก request โดน 401 ตลอดแม้เป็น
// admin จริง — แก้โดยให้ middleware นี้โหลด user จาก session เองก่อนเช็คสิทธิ์
export async function adminAuth(req, res, next) {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'จำเป็นต้องเข้าสู่ระบบ' });
    }

    const user = await getUserByIdService(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'จำเป็นต้องเข้าสู่ระบบ' });
    }
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'จำเป็นต้องมีสิทธิ์ผู้ดูแลระบบ' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}