const STORAGE_KEY = 'wnw_mic_settings';

const DEFAULT_MIC_SETTINGS = {
  mode: 'toggle', // 'toggle' | 'ptt'
  pttKey: 'Space',
};

export function getMicSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MIC_SETTINGS;
    return { ...DEFAULT_MIC_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_MIC_SETTINGS; }
}

export function setMicSettings(patch) {
  const next = { ...getMicSettings(), ...patch };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  return next;
}