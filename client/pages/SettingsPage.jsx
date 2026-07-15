import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import bgHome from '../src/assets/bgHome.jpg';
import '../src/styles/SettingsPage.css';

const BG_IMAGE = bgHome;
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
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
  const [settings, setSettings] = useState(loadSettings);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    document.title = 'Settings — WEREWOLF';
  }, []);

  function updateValue(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1800);
    } catch {
      // localStorage unavailable — silently ignore
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