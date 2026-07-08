import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import bgHome from '../src/assets/bgHome.png';
import '../src/styles/AccountSettingsPage.css';

const USERNAME_COOLDOWN_DAYS = 90;
const MAX_BIRTHDATE_YEAR = 2026;
const MONTHS = [
  { value: '01', label: 'มกราคม' },
  { value: '02', label: 'กุมภาพันธ์' },
  { value: '03', label: 'มีนาคม' },
  { value: '04', label: 'เมษายน' },
  { value: '05', label: 'พฤษภาคม' },
  { value: '06', label: 'มิถุนายน' },
  { value: '07', label: 'กรกฎาคม' },
  { value: '08', label: 'สิงหาคม' },
  { value: '09', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' },
];

function DerpyWolfAvatar({ size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="65" r="42" fill="#1a1712" stroke="#9fbcd0" strokeWidth="2" />
      <path d="M28 45 L18 15 L42 38 Z" fill="#1a1712" stroke="#9fbcd0" strokeWidth="2" strokeLinejoin="round" />
      <path d="M92 45 L102 15 L78 38 Z" fill="#1a1712" stroke="#9fbcd0" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="44" cy="58" r="14" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1.5" />
      <circle cx="76" cy="58" r="14" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1.5" />
      <circle cx="47" cy="60" r="6" fill="#1a1208" />
      <circle cx="73" cy="60" r="6" fill="#1a1208" />
      <path d="M35 82 Q60 100 85 82" stroke="#9fbcd0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M50 88 L52 100 L58 90" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1" />
      <path d="M70 88 L68 100 L62 90" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1" />
      <path d="M58 92 Q60 105 56 112 Q52 116 50 108 Q50 98 58 92 Z" fill="#c86060" stroke="#8b3a3a" strokeWidth="1" />
    </svg>
  );
}

function useUsernameCooldown(lastChangedAt) {
  return useMemo(() => {
    if (!lastChangedAt) return { locked: false, daysLeft: 0 };
    const last = new Date(lastChangedAt).getTime();
    const now = Date.now();
    const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    const daysLeft = USERNAME_COOLDOWN_DAYS - daysSince;
    return { locked: daysLeft > 0, daysLeft: Math.max(daysLeft, 0) };
  }, [lastChangedAt]);
}

function parseBirthdate(value) {
  if (!value) return { year: '', month: '', day: '' };
  const [year, month, day] = value.split('-');
  return { year: year || '', month: month || '', day: day || '' };
}

function buildBirthdate({ year, month, day }) {
  if (!year || !month || !day) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function getDaysInMonth(year, month) {
  const monthIndex = Number(month);
  if (!year || !monthIndex) return 31;
  return new Date(Number(year), monthIndex, 0).getDate();
}

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);

  const { locked: usernameLocked, daysLeft } = useUsernameCooldown(user?.usernameChangedAt);

  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [birthdate, setBirthdate] = useState(user?.birthdate || '');
  const [birthdateParts, setBirthdateParts] = useState(parseBirthdate(user?.birthdate || ''));
  const [email, setEmail] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [usernameEditRequested, setUsernameEditRequested] = useState(false);
  const [usernameConfirmOpen, setUsernameConfirmOpen] = useState(false);
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [emailPending, setEmailPending] = useState('');
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  useEffect(() => {
    setUsername(user?.username || '');
    setDisplayName(user?.displayName || user?.username || '');
    setBirthdate(user?.birthdate || '');
    setBirthdateParts(parseBirthdate(user?.birthdate || ''));
    setEmail(user?.email || '');
    setAvatarPreview(user?.avatarUrl || null);
    setAvatarFile(null);
    setUsernameEditRequested(false);
    setUsernameConfirmOpen(false);
    setEmailConfirmOpen(false);
    setEmailPending('');
    setEmailConfirmed(false);
    setError('');
  }, [user?.id]);

  const usernameChanged = username.trim() !== (user?.username || '');
  const emailChanged = email.trim() !== (user?.email || '');
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const usernameEditable = !usernameLocked || usernameEditRequested;
  const dayCount = getDaysInMonth(birthdateParts.year, birthdateParts.month);

  function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleBirthdatePartChange(part, value) {
    const next = { ...birthdateParts, [part]: value };
    setBirthdateParts(next);
    setBirthdate(buildBirthdate(next));
  }

  function resetForm() {
    setUsername(user?.username || '');
    setDisplayName(user?.displayName || user?.username || '');
    setBirthdate(user?.birthdate || '');
    setBirthdateParts(parseBirthdate(user?.birthdate || ''));
    setEmail(user?.email || '');
    setAvatarPreview(user?.avatarUrl || null);
    setAvatarFile(null);
    setError('');
    setSaved(false);
    setUsernameEditRequested(false);
    setUsernameConfirmOpen(false);
    setEmailConfirmOpen(false);
    setEmailPending('');
    setEmailConfirmed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleUsernameEditRequest() {
    if (!usernameLocked) {
      setUsernameEditRequested(true);
      return;
    }
    setUsernameConfirmOpen(true);
  }

  function confirmUsernameEdit() {
    setUsernameConfirmOpen(false);
    setUsernameEditRequested(true);
  }

  function handleEmailChange(e) {
    const value = e.target.value;
    setEmail(value);
    setEmailConfirmed(false);

    const trimmed = value.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed === (user?.email || '')) {
      setEmailConfirmOpen(false);
      setEmailPending('');
      return;
    }

    setEmailPending(trimmed);
    setEmailConfirmOpen(true);
  }

  function confirmEmail() {
    setEmail(emailPending);
    setEmailConfirmed(true);
    setEmailConfirmOpen(false);
    setEmailPending('');
  }

  function cancelEmail() {
    setEmail(user?.email || '');
    setEmailConfirmed(false);
    setEmailConfirmOpen(false);
    setEmailPending('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('กรุณาใส่ชื่อที่จะแสดงในเกม');
      return;
    }
    if (usernameChanged) {
      if (usernameLocked && !usernameEditRequested) {
        setError(`เปลี่ยนชื่อบัญชีได้อีกครั้งใน ${daysLeft} วัน`);
        return;
      }
      if (username.trim().length < 3) {
        setError('ชื่อบัญชีต้องมีอย่างน้อย 3 ตัวอักษร');
        return;
      }
    }

    if (emailChanged && !emailConfirmed) {
      setError('กรุณายืนยันอีเมลก่อนบันทึก');
      setEmailConfirmOpen(true);
      return;
    }

    setSaving(true);
    try {
      if (typeof updateProfile === 'function') {
        await updateProfile({
          username: usernameChanged ? username.trim() : undefined,
          displayName: displayName.trim(),
          birthdate,
          email: email.trim() || undefined,
          avatarFile,
        });
      }
      setSaved(true);
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ ลองอีกครั้ง');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page" style={{ backgroundImage: bgHome ? `url(${bgHome})` : undefined }}>
      <div className="settings-overlay" />
      <div className="settings-fog" />

      <div className="settings-container">
        <div className="settings-topbar">
          <button className="settings-back-btn" onClick={() => navigate('/profile')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            กลับ
          </button>
        </div>

        <div className="settings-card">
          <span className="settings-card-corner tl" />
          <span className="settings-card-corner br" />

          <h1 className="settings-title">ตั้งค่าบัญชี</h1>
          <p className="settings-sub">แก้ไขข้อมูลส่วนตัวของคุณ</p>

          {error && <div className="settings-error">{error}</div>}
          {saved && <div className="settings-saved">บันทึกเรียบร้อยแล้ว</div>}

          <form onSubmit={handleSave} className="settings-form">
            <div className="settings-avatar-row">
              <div className="settings-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" className="settings-avatar-img" />
                  : <DerpyWolfAvatar />}
                <div className="settings-avatar-edit-badge">แก้ไข</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarPick}
                className="settings-avatar-input"
              />
              <p className="settings-avatar-hint">
                คลิกที่รูปเพื่อเปลี่ยน — ไม่เปลี่ยนก็ได้
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label" htmlFor="displayName">ชื่อที่แสดงในเกม</label>
              <input
                id="displayName"
                type="text"
                className="settings-input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={32}
                placeholder="ชื่อที่คนอื่นจะเห็นตอนเล่น"
              />
            </div>

            <div className="settings-field">
              <div className="settings-label-row">
                <label className="settings-label" htmlFor="username">ชื่อบัญชี (ใช้ล็อกอิน)</label>
                {usernameLocked && !usernameEditRequested && (
                  <button type="button" className="settings-inline-action" onClick={handleUsernameEditRequest}>
                    แก้ไขชื่อบัญชี
                  </button>
                )}
              </div>
              <input
                id="username"
                type="text"
                className="settings-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={32}
                disabled={!usernameEditable}
              />
              {usernameConfirmOpen && (
                <div className="settings-confirm-panel">
                  <p>ต้องการเปิดการแก้ไขชื่อบัญชีใช่หรือไม่? หลังจากยืนยัน ชื่อบัญชีจะถูกล็อกไว้เป็นเวลา 90 วัน</p>
                  <div className="settings-confirm-actions">
                    <button type="button" className="settings-confirm-btn" onClick={confirmUsernameEdit}>ยืนยัน</button>
                    <button type="button" className="settings-cancel-btn" onClick={() => setUsernameConfirmOpen(false)}>ยกเลิก</button>
                  </div>
                </div>
              )}
              <span className="settings-hint">
                {usernameLocked && !usernameEditRequested
                  ? ' กดปุ่มแก้ไขชื่อบัญชีด้านบนเพื่อยืนยันการเปลี่ยนแปลง'
                  : `เปลี่ยนได้ 1 ครั้ง จากนั้นต้องรอ ${USERNAME_COOLDOWN_DAYS} วันถึงจะเปลี่ยนได้อีก`}
              </span>
            </div>

            <div className="settings-field">
              <label className="settings-label">วันเดือนปีเกิด</label>
              <div className="settings-date-picker">
                <select
                  className="settings-date-select"
                  value={birthdateParts.day}
                  onChange={e => handleBirthdatePartChange('day', e.target.value)}
                >
                  <option value="">วัน</option>
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map(day => (
                    <option key={day} value={String(day).padStart(2, '0')}>{day}</option>
                  ))}
                </select>
                <select
                  className="settings-date-select"
                  value={birthdateParts.month}
                  onChange={e => handleBirthdatePartChange('month', e.target.value)}
                >
                  <option value="">เดือน</option>
                  {MONTHS.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
                <select
                  className="settings-date-select"
                  value={birthdateParts.year}
                  onChange={e => handleBirthdatePartChange('year', e.target.value)}
                >
                  <option value="">ปี</option>
                  {Array.from({ length: MAX_BIRTHDATE_YEAR - 1900 + 1 }, (_, i) => 1900 + i).map(year => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </select>
              </div>
              <span className="settings-hint">เลือกวันเกิดได้ถึงปี {MAX_BIRTHDATE_YEAR}</span>
            </div>

            <div className="settings-field">
              <div className="settings-label-row">
                <label className="settings-label" htmlFor="email">อีเมล</label>
                <span className={`settings-email-status ${user?.email ? 'is-linked' : ''}`}>
                  {user?.email ? '● ผูกแล้ว' : '○ ยังไม่ได้ผูก'}
                </span>
              </div>
              <input
                id="email"
                type="email"
                className="settings-input"
                value={email}
                onChange={handleEmailChange}
                placeholder="example@email.com"
              />
              {emailConfirmOpen && emailPending && (
                <div className="settings-confirm-panel">
                  <p>ยืนยันที่จะผูกอีเมล <strong>{emailPending}</strong> ใช่หรือไม่?</p>
                  <div className="settings-confirm-actions">
                    <button type="button" className="settings-confirm-btn" onClick={confirmEmail}>ยืนยัน</button>
                    <button type="button" className="settings-cancel-btn" onClick={cancelEmail}>ยกเลิก</button>
                  </div>
                </div>
              )}
              <span className="settings-email-note">
                {emailIsValid && emailChanged && !emailConfirmed
                  ? 'กรอกอีเมลเรียบร้อยแล้ว ให้ยืนยันก่อนบันทึก'
                  : 'ใช้สำหรับกู้คืนบัญชีเท่านั้น'}
              </span>
            </div>

            <div className="settings-btn-row">
              <button type="submit" className="settings-btn-save" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </form>

          <div className="settings-divider" />

          <button className="settings-reset-btn" onClick={resetForm}>
            รีเซ็ตค่าที่แก้ไข
          </button>
        </div>
      </div>
    </div>
  );
}
