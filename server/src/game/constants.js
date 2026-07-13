export const ROLES = Object.freeze({
  VILLAGER:   'villager',
  WEREWOLF:   'werewolf',
  SEER:       'seer',
  BODYGUARD:  'bodyguard',
  SILENCER:   'silencer',
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
  silencer:  'village',
  werewolf:  'werewolf',
  fool:      'neutral',
});

// บทบาทที่มี night action — ใช้ตรวจสิทธิ์ก่อนรับ action
export const NIGHT_ACTION_ROLES = Object.freeze(['werewolf', 'seer', 'bodyguard', 'silencer']);

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
  // ห้องแชทของคนตาย — คนเป็นต้องไม่เห็นแม้แต่ข้อความเดียว ไม่งั้นคนตายจะใบ้เกมได้
  DEAD:     'dead',
});

export const ROLE_DISTRIBUTION = Object.freeze({
  4: ['werewolf', 'seer', 'villager', 'villager'],
  5: ['werewolf', 'seer', 'bodyguard', 'villager', 'villager'],
  6: ['werewolf', 'werewolf', 'seer', 'bodyguard', 'fool', 'villager'],
  7: ['werewolf', 'werewolf', 'seer', 'bodyguard', 'fool', 'villager', 'villager'],
  8: ['werewolf', 'werewolf', 'seer', 'bodyguard', 'fool', 'villager', 'villager', 'villager'],
});