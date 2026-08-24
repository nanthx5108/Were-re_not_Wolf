const STORAGE_KEY = 'wnw_sound';

const DEFAULTS = { master: 0.85, music: 0.45, sfx: 0.6, muted: false };

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return raw ? { ...DEFAULTS, ...raw } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

class SoundManager {
  constructor() {
    this.settings = loadSettings();
    this.bgm = null;
    this.currentBgmKey = null;
  }

  init() { /* no-op — settings โหลดอัตโนมัติตอน construct แล้ว */ }

  _saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch { /* private mode */ }
  }

  _volume(type) {
    if (this.settings.muted) return 0;
    return Math.max(0, Math.min(1, this.settings.master * (this.settings[type] ?? 1)));
  }

  playBgm(srcOrKey, maybeSrc, opts = {}) {
    const src  = maybeSrc ?? srcOrKey;
    const key  = maybeSrc ? srcOrKey : src;
    const loop = opts.loop ?? true;
    if (!src) return;
    if (this.currentBgmKey === key && this.bgm && !this.bgm.paused) return;

    this.stopBgm();
    this.bgm = new Audio(src);
    this.bgm.loop = loop;
    this.bgm.volume = this._volume('music');
    this.currentBgmKey = key;
    this.bgm.play().catch(() => {
      const resume = () => { this.bgm?.play().catch(() => {}); };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
    });
  }

  stopBgm() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
      this.bgm = null;
      this.currentBgmKey = null;
    }
  }

  playSfx(src, volumeArg = 1.0) {
    if (!src) return;
    const multiplier = typeof volumeArg === 'number' ? volumeArg : (volumeArg.volume ?? 1.0);
    const volume = this._volume('sfx') * multiplier;
    if (volume <= 0) return;
    const sfx = new Audio(src);
    sfx.volume = Math.max(0, Math.min(1, volume));
    sfx.play().catch(() => {});
  }

  setMaster(v) { this.settings.master = Number(v); this._applyBgmVolume(); this._saveSettings(); }
  setMusic(v)  { this.settings.music  = Number(v); this._applyBgmVolume(); this._saveSettings(); }
  setSfx(v)    { this.settings.sfx    = Number(v); this._saveSettings(); }
  mute(m)      { this.settings.muted  = Boolean(m); this._applyBgmVolume(); this._saveSettings(); }

  _applyBgmVolume() {
    if (this.bgm) this.bgm.volume = this._volume('music');
  }

  getSettings() { return { ...this.settings }; }
}

export const soundManager = new SoundManager();
export default soundManager;