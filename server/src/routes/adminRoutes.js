import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import {
  getAllUsers,
  updateUser,
  banUser,
  deleteUser,
  getAdminLogs,
  getAllNewsAdmin,
  createNews,
  updateNews,
  deleteNews,
  getAllFortuneCardsAdmin,
  createFortuneCard,
  updateFortuneCard,
  deleteFortuneCard,
  getAllGameSettings,
  updateGameSetting,
  getAllRolesAdmin,
  createRole,
  updateRole,
  deleteRole,
  getGameStats,
  getAllRoomsAdmin,
  closeRoom,
  addBotToRoom,
  forceStartRoom,
} from '../controllers/adminController.js';

const router = Router();

// ทุก Route ในไฟล์นี้ต้องผ่านการตรวจสอบสิทธิ์ Admin ก่อน
router.use(adminAuth);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.post('/users/:id/ban', banUser);
router.delete('/users/:id', deleteUser);

// News Management
router.get('/news', getAllNewsAdmin);
router.post('/news', createNews);
router.put('/news/:id', updateNews);
router.delete('/news/:id', deleteNews);

// Fortune Card Management
router.get('/cards', getAllFortuneCardsAdmin);
router.post('/cards', createFortuneCard);
router.put('/cards/:id', updateFortuneCard);
router.delete('/cards/:id', deleteFortuneCard);

// Game Settings Management
router.get('/settings', getAllGameSettings);
router.put('/settings/:key', updateGameSetting);

// Role Management
router.get('/roles', getAllRolesAdmin);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);
// Game Stats
router.get('/stats', getGameStats);

// Admin Logs
router.get('/logs', getAdminLogs);

// Room Management
router.get('/rooms', getAllRoomsAdmin);
router.post('/rooms/:id/bots', addBotToRoom);
router.post('/rooms/:id/force-start', forceStartRoom);
router.delete('/rooms/:id', closeRoom);

export default router;