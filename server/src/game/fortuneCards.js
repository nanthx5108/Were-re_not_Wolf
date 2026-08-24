import { getActiveFortuneCards } from '../services/gameDataService.js';

const DEFAULT_LUCK_CONFIG = Object.freeze({
  goodChance: 0.5,
  goodRate: 0.57,
  chaosGoodRate: 0.4,
});

export const FORTUNE_CARD_RULES = Object.freeze({
  classic: { goodChance: 0.42, goodRate: 0.57 },
  chaos: { goodChance: 1, goodRate: 0.4 },
});

export function getFortuneCardConfig(gameMode = 'classic') {
  return FORTUNE_CARD_RULES[gameMode] || FORTUNE_CARD_RULES.classic;
}

export function drawFortuneCard(gameMode = 'classic', luckBias = null, rng = Math.random) {
  const allCards = getActiveFortuneCards();
  if (allCards.length === 0) {
    return { id: 'no_card', type: 'bad', name: 'การ์ดว่าง', name_th: 'การ์ดว่าง', description: 'ไม่มีการ์ดในสำรับ', description_th: 'ไม่มีการ์ดในสำรับ', icon: '⚠️' };
  }

  const goodCards = allCards.filter(c => c.type === 'good');
  const badCards = allCards.filter(c => c.type === 'bad');
  const config = luckBias || getFortuneCardConfig(gameMode);
  const goodChance = (config && Number.isFinite(config.goodChance)) ? config.goodChance : DEFAULT_LUCK_CONFIG.goodChance;
  const goodRate = (config && Number.isFinite(config.goodRate)) ? config.goodRate : DEFAULT_LUCK_CONFIG.goodRate;

  const isGood = rng() < goodChance;
  const finalType = isGood ? 'good' : 'bad';
  const pool = finalType === 'good' ? goodCards : badCards;

  if (pool.length === 0) {
    return allCards[Math.floor(rng() * allCards.length)];
  }

  if (finalType === 'good' && goodCards.length > 0 && rng() < goodRate) {
    const index = Math.floor(rng() * goodCards.length);
    return goodCards[index];
  }

  if (badCards.length > 0 && (finalType === 'bad' || rng() >= goodRate)) {
    const index = Math.floor(rng() * badCards.length);
    return badCards[index];
  }

  if (goodCards.length > 0) {
    const index = Math.floor(rng() * goodCards.length);
    return goodCards[index];
  }

  const index = Math.floor(rng() * allCards.length);
  return allCards[index];
}

export function resolveCardSound(card) {
  if (!card) return '/assets/audio/SFX-RoleDrawFlip.mp3';
  if (card.type === 'good') return '/assets/audio/SFX-GoodCard.mp3';
  if (card.type === 'bad') return '/assets/audio/SFX-BadCard.mp3';
  return '/assets/audio/SFX-RoleDrawFlip.mp3';
}

export function createCardInventoryState(card) {
  if (!card) return null;
  return {
    current: card,
    history: [card.id],
    lastDrawnAt: new Date().toISOString(),
  };
}
