import { Router } from 'express';
import {
  createRoomHandler,
  getRoomHandler,
  joinRoomHandler,
  listRoomsHandler,
} from '../controllers/roomController.js';

const router = Router();

router.post('/',               createRoomHandler);   // สร้างห้องใหม่
router.get('/',                listRoomsHandler);     // รายชื่อห้องสาธารณะ (สำหรับหน้า Join Room)
router.get('/:roomId',         getRoomHandler);       // ดูข้อมูลห้อง
router.post('/:roomId/join',   joinRoomHandler);      // เข้าร่วมห้อง

export default router;