import { getActiveRoles } from '../services/gameDataService.js';

export const FACTIONS = Object.freeze({
  VILLAGE:  'village',
  WEREWOLF: 'werewolf',
  NEUTRAL:  'neutral',
});

/**
 * Returns an object of role names, e.g., { VILLAGER: 'villager', ... }
 * @returns {Readonly<Record<string, string>>}
 */
export function getRoles() {
  const roles = {};
  for (const role of getActiveRoles()) {
    roles[role.name_en.toUpperCase()] = role.name_en;
  }
  return Object.freeze(roles);
}

/**
 * Returns an object mapping role names to their faction.
 * e.g., { villager: 'village', werewolf: 'werewolf' }
 * @returns {Readonly<Record<string, string>>}
 */
export function getRoleFactionMap() {
  const map = {};
  for (const role of getActiveRoles()) {
    map[role.name_en] = role.faction;
  }
  return Object.freeze(map);
}

/**
 * Returns an array of role names that have a night action.
 * @returns {Readonly<string[]>}
 */
export function getNightActionRoles() {
  return Object.freeze(
    getActiveRoles()
      .filter(role => role.night_action)
      .map(role => role.name_en)
  );
}

export const PLAYER_LIMITS = Object.freeze({ MIN: 4, MAX: 8 });

export const PHASES = Object.freeze({
  LOBBY:      'lobby',
  NIGHT_ZERO: 'night_zero',   // คืนที่ 0 — แจก role ให้ดู ไม่มี night action ก่อนเข้า Night 1
  NIGHT:      'night',
  DAY:        'day',
  VOTING:     'voting',
  RESULTS:    'results',
  ENDED:      'ended',
});

export const CHANNELS = Object.freeze({
  VILLAGE:  'village',
  WEREWOLF: 'werewolf',
  SYSTEM:   'system',
  // ห้องแชทของคนตาย — คนเป็นต้องไม่เห็นแม้แต่ข้อความเดียว ไม่งั้นคนตายจะใบ้เกมได้
  DEAD:     'dead',
});