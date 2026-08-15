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

/**
 * Retrieves a setting value by its key.
 * @param {string} key The key of the setting.
 * @param {*} defaultValue The default value to return if the key is not found.
 * @returns {*} The setting value, coerced to its correct type.
 */
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

// Initial load on startup
loadSettings();