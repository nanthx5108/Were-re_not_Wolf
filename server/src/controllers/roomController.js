import {
  createRoomService,
  getRoomService,
  joinRoomService,
  listRoomsService,
} from '../services/roomService.js';
import { serializeRoom } from '../game/gameStore.js';
import { PLAYER_LIMITS } from '../game/constants.js';

export async function createRoomHandler(req, res, next) {
  try {
    const rawHostNickname = req.body?.hostNickname;
    const rawRoomName = req.body?.roomName;
    const rawMaxPlayers = req.body?.maxPlayers;
    const isPrivate = req.body?.isPrivate;

    const hostNickname = typeof rawHostNickname === 'string' ? rawHostNickname.trim() : rawHostNickname;
    const roomName = typeof rawRoomName === 'string' ? rawRoomName.trim() : rawRoomName;
    const parsedMaxPlayers = typeof rawMaxPlayers === 'string' ? Number.parseInt(rawMaxPlayers, 10) : rawMaxPlayers;

    if (!hostNickname || !roomName) {
      return res.status(400).json({ error: 'hostNickname and roomName are required.' });
    }
    if (hostNickname.length > 32) {
      return res.status(400).json({ error: 'Nickname must be 32 characters or fewer.' });
    }
    if (
      parsedMaxPlayers !== undefined &&
      (!Number.isInteger(parsedMaxPlayers) || parsedMaxPlayers < PLAYER_LIMITS.MIN || parsedMaxPlayers > PLAYER_LIMITS.MAX)
    ) {
      return res.status(400).json({
        error: `maxPlayers must be between ${PLAYER_LIMITS.MIN} and ${PLAYER_LIMITS.MAX}.`,
      });
    }

    const { roomId, playerId } = await createRoomService({
      hostNickname,
      roomName,
      userId: req.session?.userId || null,
      maxPlayers: parsedMaxPlayers,
      isPrivate: !!isPrivate,
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

export async function listRoomsHandler(req, res, next) {
  try {
    const rooms = await listRoomsService();
    return res.json({ rooms });
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








