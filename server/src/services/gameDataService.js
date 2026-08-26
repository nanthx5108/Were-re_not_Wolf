import pool from '../../db/connection.js';
import { MORNING_EVENTS } from '../game/morningEvents.js';

let cachedRoles = [];
let cachedFortuneCards = [];
let lastLoaded = null;

async function loadGameData() {
  try {
    const [roles] = await pool.query(
      'SELECT id, name_en, name_th, description_th, faction, icon, night_action, is_active FROM roles WHERE is_active = TRUE ORDER BY name_en ASC'
    );
    cachedRoles = roles.map(role => {
      const faction_th = {
        'village': 'ฝ่ายหมู่บ้าน',
        'werewolf': 'ฝ่ายหมาป่า',
        'neutral': 'ฝ่ายเป็นกลาง',
      }[role.faction] || role.faction;
      return {
      ...role,
      night_action: !!role.night_action,
      is_active: !!role.is_active,
      faction_th,
      card_image: `/roles/${String(role.name_en).toLowerCase()}.png`,
      };
    });

    const [cards] = await pool.query(
      'SELECT id, name_en, name_th, description_th, type, icon, is_active FROM fortune_cards WHERE is_active = TRUE ORDER BY type ASC, name_en ASC'
    );
    cachedFortuneCards = cards.map(card => ({
      ...card,
      is_active: !!card.is_active,
      card_image: card.icon.length > 2 ? `/cards/${card.icon}` : null,
    }));

    lastLoaded = new Date();
    console.log(`✅ Game data loaded: ${cachedRoles.length} roles, ${cachedFortuneCards.length} fortune cards.`);
  } catch (error) {
    console.error('❌ Failed to load game data from DB:', error);
    cachedRoles = [];
    cachedFortuneCards = [];
  }
}

export async function refreshGameData() {
  await loadGameData();
}

export function getActiveRoles() {
  return cachedRoles;
}

export function getActiveFortuneCards() {
  return cachedFortuneCards;
}

export function getMorningEvents() {
  return MORNING_EVENTS;
}

loadGameData();