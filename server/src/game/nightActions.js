import { getRoom, updateRoom, updatePlayer } from './gameStore.js';
import { ROLE_FACTION } from './constants.js';
import { consumeNightEffect, getActiveNightEffect } from './morningEvents.js';

export function initNightActions(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const actions = {
    werewolf: {},
    seer: null,
    bodyguard: null,
    silencer: null,
  };

  updateRoom(roomId, { nightActions: actions });
  return actions;
}

/**
 * คนที่ผู้พิทักษ์ห้ามเลือกคืนนี้ — ห้ามป้องกันคนเดิม 2 คืนติด
 * คืน array ว่างถ้าไม่ใช่ผู้พิทักษ์ หรือคืนก่อนไม่ได้ป้องกันใคร
 */
export function getBlockedProtectTargets(roomId, playerId) {
  const room = getRoom(roomId);
  const player = room?.players.get(playerId);
  if (!room || player?.role !== 'bodyguard') return [];
  return room.lastProtectedIds || [];
}

export function submitNightAction(roomId, playerId, action) {
  const room = getRoom(roomId);
  if (!room) return null;

  const player = room.players.get(playerId);
  if (!player || !player.isAlive) return null;

  const targetId = action?.targetId;
  if (!targetId) return null;

  const target = room.players.get(targetId);
  if (!target || !target.isAlive || targetId === playerId) return null;

  const current = room.nightActions || { werewolf: {}, seer: null, bodyguard: null, silencer: null };
  const next = {
    werewolf: { ...(current.werewolf || {}) },
    seer: current.seer,
    bodyguard: current.bodyguard,
    silencer: current.silencer,
  };

  if (player.role === 'werewolf') {
    next.werewolf[playerId] = targetId;
  } else if (player.role === 'seer') {
    next.seer = { playerId, targetId };
  } else if (player.role === 'silencer') {
    next.silencer = { playerId, targetId };
  } else if (player.role === 'bodyguard') {
    // ห้ามป้องกันคนเดิม 2 คืนติด
    if (getBlockedProtectTargets(roomId, playerId).includes(targetId)) return null;

    // เหตุการณ์ "เรือกลับเข้าฝั่ง" — คืนนี้ผู้พิทักษ์เลือกป้องกันได้ 2 คน
    const maxTargets = getActiveNightEffect(roomId) === 'double_guard' ? 2 : 1;
    const existing = next.bodyguard?.playerId === playerId
      ? (next.bodyguard.targetIds || [next.bodyguard.targetId].filter(Boolean))
      : [];

    let targetIds;
    if (existing.includes(targetId)) {
      targetIds = existing;
    } else if (existing.length < maxTargets) {
      targetIds = [...existing, targetId];
    } else {
      targetIds = maxTargets === 1 ? [targetId] : [existing[0], targetId];
    }

    next.bodyguard = { playerId, targetIds };
  } else {
    return null;
  }

  updateRoom(roomId, { nightActions: next });
  return next;
}

// ตัดสินผลของคืนนี้ — เป็น pure game logic ไม่แตะ DB
// การเขียน is_alive ลง DB เป็นหน้าที่ของ phaseManager (ที่เดียวกับตอน resolve โหวต)
export function resolveNightActions(roomId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const actions = room.nightActions || { werewolf: {}, seer: null, bodyguard: null, silencer: null };
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

  // ผลจากเหตุการณ์ประจำเช้า — มีผลแค่คืนเดียวแล้วถูกล้างทิ้ง
  const nightEffect = consumeNightEffect(roomId);

  const protectedIds = actions.bodyguard?.targetIds
    || (actions.bodyguard?.targetId ? [actions.bodyguard.targetId] : []);

  // "ไฟดับทั้งหมู่บ้าน" — การป้องกันไม่มีผลจริง และไม่มีการแจ้งผู้พิทักษ์
  const protectionActive = nightEffect !== 'blackout';
  const prevented = Boolean(
    selectedTargetId && protectionActive && protectedIds.includes(selectedTargetId)
  );

  let killedId = null;
  let killedNickname = null;

  if (selectedTargetId && !prevented) {
    const target = room.players.get(selectedTargetId);
    if (target && target.isAlive) {
      killedId = selectedTargetId;
      killedNickname = target.nickname;
      updatePlayer(roomId, killedId, { isAlive: false });
    }
  }

  // Seer รู้แค่ฝ่าย ไม่ใช่บทบาท — "หมอกลงจัด" ทำให้ตรวจได้แต่ผลไม่ชัดเจน
  const seerResult = actions.seer?.targetId ? (() => {
    const target = room.players.get(actions.seer.targetId);
    if (!target) return null;
    return nightEffect === 'fog'
      ? { targetId: target.id, faction: 'unclear' }
      : { targetId: target.id, faction: ROLE_FACTION[target.role] };
  })() : null;

  // Silencer — เป้าหมายพิมพ์ไม่ได้ตลอดวันถัดไป (ตายคืนนี้แล้วก็ไม่ต้องปิดปาก)
  const silencedId = actions.silencer?.targetId && actions.silencer.targetId !== killedId
    ? actions.silencer.targetId
    : null;
  const silencedNickname = silencedId ? room.players.get(silencedId)?.nickname ?? null : null;

  // เก็บคนที่ผู้พิทักษ์เฝ้าคืนนี้ไว้ เพื่อบล็อกไม่ให้เลือกซ้ำในคืนถัดไป
  updateRoom(roomId, {
    lastProtectedIds: protectedIds,
    silencedPlayerId: silencedId,
  });

  const skillCount =
    Object.keys(werewolfVotes).length +
    (actions.seer ? 1 : 0) +
    (actions.bodyguard ? 1 : 0) +
    (actions.silencer ? 1 : 0);

  return {
    werewolfVotes,
    selectedTargetId,
    killedId,
    killedNickname,
    protectedIds,
    prevented,
    seerResult,
    seerId: actions.seer?.playerId || null,
    silencedId,
    silencedNickname,
    skillCount,
    nightEffect,
  };
}
