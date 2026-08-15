const STORAGE_KEY = 'wnw_audio_settings';

const DEFAULT_SETTINGS = {
  master: 80,
  sfx: 80,
  music: 60,
  muted: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

class SoundManager {
  constructor() {
    this.settings = loadSettings();
    this.bgm = null;
    this.sfxCache = new Map();

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this.settings = loadSettings();
        this.updateBgmVolume();
      }
    });
  }

  _getVolume(type) {
    if (this.settings.muted) return 0;
    const masterVol = this.settings.master / 100;
    const typeVol = (type === 'music' ? this.settings.music : this.settings.sfx) / 100;
    return Math.max(0, Math.min(1, masterVol * typeVol));
  }

  playBgm(src, loop = true) {
    if (!src) return;
    if (this.bgm && this.bgm.src.endsWith(src)) {
      if (this.bgm.paused) this.bgm.play().catch(() => {});
      return;
    }

    this.stopBgm();

    this.bgm = new Audio(src);
    this.bgm.loop = loop;
    this.updateBgmVolume();
    this.bgm.play().catch(() => {
      const resume = () => {
        this.bgm.play().catch(() => {});
        document.removeEventListener('click', resume, { once: true });
        document.removeEventListener('keydown', resume, { once: true });
      };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
    });
  }

  stopBgm() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
      this.bgm = null;
    }
  }

  playSfx(src, volumeMultiplier = 1.0) {
    if (!src) return;
    const volume = this._getVolume('sfx') * volumeMultiplier;
    if (volume <= 0) return;

    const sfx = new Audio(src);
    sfx.volume = volume;
    sfx.play().catch(() => {});
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.updateBgmVolume();
  }

  updateBgmVolume() {
    if (this.bgm) {
      this.bgm.volume = this._getVolume('music');
    }
  }
}

export const soundManager = new SoundManager();