import { PLAYER_LIMITS, ROLES } from './constants.js';
import { CONFIGURABLE_ROLES, buildDefaultRoleConfig } from './roomConfig.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// กาง roleConfig ({ werewolf: 2, seer: 1, ... }) เป็นรายการบทบาทตามจำนวนผู้เล่นจริง
// ที่นั่งที่เหลือหลังหักบทบาทพิเศษจะถูกเติมด้วย villager
export function buildRoleList(roleConfig, playerCount) {
  const roles = [];
  for (const role of CONFIGURABLE_ROLES) {
    for (let i = 0; i < (roleConfig[role] || 0); i++) roles.push(role);
  }
  if (roles.length > playerCount) {
    throw new Error(`Configured roles (${roles.length}) exceed player count (${playerCount}).`);
  }
  while (roles.length < playerCount) roles.push(ROLES.VILLAGER);
  return roles;
}

export function distributeRoles(players, roleConfig) {
  const count = players.length;
  if (count < PLAYER_LIMITS.MIN || count > PLAYER_LIMITS.MAX) {
    throw new Error(
      `Player count ${count} is outside allowed range [${PLAYER_LIMITS.MIN}, ${PLAYER_LIMITS.MAX}]`
    );
  }
  const config = roleConfig || buildDefaultRoleConfig(count);
  const roles  = shuffle(buildRoleList(config, count));
  return players.map((player, idx) => ({ ...player, role: roles[idx] }));
}
