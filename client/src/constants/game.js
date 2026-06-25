export const PLAYER_LIMITS = Object.freeze({ MIN: 4, MAX: 8 });

export const ROLES = Object.freeze({
  VILLAGER:   'villager',
  WEREWOLF:   'werewolf',
  SEER:       'seer',
  BODYGUARD:  'bodyguard',
  FOOL:       'fool',
});

export const PHASES = Object.freeze({
  LOBBY:   'lobby',
  NIGHT:   'night',
  DAY:     'day',
  VOTING:  'voting',
  RESULTS: 'results',
  ENDED:   'ended',
});

export const PHASE_DURATIONS_SEC = Object.freeze({
  night:   30,
  day:     60,
  voting:  30,
  results: 10,
});

export const PHASE_CONFIG = Object.freeze({
  night:   { label: 'Night',   color: '#c0392b' },
  day:     { label: 'Day',     color: '#e8a027' },
  voting:  { label: 'Voting',  color: '#7c6bbf' },
  results: { label: 'Results', color: '#27ae60' },
  lobby:   { label: 'Lobby',   color: '#8a9ab0' },
});