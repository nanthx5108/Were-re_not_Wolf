import { Router } from 'express';
import {
  createRoomHandler,
  getRoomHandler,
  joinRoomHandler,
  listRoomsHandler,
} from '../controllers/roomController.js';

const router = Router();

router.post('/',               createRoomHandler);
router.get('/',                listRoomsHandler);
router.get('/:roomId',         getRoomHandler);
router.post('/:roomId/join',   joinRoomHandler);

export default router;