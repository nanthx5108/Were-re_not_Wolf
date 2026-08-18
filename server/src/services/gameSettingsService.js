import pool from '../../db/connection.js';

const settingsCache = new Map();

async function loadSettings() {
  try {
    const [settings] = await pool.query('SELECT setting_key, setting_value, value_type FROM game_settings');
    settingsCache.clear();
    for (const setting of settings) {
      settingsCache.set(setting.setting_key, {
        value: setting.setting_value,
        type: setting.value_type,
      });
    }
    console.log(`✅ Game settings loaded: ${settingsCache.size} keys.`);
  } catch (error) {
    console.error('❌ Failed to load game settings from DB:', error);
  }
}

export async function refreshSettings() {
  await loadSettings();
}

export function getSetting(key, defaultValue) {
  if (!settingsCache.has(key)) {
    return defaultValue;
  }

  const { value, type } = settingsCache.get(key);

  switch (type) {
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'true';
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    default: // string
      return value;
  }
}

loadSettings();