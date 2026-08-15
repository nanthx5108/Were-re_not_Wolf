export function adminAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'จำเป็นต้องเข้าสู่ระบบ' });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'จำเป็นต้องมีสิทธิ์ผู้ดูแลระบบ' });
  }
  next();
}