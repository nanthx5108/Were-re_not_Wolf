import { Howl, Howler } from 'howler';

const DEFAULTS = { master: 0.9, music: 0.5, sfx: 0.7, muted: false }; // slightly lower defaults for a less intrusive audio experience

class SoundManager {
  constructor() {
    this.settings = this._loadSettings();
    Howler.volume(this.settings.master);
    Howler.mute(this.settings.muted);
    this.bgm = null;
    this.currentBgmKey = null;
  }

  _loadSettings() {
    try { return JSON.parse(localStorage.getItem('wnw_sound')) || DEFAULTS } catch { return DEFAULTS }
  }
  _saveSettings() { localStorage.setItem('wnw_sound', JSON.stringify(this.settings)); }

  init() { Howler.volume(this.settings.master); Howler.mute(this.settings.muted); }

  playBgm(key, src, { loop = true, volume = 1.0, fade = 800 } = {}) {
    if (this.currentBgmKey === key) return;
    if (this.bgm) {
      try { this.bgm.fade(this.bgm.volume(), 0, fade); } catch {}
      setTimeout(() => { try { this.bgm.stop(); } catch {} }, fade);
    }
    this.bgm = new Howl({ src: [src], loop, volume: volume * this.settings.music, html5: true });
    this.currentBgmKey = key;
    this.bgm.play();
  }

  stopBgm() { if (this.bgm) { try { this.bgm.stop(); } catch {} this.bgm = null; this.currentBgmKey = null; } }

  playSfx(src, { volume = 1.0 } = {}) {
    // lightweight one-shot SFX
    const h = new Howl({ src: [src], volume: volume * this.settings.sfx, html5: true });
    h.play();
  }

  setMaster(v) { this.settings.master = Number(v); Howler.volume(this.settings.master); this._saveSettings(); }
  setMusic(v) { this.settings.music = Number(v); if (this.bgm) this.bgm.volume(this.settings.music); this._saveSettings(); }
  setSfx(v) { this.settings.sfx = Number(v); this._saveSettings(); }
  mute(m) { this.settings.muted = !!m; Howler.mute(this.settings.muted); this._saveSettings(); }
  // expose read-only copy of settings for UI
  getSettings() { return { ...this.settings }; }
}

export default new SoundManager();
