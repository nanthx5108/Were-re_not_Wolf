import { ROLE_DISTRIBUTION, PLAYER_LIMITS } from './constants.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function distributeRoles(players) {
  const count = players.length;
  if (count < PLAYER_LIMITS.MIN || count > PLAYER_LIMITS.MAX) {
    throw new Error(
      `Player count ${count} is outside allowed range [${PLAYER_LIMITS.MIN}, ${PLAYER_LIMITS.MAX}]`
    );
  }
  const roles = shuffle(ROLE_DISTRIBUTION[count]);
  return players.map((player, idx) => ({ ...player, role: roles[idx] }));
}