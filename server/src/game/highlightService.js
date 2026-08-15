import { getRoom } from './gameStore.js';

/** Helper to add a highlight to the current game's log */
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