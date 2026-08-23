import { getRoom, updateRoom } from './gameStore.js';

export function initNightActions(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  room.nightActions = {};
  room.lastProtectedIds = Array.isArray(room.lastProtectedIds) ? [...room.lastProtectedIds] : [];
  return room.nightActions;
}

export function getBlockedProtectTargets(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room) return [];

  const player = room.players.get(playerId);
  if (!player || player.role !== 'bodyguard' || !player.isAlive) return [];

  return Array.isArray(room.lastProtectedIds) ? [...room.lastProtectedIds] : [];
}

export function submitNightAction(roomId, playerId, { targetId } = {}) {
  const room = getRoom(roomId);
  if (!room) return null;

  const player = room.players.get(playerId);
  if (!player || !player.isAlive) return null;
  if (!targetId || targetId === playerId) return null;

  if (!room.nightActions || typeof room.nightActions !== 'object') {
    room.nightActions = {};
  }

  const role = player.role;
  if (!role) return null;

  if (role === 'bodyguard') {
    const blocked = getBlockedProtectTargets(roomId, playerId);
    if (blocked.includes(targetId)) {
      return null;
    }

    room.nightActions.bodyguard = { playerId, targetId };
    room.lastProtectedIds = [targetId];
    return { bodyguard: { playerId, targetId } };
  }

  if (role === 'werewolf' || role === 'seer' || role === 'silencer') {
    room.nightActions[role] = { playerId, targetId };
    return { [role]: { playerId, targetId } };
  }

  return null;
}

export function resolveNightActions(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const actions = room.nightActions || {};
  const bodyguardAction = actions.bodyguard;
  const werewolfActions = Object.values(actions)
    .filter(action => action && action.playerId && room.players.get(action.playerId)?.role === 'werewolf');

  const werewolfTargetId = werewolfActions.length > 0 ? werewolfActions[0].targetId : null;
  const prevented = !!bodyguardAction && werewolfTargetId && bodyguardAction.targetId === werewolfTargetId;
  const selectedTargetId = prevented ? werewolfTargetId : (werewolfTargetId ?? null);

  let killedId = null;
  let killedNickname = null;
  if (selectedTargetId && !prevented) {
    const target = room.players.get(selectedTargetId);
    if (target && target.isAlive) {
      killedId = selectedTargetId;
      killedNickname = target.nickname;
      target.isAlive = false;
    }
  }

  const silencerAction = actions.silencer;
  const silencedId = silencerAction?.targetId || null;
  const seerAction = actions.seer;
  const seerResult = seerAction && room.players.get(seerAction.targetId)
    ? {
        targetId: seerAction.targetId,
        faction: room.players.get(seerAction.targetId)?.role === 'werewolf' ? 'werewolf' : 'village',
      }
    : null;

  const result = {
    prevented,
    selectedTargetId,
    killedId,
    killedNickname,
    silencedId,
    seerId: seerAction?.playerId || null,
    seerResult,
    protectedIds: prevented && selectedTargetId ? [selectedTargetId] : [],
    skillCount: Object.keys(actions).length,
  };

  room.lastProtectedIds = bodyguardAction ? [bodyguardAction.targetId] : [];
  room.nightActions = actions;

  return result;
}
