const STORAGE_KEY = 'wnw_sound';
const LEGACY_STORAGE_KEY = 'wnw_audio_settings';

const DEFAULTS = { master: 0.85, music: 0.45, sfx: 0.6, ui: 0.45, muted: false };

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

const EVENT_SOUND_MAP = {
  chat: '/assets/audio/SFX-Chat.mp3',
  phase: '/assets/audio/SFX-Phase.mp3',
  vote: '/assets/audio/SFX-Vote.mp3',
  goodCard: '/assets/audio/SFX-GoodCard.mp3',
  badCard: '/assets/audio/SFX-BadCard.mp3',
  roleDraw: '/assets/audio/SFX-RoleDrawFlip.mp3',
  nightAction: '/assets/audio/SFX-NightAct.mp3',
  roomJoin: '/assets/audio/SFX-joinroom.mp3',
  roomLeave: '/assets/audio/SFX-outroom.mp3',
  ready: '/assets/audio/SFX-Ready.mp3',
  error: '/assets/audio/SFX-Invalid Action.mp3',
  win: '/assets/audio/SFX-. Victory.mp3',
  lose: '/assets/audio/SFX-Defeat.mp3',
  roomClose: '/assets/audio/SFX-Host Action.mp3',
  morning: '/assets/audio/SFX-Morning Event.mp3',
  elimination: '/assets/audio/SFX-Elimination.mp3',
  silenced: '/assets/audio/SFX-Silenced.mp3',
  hover: '/assets/audio/SFX-UI Hover.mp3',
  countdown: '/assets/audio/SFX-Countdown Warning.mp3',
};

const CARD_SOUND_MAP = {
  good: '/assets/audio/SFX-GoodCard.mp3',
  bad: '/assets/audio/SFX-BadCard.mp3',
  default: '/assets/audio/SFX-RoleDrawFlip.mp3',
  magic_eyes: '/assets/audio/SFX-Phase.mp3',
  whisper: '/assets/audio/SFX-Chat.mp3',
  confused: '/assets/audio/SFX-BadCard.mp3',
  observer: '/assets/audio/SFX-Morning Event.mp3',
  reflex: '/assets/audio/SFX-Ready.mp3',
};

function normalizeVolume(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const normalized = number > 1 ? number / 100 : number;
  return Math.max(0, Math.min(1, normalized));
}

function normalizeSettings(settings = {}) {
  return {
    master: normalizeVolume(settings.master, DEFAULTS.master),
    music: normalizeVolume(settings.music, DEFAULTS.music),
    sfx: normalizeVolume(settings.sfx, DEFAULTS.sfx),
    ui: normalizeVolume(settings.ui, DEFAULTS.ui),
    muted: Boolean(settings.muted),
  };
}

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return stored ? normalizeSettings(JSON.parse(stored)) : { ...DEFAULTS };
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
        ...this.settings,
        master: this.settings.master * 100,
        music: this.settings.music * 100,
        sfx: this.settings.sfx * 100,
        ui: this.settings.ui * 100,
      }));
    } catch { /* private mode */ }
  }

  resolveAssetPath(src) {
    if (!src) return src;
    if (LEGACY_AUDIO_MAP[src]) return LEGACY_AUDIO_MAP[src];
    if (typeof src === 'string' && EVENT_SOUND_MAP[src]) return EVENT_SOUND_MAP[src];
    return src;
  }

  playEvent(eventName, volume = 1.0) {
    const key = String(eventName || '').trim();
    if (!key) return;
    const resolved = this.resolveAssetPath(EVENT_SOUND_MAP[key] || key);
    if (!resolved) return;
    this.playSfx(resolved, volume);
  }

  playCard(card, volume = 1.0) {
    const cardKey = card?.id || card?.type;
    const resolved = CARD_SOUND_MAP[cardKey] || CARD_SOUND_MAP[card?.type] || CARD_SOUND_MAP.default;
    if (!resolved) return;
    this.playSfx(resolved, volume);
  }

  _volume(type) {
    if (this.settings.muted) return 0;
    return Math.max(0, Math.min(1, this.settings.master * (this.settings[type] ?? 1)));
  }

  playBgm(srcOrKey, maybeSrc, opts = {}) {
    // รองรับทั้ง playBgm(src) แบบเดิม และ playBgm(key, src, opts) แบบใหม่
    const legacyLoop = typeof maybeSrc === 'boolean' ? maybeSrc : null;
    const src  = this.resolveAssetPath(legacyLoop === null ? (maybeSrc ?? srcOrKey) : srcOrKey);
    const key  = legacyLoop === null && maybeSrc ? srcOrKey : src;
    const loop = legacyLoop ?? opts.loop ?? true;
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

  playUi(src, volumeArg = 1.0) {
    const resolvedSrc = this.resolveAssetPath(src);
    if (!resolvedSrc) return;
    const multiplier = typeof volumeArg === 'number' ? volumeArg : (volumeArg.volume ?? 1.0);
    const volume = this._volume('ui') * multiplier;
    if (volume <= 0) return;
    const uiSound = new Audio(resolvedSrc);
    uiSound.volume = Math.max(0, Math.min(1, volume));
    uiSound.play().catch(() => {});
  }

  updateSettings(patch = {}) {
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    this._applyBgmVolume();
    this._saveSettings();
  }

  setMaster(v) { this.updateSettings({ master: v }); }
  setMusic(v)  { this.updateSettings({ music: v }); }
  setSfx(v)    { this.updateSettings({ sfx: v }); }
  mute(m)      { this.settings.muted  = Boolean(m); this._applyBgmVolume(); this._saveSettings(); }

  _applyBgmVolume() {
    if (this.bgm) this.bgm.volume = this._volume('music');
  }

  getSettings() { return { ...this.settings }; }
}

export const soundManager = new SoundManager();
export default soundManager;