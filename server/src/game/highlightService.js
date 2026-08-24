import { getRoom, getPlayersArray } from './gameStore.js';

function addHighlight(roomId, highlight) {
  const room = getRoom(roomId);
  if (!room) return;
  if (!room.highlights) room.highlights = [];
  room.highlights.push({
    ...highlight,
    id: `hl-${Date.now()}-${room.highlights.length}`,
    round: room.round,
  });
}

export function addKillHighlight(roomId, { killedId, killedNickname }) {
  const room = getRoom(roomId);
  if (!room) return;

  const hasPreviousKill = (room.highlights || []).some(h => h.type === 'KILL' || h.type === 'FIRST_BLOOD');

  if (!hasPreviousKill) {
    addHighlight(roomId, {
      type: 'FIRST_BLOOD',
      icon: '🩸',
      title: 'การสังหารครั้งแรก',
      description: `เลือดหยดแรกของเกม: ${killedNickname} คือเหยื่อรายแรกของค่ำคืนนี้`,
      playersInvolved: [killedId],
    });
  } else {
    addHighlight(roomId, {
      type: 'KILL',
      icon: '🩸',
      title: 'การสังหาร',
      description: `${killedNickname} ไม่ตื่นมาเห็นแสงอาทิตย์อีกแล้ว`,
      playersInvolved: [killedId],
    });
  }
}

export function addSaveHighlight(roomId, { bodyguard, protectedPlayer }) {
  if (!bodyguard || !protectedPlayer) return;
  addHighlight(roomId, {
    type: 'SAVE',
    icon: '🛡️',
    title: 'การปกป้องที่สมบูรณ์แบบ',
    description: `${bodyguard.nickname} ปกป้อง ${protectedPlayer.nickname} ได้สำเร็จในคืนนี้`,
    playersInvolved: [bodyguard.id, protectedPlayer.id],
  });
}

export function addRevealHighlight(roomId, { seer, revealedWolf }) {
  if (!seer || !revealedWolf) return;
  addHighlight(roomId, {
    type: 'REVEAL',
    icon: '👁️',
    title: 'การเปิดโปง',
    description: `${seer.nickname} ผู้หยั่งรู้ ได้เปิดโปงว่า ${revealedWolf.nickname} คือหมาป่า!`,
    playersInvolved: [seer.id, revealedWolf.id],
  });
}

export function addUnanimousVoteHighlight(roomId, { eliminatedPlayer }) {
  if (!eliminatedPlayer) return;
  addHighlight(roomId, {
    type: 'UNANIMOUS_VOTE',
    icon: '⚖️',
    title: 'มติเอกฉันท์',
    description: `ทุกคนลงมติเนรเทศ ${eliminatedPlayer.nickname} ออกจากเกาะอย่างเป็นเอกฉันท์`,
    playersInvolved: [eliminatedPlayer.id],
  });
}

export function addBetrayalHighlight(roomId, { eliminatedPlayer, betrayingWerewolves }) {
  if (!eliminatedPlayer || !betrayingWerewolves || betrayingWerewolves.length === 0) return;
  addHighlight(roomId, {
    type: 'BETRAYAL',
    icon: '🔪',
    title: 'การหักหลัง',
    description: `${eliminatedPlayer.nickname} หมาป่าผู้ถูกเนรเทศ ด้วยน้ำมือของพวกพ้อง!`,
    playersInvolved: [eliminatedPlayer.id, ...betrayingWerewolves],
  });
}

export function addFoolWinHighlight(roomId, { foolPlayer }) {
  if (!foolPlayer) return;
  addHighlight(roomId, {
    type: 'FOOL_WIN',
    icon: '🃏',
    title: 'ชัยชนะของคนโง่',
    description: `${foolPlayer.nickname} ถูกเนรเทศออกจากเกาะ และนั่นคือสิ่งที่เขาต้องการมาตลอด!`,
    playersInvolved: [foolPlayer.id],
  });
}

export function addTurningPointHighlight(roomId, { eliminatedPlayer }) {
  if (!eliminatedPlayer) return;

  const descriptions = {
    werewolf: `การเนรเทศ ${eliminatedPlayer.nickname} ผู้เป็นหมาป่า ได้เปลี่ยนกระแสของเกม`,
    seer: `การเนรเทศ ${eliminatedPlayer.nickname} ผู้หยั่งรู้ ทำให้หมู่บ้านต้องเดินหน้าโดยไร้ดวงตา`,
    bodyguard: `การเนรเทศ ${eliminatedPlayer.nickname} ผู้พิทักษ์ ทำให้หมู่บ้านไร้ผู้คุ้มกัน`,
    silencer: `การเนรเทศ ${eliminatedPlayer.nickname} ผู้ปิดปาก ทำให้เสียงในหมู่บ้านดังขึ้น`,
  };

  const description = descriptions[eliminatedPlayer.role];
  if (!description) return; // Not a turning point

  addHighlight(roomId, {
    type: 'TURNING_POINT',
    icon: '🎲',
    title: 'จุดเปลี่ยนสำคัญ',
    description,
    playersInvolved: [eliminatedPlayer.id],
  });
}

export function recordVoteHistory(roomId, voterId, targetId) {
  const room = getRoom(roomId);
  if (!room || !room.memory) return;
  room.memory.voteHistory ??= [];
  room.memory.voteHistory.push({ voterId, targetId, round: room.round ?? 1, at: new Date().toISOString() });
  room.memory.voteTally ??= {};
  room.memory.voteTally[targetId] = (room.memory.voteTally[targetId] || 0) + 1;
}

export function recordPlayerDeath(roomId, playerId, cause = 'unknown', round = 1) {
  const room = getRoom(roomId);
  if (!room || !room.memory) return;
  room.memory.deathLog ??= [];
  const item = { playerId, cause, round, at: new Date().toISOString() };
  room.memory.deathLog.push(item);
  if (!room.memory.firstDeath) {
    room.memory.firstDeath = item;
  }
}

export function recordChatCount(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room || !room.memory) return;
  room.memory.chatCountByPlayer ??= {};
  room.memory.chatCountByPlayer[playerId] = (room.memory.chatCountByPlayer[playerId] || 0) + 1;
}

export function recordGuardianSave(roomId, playerId) {
  const room = getRoom(roomId);
  if (!room || !room.memory) return;
  room.memory.savesByPlayer ??= {};
  room.memory.savesByPlayer[playerId] = (room.memory.savesByPlayer[playerId] || 0) + 1;
}

export function getPostGameHighlights(roomId) {
  const room = getRoom(roomId);
  if (!room) return [];

  const players = getPlayersArray(roomId);
  const playerMap = new Map(players.map(player => [player.id, player]));
  const memory = room.memory || {};
  const voteTally = memory.voteTally || {};

  const candidateHighlights = [];

  const firstDeath = memory.firstDeath ? playerMap.get(memory.firstDeath.playerId) : null;
  if (firstDeath) {
    candidateHighlights.push({
      type: 'FIRST_BLOOD',
      icon: '🩸',
      title: 'ผู้พลีชีพคนแรก',
      description: `${firstDeath.nickname} คือคนแรกที่จากไป ขอให้เป็นความตายที่มีความหมาย`,
      playersInvolved: [firstDeath.id],
    });
  }

  const highestTarget = Object.entries(voteTally).sort((a, b) => b[1] - a[1])[0];
  if (highestTarget && playerMap.has(highestTarget[0])) {
    const survivor = playerMap.get(highestTarget[0]);
    if (survivor && survivor.isAlive) {
      candidateHighlights.push({
        type: 'MOST_TARGETED',
        icon: '🕵️',
        title: 'ผู้ต้องสงสัยตัวยง',
        description: `${survivor.nickname} ถูกชี้หน้ากล่าวหาเยอะสุดทั้งเกม แต่ยังยืนหยัดจนไฟดับ — บริสุทธิ์หรือแค่โชคดี?`,
        playersInvolved: [survivor.id],
      });
    }
  }

  const chatter = Object.entries(memory.chatCountByPlayer || {}).sort((a, b) => b[1] - a[1])[0];
  if (chatter && playerMap.has(chatter[0])) {
    const player = playerMap.get(chatter[0]);
    candidateHighlights.push({
      type: 'CHAT_CHAMP',
      icon: '💬',
      title: 'นักพูดแห่งราตรี',
      description: `พิมพ์ไปทั้งหมด ${chatter[1]} ข้อความ ปากคือพลัง (หรือหลุมพราง)`,
      playersInvolved: [player.id],
    });
  }

  if (room.status === 'finished' && room.winner === 'fool') {
    const fool = players.find(p => p.role === 'fool');
    if (fool) {
      candidateHighlights.push({
        type: 'FOOL_WIN',
        icon: '🃏',
        title: 'ความบังเอิญที่ไม่มีใครตั้งใจ',
        description: `${fool.nickname} ถูกโหวตออกจนชนะ นี่คือความเฮฮาแบบไม่คาดคิด`,
        playersInvolved: [fool.id],
      });
    }
  }

  const turningPointId = memory.turningPoint?.playerId || null;
  if (turningPointId && playerMap.has(turningPointId)) {
    const player = playerMap.get(turningPointId);
    candidateHighlights.push({
      type: 'TURNING_POINT',
      icon: '🎯',
      title: 'โหวตพลิกเกม',
      description: `${player.nickname} คือคนที่ถูกโหวตในจังหวะตัดสินใจสำคัญ สีของเกมเปลี่ยนทันที`,
      playersInvolved: [player.id],
    });
  }

  const wolfMostSilent = players.filter(p => p.role === 'werewolf' && p.isAlive).sort((a, b) => {
    const aVotes = voteTally[a.id] || 0;
    const bVotes = voteTally[b.id] || 0;
    return aVotes - bVotes;
  })[0];
  if (wolfMostSilent) {
    candidateHighlights.push({
      type: 'WOLF_SNEAK',
      icon: '🐺',
      title: 'หมาป่าจอมกล',
      description: `${wolfMostSilent.nickname} เป็นหมาป่าแท้ ๆ แต่ไม่มีใครเอ่ยชื่อสักครั้ง เนียนจนน่าขนลุก`,
      playersInvolved: [wolfMostSilent.id],
    });
  }

  const guardian = Object.entries(memory.savesByPlayer || {}).sort((a, b) => b[1] - a[1])[0];
  if (guardian && playerMap.has(guardian[0])) {
    const player = playerMap.get(guardian[0]);
    if ((guardian[1] || 0) >= 1) {
      candidateHighlights.push({
        type: 'GUARDIAN',
        icon: '🛡️',
        title: 'ผู้คุ้มกันเงียบ',
        description: `${player.nickname} ปกป้องคนรอบตัวได้สำเร็จ ${guardian[1]} ครั้ง สายตาเงียบแต่ยิ่งใหญ่จริง`,
        playersInvolved: [player.id],
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const highlight of candidateHighlights) {
    const key = `${highlight.type}:${highlight.playersInvolved?.[0] || 'none'}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(highlight);
    }
  }

  return deduped.slice(0, 4);
}