export const ROLES = Object.freeze({
  VILLAGER:   'villager',
  WEREWOLF:   'werewolf',
  SEER:       'seer',
  BODYGUARD:  'bodyguard',
  FOOL:       'fool',
});

export const FACTIONS = Object.freeze({
  VILLAGE:  'village',
  WEREWOLF: 'werewolf',
  NEUTRAL:  'neutral',
});

export const ROLE_FACTION = Object.freeze({
  villager:  'village',
  seer:      'village',
  bodyguard: 'village',
  werewolf:  'werewolf',
  fool:      'neutral',
});

export const PLAYER_LIMITS = Object.freeze({ MIN: 4, MAX: 8 });

export const PHASES = Object.freeze({
  LOBBY:   'lobby',
  NIGHT:   'night',
  DAY:     'day',
  VOTING:  'voting',
  RESULTS: 'results',
  ENDED:   'ended',
});

export const CHANNELS = Object.freeze({
  VILLAGE:  'village',
  WEREWOLF: 'werewolf',
  SYSTEM:   'system',
});

export const ROLE_DISTRIBUTION = Object.freeze({
  4: ['werewolf', 'seer', 'villager', 'villager'],
  5: ['werewolf', 'seer', 'bodyguard', 'villager', 'villager'],
  6: ['werewolf', 'werewolf', 'seer', 'bodyguard', 'fool', 'villager'],
  7: ['werewolf', 'werewolf', 'seer', 'bodyguard', 'fool', 'villager', 'villager'],
  8: ['werewolf', 'werewolf', 'seer', 'bodyguard', 'fool', 'villager', 'villager', 'villager'],
});