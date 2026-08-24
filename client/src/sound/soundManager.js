const STORAGE_KEY = 'wnw_sound';

const DEFAULTS = { master: 0.85, music: 0.45, sfx: 0.6, muted: false };

const LEGACY_AUDIO_MAP = {
  '/audio/sfx_chat_receive.wav': '/assets/audio/SFX-Chat.mp3',
  '/audio/sfx_phase_change.wav': '/assets/audio/SFX-Phase.mp3',
  '/audio/sfx_vote.wav': '/assets/audio/SFX-Vote.mp3',
  '/audio/sfx_card_good.wav': '/assets/audio/SFX-GoodCard.mp3',
  '/audio/sfx_card_bad.wav': '/assets/audio/SFX-BadCard.mp3',
  '/audio/sfx_card_draw.wav': '/assets/audio/SFX-RoleDrawFlip.mp3',
  '/audio/sfx_card_flip.wav': '/assets/audio/SFX-RoleDrawFlip.mp3',
  '/audio/sfx_action_confirm.wav': '/assets/audio/SFX-NightAct.mp3',
  '/audio/bgm_home.mp3': '/assets/audio/BGM-lobby.mp3',
  '/audio/bgm_win.mp3': '/assets/audio/BGM-voting.mp3',
  '/audio/bgm_lose.mp3': '/assets/audio/BGM-night.mp3',
  '/audio/sfx_hover.wav': '/assets/audio/SFX-Chat.mp3',
  '/audio/sfx_game_win.wav': '/assets/audio/SFX-GoodCard.mp3',
  '/audio/sfx_game_lose.wav': '/assets/audio/SFX-BadCard.mp3',
};

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

  // ไม่มีอะไรต้องทำเพิ่ม (settings โหลดอัตโนมัติตอน construct แล้ว)
  // เก็บไว้เพื่อความเข้ากันได้กับโค้ดเดิมที่เรียก soundManager.init()
  init() { /* no-op */ }

  _saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch { /* private mode */ }
  }

  resolveAssetPath(src) {
    if (!src) return src;
    if (LEGACY_AUDIO_MAP[src]) return LEGACY_AUDIO_MAP[src];
    return src;
  }

  _volume(type) {
    if (this.settings.muted) return 0;
    return Math.max(0, Math.min(1, this.settings.master * (this.settings[type] ?? 1)));
  }

  playBgm(srcOrKey, maybeSrc, opts = {}) {
    // รองรับทั้ง playBgm(src) แบบเดิม และ playBgm(key, src, opts) แบบใหม่
    const src  = this.resolveAssetPath(maybeSrc ?? srcOrKey);
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

  // รองรับทั้ง playSfx(src, 0.5) แบบตัวเลขตรงๆ (Gamecontext.jsx ใช้แบบนี้)
  // และ playSfx(src, { volume: 0.5 }) แบบ object
  playSfx(src, volumeArg = 1.0) {
    const resolvedSrc = this.resolveAssetPath(src);
    if (!resolvedSrc) return;
    const multiplier = typeof volumeArg === 'number' ? volumeArg : (volumeArg.volume ?? 1.0);
    const volume = this._volume('sfx') * multiplier;
    if (volume <= 0) return;
    const sfx = new Audio(resolvedSrc);
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