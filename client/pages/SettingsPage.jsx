import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSound } from '../src/context/SoundContext.jsx';
import { getPerfMode, setPerfMode } from '../src/utils/perfMode.js';
import bgHome from '../src/assets/bgHome.jpg';
import '../src/styles/SettingsPage.css';

const BG_IMAGE = bgHome;
const STORAGE_KEY = 'wnw_audio_settings';

const DEFAULT_SETTINGS = {
  master: 80,
  sfx: 80,
  music: 60,
  ui: 45,
  muted: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    return {
      ...parsed,
      master: parsed.master <= 1 ? parsed.master * 100 : parsed.master,
      music: parsed.music <= 1 ? parsed.music * 100 : parsed.music,
      sfx: parsed.sfx <= 1 ? parsed.sfx * 100 : parsed.sfx,
      ui: parsed.ui <= 1 ? parsed.ui * 100 : parsed.ui,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
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
  const location = useLocation();
  const sound = useSound();
  const [settings, setSettings] = useState(loadSettings);
  const [showSaved, setShowSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [perfMode, setPerfModeState] = useState(getPerfMode);
  const returnPath = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
    ? location.state.from
    : '/';

  function handleBack() {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate(returnPath, { replace: true });
  }

  function handlePerfModeToggle(checked) {
    setPerfModeState(checked);
    setPerfMode(checked);
  }

  useEffect(() => {
    document.title = 'Settings — WEREWOLF';
  }, []);

  function updateValue(key, value) {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    sound.updateSettings(newSettings);
  }

  function handleSave() {
    setSaveError('');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      if (localStorage.getItem(STORAGE_KEY) !== JSON.stringify(settings)) {
        throw new Error('ไม่สามารถเขียนการตั้งค่าลงเครื่องได้');
      }
      sound.updateSettings(settings); // Ensure manager is in sync on save
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1800);
    } catch (err) {
      setShowSaved(false);
      setSaveError(err.message || 'บันทึกการตั้งค่าไม่สำเร็จ');
    }
  }

  return (
    <div className="settings-page" style={{ backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined }}>
      <div className="settings-overlay" />

      <div className="settings-container">
        <div className="settings-topbar">
          <button className="settings-back-btn" onClick={handleBack} title="ย้อนกลับ" aria-label="ย้อนกลับ">
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
            <div className="settings-divider" style={{ margin: '16px 0' }} />
            <VolumeRow
              label="UI Volume"
              value={settings.ui}
              onChange={v => updateValue('ui', v)}
              disabled={settings.muted}
            />
          </div>

          <div className="settings-divider" />

          <div className="settings-mute-row">
            <label className="mute-toggle">
              <input
                type="checkbox"
                checked={perfMode}
                onChange={e => handlePerfModeToggle(e.target.checked)}
              />
              <span>โหมดประหยัดพลัง (ลดกระตุกสำหรับคอมสเปกต่ำ)</span>
            </label>
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
            {saveError && <span className="settings-error" role="alert">{saveError}</span>}
            {showSaved && <span className="settings-saved-msg">บันทึกแล้ว</span>}
            <button className="settings-save-btn sketch-border" onClick={handleSave}>
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