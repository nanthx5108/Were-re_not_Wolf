import pool from '../../db/connection.js';
import { MORNING_EVENTS } from '../game/morningEvents.js'; // Import hardcoded morning events for now

let cachedRoles = [];
let cachedFortuneCards = [];
let lastLoaded = null;
let cachedMorningEvents = []; // New cache for morning events

/**
 * โหลดข้อมูลบทบาทและการ์ดโชคที่ active จากฐานข้อมูล
 * และเก็บไว้ใน cache
 */
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
      }[role.faction] || role.faction; // Default to English if not found
      return {
      ...role,
      night_action: !!role.night_action, // Ensure boolean
      is_active: !!role.is_active,       // Ensure boolean
      faction_th,
      };
    }));

    const [cards] = await pool.query(
      'SELECT id, name_en, name_th, description_th, type, icon, is_active FROM fortune_cards WHERE is_active = TRUE ORDER BY type ASC, name_en ASC'
    );
    cachedFortuneCards = cards.map(card => ({
      ...card,
      is_active: !!card.is_active,       // Ensure boolean
      // Add card_image path if icon is not an emoji
      card_image: card.icon.length > 2 ? `/cards/${card.icon}` : null, // Assuming icon is filename if not emoji
      // For now, hardcode card_back if needed, or make it configurable
    }));

    lastLoaded = new Date();
    console.log(`✅ Game data loaded: ${cachedRoles.length} roles, ${cachedFortuneCards.length} fortune cards.`);
  } catch (error) {
    console.error('❌ Failed to load game data from DB:', error);
    // หากโหลดไม่สำเร็จ ให้ใช้ข้อมูลว่างเปล่าเพื่อป้องกัน crash
    cachedRoles = [];
    cachedFortuneCards = [];
  }
}

/**
 * บังคับโหลดข้อมูลเกมใหม่จากฐานข้อมูล (เช่น หลัง Admin แก้ไข)
 */
export async function refreshGameData() {
  await loadGameData();
}

/**
 * คืนข้อมูลบทบาทที่ active
 */
export function getActiveRoles() {
  return cachedRoles;
}

/**
 * คืนข้อมูลการ์ดโชคที่ active
 */
export function getActiveFortuneCards() {
  return cachedFortuneCards;
}

/**
 * คืนข้อมูลเหตุการณ์ยามเช้า
 */
export function getMorningEvents() {
  return MORNING_EVENTS; // Morning events are currently hardcoded in server/src/game/morningEvents.js
}

// โหลดข้อมูลครั้งแรกเมื่อ service ถูก import
loadGameData();