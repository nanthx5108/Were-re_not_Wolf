import { getPlayersArray, updateRoom } from './gameStore.js';
import { ROLE_FACTION } from './constants.js';

export function evaluateWinCondition(roomId) {
  const players = getPlayersArray(roomId).filter(p => p.isAlive);
  if (players.length === 0) {
    return { winner: 'none', message: 'ไม่มีผู้รอดชีวิตเหลืออยู่.' };
  }

  if (players.length === 1 && players[0].role === 'fool') {
    return {
      winner: 'fool',
      message: 'คนโง่ชนะแล้ว! เขารอดชีวิตได้เพียงผู้เดียว.',
    };
  }

  const aliveWerewolves = players.filter(p => p.role === 'werewolf').length;
  const aliveVillagers = players.filter(p => ROLE_FACTION[p.role] === 'village').length;

  if (aliveWerewolves === 0) {
    return {
      winner: 'village',
      message: 'ชาวบ้านชนะแล้ว! หมาป่าทั้งหมดถูกกำจัด.',
    };
  }

  if (aliveWerewolves >= aliveVillagers) {
    return {
      winner: 'werewolf',
      message: 'หมาป่าชนะแล้ว! พวกมันมีจำนวนเท่าหรือมากกว่าชาวบ้าน.',
    };
  }

  return null;
}

export function endGame(roomId, winner, message) {
  const room = updateRoom(roomId, { status: 'finished', phase: 'ended' });
  return { room, winner, message };
}
