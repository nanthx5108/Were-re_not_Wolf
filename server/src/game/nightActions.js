import pool from '../../db/connection.js';
import { getRoom, updateRoom, getPlayersArray, updatePlayer } from './gameStore.js';

export function initNightActions(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const actions = {
    werewolf: {},
    seer: null,
    bodyguard: null,
  };

  updateRoom(roomId, { nightActions: actions });
  return actions;
}

export function submitNightAction(roomId, playerId, action) {
  const room = getRoom(roomId);
  if (!room) return null;

  const player = room.players.get(playerId);
  if (!player || !player.isAlive) return null;

  const targetId = action?.targetId;
  if (!targetId) return null;

  const current = room.nightActions || { werewolf: {}, seer: null, bodyguard: null };
  const next = {
    werewolf: { ...(current.werewolf || {}) },
    seer: current.seer,
    bodyguard: current.bodyguard,
  };

  if (player.role === 'werewolf') {
    next.werewolf[playerId] = targetId;
  } else if (player.role === 'seer') {
    next.seer = { playerId, targetId };
  } else if (player.role === 'bodyguard') {
    next.bodyguard = { playerId, targetId };
  } else {
    return null;
  }

  updateRoom(roomId, { nightActions: next });
  return next;
}

export async function resolveNightActions(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const actions = room.nightActions || { werewolf: {}, seer: null, bodyguard: null };
  const werewolfVotes = actions.werewolf || {};

  const voteCounts = {};
  for (const targetId of Object.values(werewolfVotes)) {
    if (!targetId) continue;
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  }

  let topCount = 0;
  let topTargets = [];
  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > topCount) {
      topCount = count;
      topTargets = [targetId];
    } else if (count === topCount) {
      topTargets.push(targetId);
    }
  }

  const selectedTargetId = topTargets.length === 1 ? topTargets[0] : null;
  const protectedId = actions.bodyguard?.targetId || null;
  const prevented = selectedTargetId && protectedId === selectedTargetId;

  let killedId = null;
  let killedNickname = null;

  if (selectedTargetId && !prevented) {
    const target = room.players.get(selectedTargetId);
    if (target && target.isAlive) {
      killedId = selectedTargetId;
      killedNickname = target.nickname;
      updatePlayer(roomId, killedId, { isAlive: false });
      await pool.query(`UPDATE players SET is_alive = false WHERE id = ?`, [killedId]);
    }
  }

  const seerResult = actions.seer?.targetId ? (() => {
    const target = room.players.get(actions.seer.targetId);
    return target ? { targetId: target.id, role: target.role } : null;
  })() : null;

  return {
    werewolfVotes,
    selectedTargetId,
    killedId,
    killedNickname,
    protectedId,
    prevented,
    seerResult,
    seerId: actions.seer?.playerId || null,
  };
}
