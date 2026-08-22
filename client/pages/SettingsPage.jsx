import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSound } from '../src/context/SoundContext.jsx';
import { getPerfMode, setPerfMode } from '../src/utils/perfMode.js';
import { getMicSettings, setMicSettings } from '../src/utils/micSettings.js';
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
  const sound = useSound();
  const [settings, setSettings] = useState(loadSettings);
  const [showSaved, setShowSaved] = useState(false);
  const [perfMode, setPerfModeState] = useState(getPerfMode);
  const [micSettings, setMicSettingsState] = useState(getMicSettings);
  const [listeningForKey, setListeningForKey] = useState(false);

  function handlePerfModeToggle(checked) {
    setPerfModeState(checked);
    setPerfMode(checked);
  }

  function handleMicModeChange(mode) {
    setMicSettingsState(setMicSettings({ mode }));
  }

  useEffect(() => {
    if (!listeningForKey) return;
    function onKeyDown(e) {
      e.preventDefault();
      setMicSettingsState(setMicSettings({ pttKey: e.code }));
      setListeningForKey(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [listeningForKey]);

  useEffect(() => {
    document.title = 'Settings — WEREWOLF';
  }, []);

  function updateValue(key, value) {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    sound.updateSettings(newSettings);
  }

  function handleSave() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      sound.updateSettings(settings); // Ensure manager is in sync on save
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
          <button className="settings-back-btn" onClick={() => navigate('/')} title="กลับหน้าหลัก" aria-label="กลับหน้าหลัก">
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
                checked={perfMode}
                onChange={e => handlePerfModeToggle(e.target.checked)}
              />
              <span>โหมดประหยัดพลัง (ลดกระตุกสำหรับคอมสเปกต่ำ)</span>
            </label>
          </div>

          <div className="settings-divider" />

          <div className="settings-mic-row">
            <span className="field-label">โหมดไมค์</span>
            <div className="mode-options" style={{ marginTop: 8 }}>
              <div
                className={`mode-card ${micSettings.mode === 'toggle' ? 'is-active' : ''}`}
                onClick={() => handleMicModeChange('toggle')}
              >
                <span className="mode-card-title">กดทีเดียวเปิด-ปิด</span>
                <span className="mode-card-desc">กดปุ่มครั้งเดียวเพื่อเปิด/ปิดไมค์ ไม่ต้องกดค้าง</span>
              </div>
              <div
                className={`mode-card ${micSettings.mode === 'ptt' ? 'is-active' : ''}`}
                onClick={() => handleMicModeChange('ptt')}
              >
                <span className="mode-card-title">กดค้างเพื่อพูด</span>
                <span className="mode-card-desc">ปล่อยปุ่มแล้วไมค์ปิดทันที (Push-to-talk)</span>
              </div>
            </div>

            {micSettings.mode === 'ptt' && (
              <div style={{ marginTop: 10 }}>
                <span className="field-label">ปุ่มที่ใช้กดค้าง</span>
                <button
                  type="button"
                  className="btn-back"
                  style={{ marginTop: 6 }}
                  onClick={() => setListeningForKey(true)}
                >
                  {listeningForKey ? 'กดปุ่มที่ต้องการ…' : micSettings.pttKey}
                </button>
              </div>
            )}
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