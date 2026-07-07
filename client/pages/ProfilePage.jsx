import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import bgHome from '../src/assets/bgHome.png';
import '../src/styles/ProfilePage.css';

const USERNAME_COOLDOWN_DAYS = 90;

/* Default derpy wolf face — used when player hasn't set an avatar */
function DerpyWolfAvatar({ size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="65" r="42" fill="#1a1712" stroke="#c8a84a" strokeWidth="2"/>
      <path d="M28 45 L18 15 L42 38 Z" fill="#1a1712" stroke="#c8a84a" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M92 45 L102 15 L78 38 Z" fill="#1a1712" stroke="#c8a84a" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="44" cy="58" r="14" fill="#f0e8d0" stroke="#c8a84a" strokeWidth="1.5"/>
      <circle cx="76" cy="58" r="14" fill="#f0e8d0" stroke="#c8a84a" strokeWidth="1.5"/>
      <circle cx="47" cy="60" r="6" fill="#1a1208"/>
      <circle cx="73" cy="60" r="6" fill="#1a1208"/>
      <path d="M35 82 Q60 100 85 82" stroke="#c8a84a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M50 88 L52 100 L58 90" fill="#f0e8d0" stroke="#c8a84a" strokeWidth="1"/>
      <path d="M70 88 L68 100 L62 90" fill="#f0e8d0" stroke="#c8a84a" strokeWidth="1"/>
      <path d="M58 92 Q60 105 56 112 Q52 116 50 108 Q50 98 58 92 Z" fill="#c86060" stroke="#8b3a3a" strokeWidth="1"/>
    </svg>
  );
}

/* Days remaining until the account name can be changed again */
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

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const fileInputRef = useRef(null);

  const { locked: usernameLocked, daysLeft } = useUsernameCooldown(user?.usernameChangedAt);

  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [birthdate, setBirthdate] = useState(user?.birthdate || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const usernameChanged = username.trim() !== (user?.username || '');

  function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('กรุณาใส่ชื่อที่จะแสดงในเกม');
      return;
    }
    if (usernameChanged) {
      if (usernameLocked) {
        setError(`เปลี่ยนชื่อบัญชีได้อีกครั้งใน ${daysLeft} วัน`);
        return;
      }
      if (username.trim().length < 3) {
        setError('ชื่อบัญชีต้องมีอย่างน้อย 3 ตัวอักษร');
        return;
      }
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
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ ลองอีกครั้ง');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page" style={{ backgroundImage: bgHome ? `url(${bgHome})` : undefined }}>
      <div className="profile-overlay" />
      <div className="profile-fog" />

      <div className="profile-container">
        <div className="profile-topbar">
          <button className="profile-back-btn" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            กลับหน้าหลัก
          </button>
        </div>

        <div className="profile-card">
          <span className="profile-card-corner tl" />
          <span className="profile-card-corner br" />

          <h1 className="profile-title">ตัวตนของคุณในหมู่บ้าน</h1>
          <p className="profile-sub">แก้ไขได้ แต่เปลี่ยนไม่ได้ว่าใครจะเชื่อคุณ</p>

          {error && <div className="profile-error">{error}</div>}
          {saved && <div className="profile-saved">บันทึกเรียบร้อยแล้ว</div>}

          <form onSubmit={handleSave} className="profile-form">
            {/* Avatar */}
            <div className="profile-avatar-row">
              <div className="profile-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" className="profile-avatar-img" />
                  : <DerpyWolfAvatar />}
                <div className="profile-avatar-edit-badge">แก้ไข</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarPick}
                className="profile-avatar-input"
              />
              <p className="profile-avatar-hint">
                คลิกที่รูปเพื่อเปลี่ยน — ไม่เปลี่ยนก็ได้ หมาป่าหน้าโง่ก็ดูดีอยู่แล้ว
              </p>
            </div>

            {/* Display name — freely editable */}
            <div className="profile-field">
              <label className="profile-label" htmlFor="displayName">ชื่อที่แสดงในเกม</label>
              <input
                id="displayName"
                type="text"
                className="profile-input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={32}
                placeholder="ชื่อที่คนอื่นจะเห็นตอนเล่น"
              />
            </div>

            {/* Username — editable once per 90 days */}
            <div className="profile-field">
              <div className="profile-label-row">
                <label className="profile-label" htmlFor="username">ชื่อบัญชี (ใช้ล็อกอิน)</label>
                {usernameLocked && (
                  <span className="profile-cooldown">เปลี่ยนได้อีกใน {daysLeft} วัน</span>
                )}
              </div>
              <input
                id="username"
                type="text"
                className="profile-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={32}
                disabled={usernameLocked}
              />
              <span className="profile-hint">
                {usernameLocked
                  ? 'เปลี่ยนไปแล้วเมื่อไม่นานมานี้ ต้องรอให้ครบกำหนดก่อน'
                  : `เปลี่ยนได้ 1 ครั้ง จากนั้นต้องรอ ${USERNAME_COOLDOWN_DAYS} วันถึงจะเปลี่ยนได้อีก`}
              </span>
            </div>

            {/* Birthdate */}
            <div className="profile-field">
              <label className="profile-label" htmlFor="birthdate">วันเดือนปีเกิด</label>
              <input
                id="birthdate"
                type="date"
                className="profile-input"
                value={birthdate}
                onChange={e => setBirthdate(e.target.value)}
              />
            </div>

            {/* Email — simple link, no verification flow */}
            <div className="profile-field">
              <div className="profile-label-row">
                <label className="profile-label" htmlFor="email">อีเมล</label>
                <span className={`profile-email-status ${user?.email ? 'is-linked' : ''}`}>
                  {user?.email ? '● ผูกแล้ว' : '○ ยังไม่ได้ผูก'}
                </span>
              </div>
              <input
                id="email"
                type="email"
                className="profile-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
              />
              <span className="profile-email-note">
                ใช้สำหรับกู้คืนบัญชีเท่านั้น — ยังไม่มีการยืนยันอีเมลในตอนนี้
              </span>
            </div>

            <div className="profile-btn-row">
              <button type="submit" className="profile-btn-save" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </form>

          <div className="profile-divider" />

          <button className="profile-logout-btn" onClick={logout}>
            หนีแล้วหรอ?
          </button>
        </div>
      </div>
    </div>
  );
}