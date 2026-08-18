export const STARTING_LEVEL = 0;

export const EXP_PER_GAME = 1;

export function expNeeded(level) {
  return 5 + Math.max(0, level) * 2;
}

export function applyExp(level, exp, gained = EXP_PER_GAME) {
  let nextLevel = Math.max(0, level ?? 0);
  let nextExp   = Math.max(0, exp ?? 0) + gained;

  while (nextExp >= expNeeded(nextLevel)) {
    nextExp -= expNeeded(nextLevel);
    nextLevel += 1;
  }

  return { level: nextLevel, exp: nextExp };
}

export function levelFromGamesPlayed(gamesPlayed) {
  return applyExp(STARTING_LEVEL, 0, Math.max(0, gamesPlayed ?? 0) * EXP_PER_GAME);
}

export function levelProgress(level, exp) {
  const need = expNeeded(level);
  if (need <= 0) return 0;
  return Math.min(1, Math.max(0, (exp ?? 0) / need));
}
