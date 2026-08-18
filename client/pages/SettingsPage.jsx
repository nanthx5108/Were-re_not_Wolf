import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import bgHome from '../src/assets/bgHome.png';
import SoundManager from '../src/sound/SoundManager.js';
import '../src/styles/SettingsPage.css';

const BG_IMAGE = bgHome;
// Settings are persisted by SoundManager; page reads/writes percent (0-100)
const DEFAULT_SETTINGS = {
  master: 80,
  sfx: 80,
  music: 60,
  muted: false,
};

function loadSettingsFromSoundManager() {
  try {
    const sm = SoundManager.getSettings();
    return {
      master: Math.round((sm.master ?? 1.0) * 100),
      sfx: Math.round((sm.sfx ?? 0.8) * 100),
      music: Math.round((sm.music ?? 0.6) * 100),
      muted: !!sm.muted,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(loadSettingsFromSoundManager);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    document.title = 'Settings — WEREWOLF';
  }, []);

  function updateValue(key, value) {
      setSettings(prev => {
        const next = { ...prev, [key]: value };
        // apply immediately to SoundManager (convert percent -> 0..1)
        try {
          if (key === 'master') SoundManager.setMaster(Number(value) / 100);
          if (key === 'music') SoundManager.setMusic(Number(value) / 100);
          if (key === 'sfx') SoundManager.setSfx(Number(value) / 100);
          if (key === 'muted') SoundManager.mute(!!value);
        } catch (e) {}
        return next;
      });
    }

    function handleSave() {
      try {
        // SoundManager already persisted settings; show saved UI
        setShowSaved(true);
        try { SoundManager.playSfx('/assets/sounds/sfx/sfx_save_confirm.wav', { volume: 0.9 }); } catch (e) {}
        setTimeout(() => setShowSaved(false), 1800);
      } catch {
        // ignore
      }
    }

  return (
    <div className="settings-page" style={{ backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined }}>
      <div className="settings-overlay" />

      <div className="settings-container">
        <div className="settings-topbar">
          <button className="settings-back-btn" onClick={() => navigate('/')} title="กลับหน้าหลัก">
            <IconBack />
          </button>
          <h1 className="settings-title">Settings</h1>
        </div>

        <div className="settings-panel">
          <div>
            <div className="settings-section-label">เสียง</div>

            <VolumeRow
              label="Master Volume"
              value={settings.master}
              onChange={v => updateValue('master', v)}
              disabled={settings.muted}
            />
            <div className="settings-divider" style={{ margin: '16px 0' }} />
            <VolumeRow
              label="SFX Volume"
              value={settings.sfx}
              onChange={v => updateValue('sfx', v)}
              disabled={settings.muted}
            />
            <div className="settings-divider" style={{ margin: '16px 0' }} />
            <VolumeRow
              label="Music Volume"
              value={settings.music}
              onChange={v => updateValue('music', v)}
              disabled={settings.muted}
            />
          </div>

          <div className="settings-divider" />

          <div className="settings-mute-row">
            <label className="mute-toggle">
              <input
                type="checkbox"
                checked={settings.muted}
                onChange={e => updateValue('muted', e.target.checked)}
              />
              <span>ปิดเสียงทั้งหมด</span>
            </label>
          </div>

          <div className="settings-save-row">
            {showSaved && <span className="settings-saved-msg">บันทึกแล้ว</span>}
            <button className="settings-save-btn" onClick={handleSave}>
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VolumeRow({ label, value, onChange, disabled }) {
  return (
    <div className="volume-row">
      <div className="volume-row-head">
        <span className="volume-label">{label}</span>
        <span className="volume-value">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="volume-slider"
        style={{ opacity: disabled ? 0.4 : 1 }}
      />
    </div>
  );
}