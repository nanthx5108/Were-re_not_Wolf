import {
  createRoomService,
  getRoomService,
  joinRoomService,
} from '../services/roomService.js';
import { serializeRoom } from '../game/gameStore.js';

export async function createRoomHandler(req, res, next) {
  try {
    const { hostNickname, roomName } = req.body;

    if (!hostNickname?.trim() || !roomName?.trim()) {
      return res.status(400).json({ error: 'hostNickname and roomName are required.' });
    }
    if (hostNickname.trim().length > 32) {
      return res.status(400).json({ error: 'Nickname must be 32 characters or fewer.' });
    }

    const { roomId, playerId } = await createRoomService({
      hostNickname,
      roomName,
      userId: req.session?.userId || null, // ผูก playerId กับ account ถ้า login อยู่
    });

    return res.status(201).json({
      roomId,
      playerId,
      room: serializeRoom(roomId),
    });
  } catch (err) {
    next(err);
  }
}

export async function getRoomHandler(req, res, next) {
  try {
    const room = await getRoomService(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    return res.json({ room });
  } catch (err) {
    next(err);
  }
}

export async function joinRoomHandler(req, res, next) {
  try {
    const { nickname } = req.body;
    if (!nickname?.trim()) {
      return res.status(400).json({ error: 'nickname is required.' });
    }
    if (nickname.trim().length > 32) {
      return res.status(400).json({ error: 'Nickname must be 32 characters or fewer.' });
    }

    const result = await joinRoomService({
      roomId: req.params.roomId,
      nickname,
      userId: req.session?.userId || null,
    });
    return res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}