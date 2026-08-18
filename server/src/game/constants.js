import { getActiveRoles } from '../services/gameDataService.js';

export const FACTIONS = Object.freeze({
  VILLAGE:  'village',
  WEREWOLF: 'werewolf',
  NEUTRAL:  'neutral',
});

export function getRoles() {
  const roles = {};
  for (const role of getActiveRoles()) {
    roles[role.name_en.toUpperCase()] = role.name_en;
  }
  return Object.freeze(roles);
}

export function getRoleFactionMap() {
  const map = {};
  for (const role of getActiveRoles()) {
    map[role.name_en] = role.faction;
  }
  return Object.freeze(map);
}

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
  NIGHT_ZERO: 'night_zero',
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
  DEAD:     'dead',
});