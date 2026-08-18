import { getActiveFortuneCards } from '../services/gameDataService.js';

const DEFAULT_LUCK_CONFIG = Object.freeze({
  goodChance: 0.5, // 50% chance of getting a good card by default
});

export function drawFortuneCard(luckBias = null, rng = Math.random) {
  const allCards = getActiveFortuneCards();
  if (allCards.length === 0) {
    return { id: 'no_card', type: 'bad', name: 'การ์ดว่าง', description: 'ไม่มีการ์ดในสำรับ' };
  }

  const goodCards = allCards.filter(c => c.type === 'good');
  const badCards = allCards.filter(c => c.type === 'bad');

  const config = luckBias || DEFAULT_LUCK_CONFIG;
  const isGood = rng() < config.goodChance;

  if (isGood && goodCards.length > 0) {
    const index = Math.floor(rng() * goodCards.length);
    return goodCards[index];
  } else if (badCards.length > 0) {
    const index = Math.floor(rng() * badCards.length);
    return badCards[index];
  } else {
    return allCards[Math.floor(rng() * allCards.length)];
  }
}