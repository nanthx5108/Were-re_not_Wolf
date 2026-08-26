import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.jsx';
import bgHome from '../src/assets/bgHome.jpg';
import '../src/styles/ProfilePage.css';

const USERNAME_COOLDOWN_DAYS = 90;
const MAX_BIRTH_YEAR = 2026;
const MIN_BIRTH_YEAR = 1950;

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function daysInMonth(month, year) {
  if (!month || !year) return 31;
  return new Date(year, month, 0).getDate();
}

function parseBirthdate(str) {
  if (!str) return { day: '', month: '', year: '' };
  const [y, m, d] = String(str).slice(0, 10).split('-');
  return { day: Number(d) || '', month: Number(m) || '', year: Number(y) || '' };
}

function buildBirthdate(day, month, year) {
  if (!day || !month || !year) return '';
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/* Default derpy wolf face — used when player hasn't set an avatar */
function DerpyWolfAvatar({ size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="65" r="42" fill="#1a1712" stroke="#9fbcd0" strokeWidth="2"/>
      <path d="M28 45 L18 15 L42 38 Z" fill="#1a1712" stroke="#9fbcd0" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M92 45 L102 15 L78 38 Z" fill="#1a1712" stroke="#9fbcd0" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="44" cy="58" r="14" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1.5"/>
      <circle cx="76" cy="58" r="14" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1.5"/>
      <circle cx="47" cy="60" r="6" fill="#1a1208"/>
      <circle cx="73" cy="60" r="6" fill="#1a1208"/>
      <path d="M35 82 Q60 100 85 82" stroke="#9fbcd0" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M50 88 L52 100 L58 90" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1"/>
      <path d="M70 88 L68 100 L62 90" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1"/>
      <path d="M58 92 Q60 105 56 112 Q52 116 50 108 Q50 98 58 92 Z" fill="#c86060" stroke="#8b3a3a" strokeWidth="1"/>
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}

function ConfirmModal({ open, title, message, confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก', danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="profile-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <h3 className="profile-modal-title">{title}</h3>
        <p className="profile-modal-message">{message}</p>
        <div className="profile-modal-actions">
          <button className="profile-modal-btn-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`profile-modal-btn-confirm ${danger ? 'is-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBirthdate(day, month, year) {
  if (!day || !month || !year) return '';
  return `${day} ${THAI_MONTHS[month - 1]} ${year}`;
}

function ProfileField({
  name, label, labelFor, aside,
  active, onActivate,
  unlocked, onEdit, editDisabled, editTitle,
  readView, editView, note,
}) {
  return (
    <div
      className={`profile-field ${active ? 'is-active' : ''}`}
      onClick={() => onActivate(name)}
    >
      <div className="profile-label-row">
        <label className="profile-label" htmlFor={labelFor}>{label}</label>
        {aside}
      </div>

      {unlocked ? editView : (
        <div className="profile-readrow">
          <span className={`profile-readvalue ${readView ? '' : 'is-empty'}`}>
            {readView || 'ยังไม่ได้ตั้ง'}
          </span>
          {active && (
            <button
              type="button"
              className="profile-icon-btn"
              onClick={e => { e.stopPropagation(); onEdit(); }}
              disabled={editDisabled}
              title={editTitle}
            >
              <IconEdit />
            </button>
          )}
        </div>
      )}

      {note}
    </div>
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

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);

  const { locked: usernameOnCooldown, daysLeft } = useUsernameCooldown(user?.usernameChangedAt);

  const initialBirth = parseBirthdate(user?.birthdate);

  const [username, setUsername] = useState(user?.username || '');
  const [usernameUnlocked, setUsernameUnlocked] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || '');
  const [day, setDay] = useState(initialBirth.day);
  const [month, setMonth] = useState(initialBirth.month);
  const [year, setYear] = useState(initialBirth.year);
  const [email, setEmail] = useState(user?.email || '');
  const [emailLinked, setEmailLinked] = useState(!!user?.email);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null); // 'edit-username' | 'link-email' | 'reset' | null

  const [activeField, setActiveField] = useState(null);
  const [unlocked, setUnlocked] = useState({});
  const unlock = (name) => setUnlocked(prev => ({ ...prev, [name]: true }));

  const [viewerOpen, setViewerOpen] = useState(false);

  const usernameChanged = username.trim() !== (user?.username || '');
  const birthdate = buildBirthdate(day, month, year);

  const years = useMemo(() => {
    const arr = [];
    for (let y = MAX_BIRTH_YEAR; y >= MIN_BIRTH_YEAR; y--) arr.push(y);
    return arr;
  }, []);

  const dayCount = daysInMonth(month, year);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleAvatarError() {
    setAvatarPreview(null);
    setAvatarFile(null);
  }

  function requestEditUsername() {
    if (usernameOnCooldown) return;
    setModal('edit-username');
  }
  function confirmEditUsername() {
    setUsernameUnlocked(true);
    unlock('username');
    setModal(null);
  }

  function requestLinkEmail() {
    if (!email.trim()) {
      setError('กรุณาใส่อีเมลก่อน');
      return;
    }
    setModal('link-email');
  }
  function confirmLinkEmail() {
    setEmailLinked(true);
    setModal(null);
  }

  function requestReset() {
    setModal('reset');
  }
  function confirmReset() {
    setUsername(user?.username || '');
    setUsernameUnlocked(false);
    setDisplayName(user?.displayName || user?.username || '');
    const b = parseBirthdate(user?.birthdate);
    setDay(b.day); setMonth(b.month); setYear(b.year);
    setEmail(user?.email || '');
    setEmailLinked(!!user?.email);
    setAvatarPreview(user?.avatarUrl || null);
    setAvatarFile(null);
    setError('');
    setModal(null);
    setUnlocked({});
    setActiveField(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('กรุณาใส่ชื่อที่จะแสดงในเกม');
      return;
    }
    if (usernameChanged) {
      if (usernameOnCooldown) {
        setError(`เปลี่ยนชื่อบัญชีได้อีกครั้งใน ${daysLeft} วัน`);
        return;
      }
      if (username.trim().length < 3) {
        setError('ชื่อบัญชีต้องมีอย่างน้อย 3 ตัวอักษร');
        return;
      }
    }
    if (year && year > MAX_BIRTH_YEAR) {
      setError(`ปีเกิดต้องไม่เกิน ${MAX_BIRTH_YEAR}`);
      return;
    }

    setSaving(true);
    try {
      if (typeof updateProfile === 'function') {
        await updateProfile({
          username: usernameChanged ? username.trim() : undefined,
          displayName: displayName.trim(),
          birthdate: birthdate || undefined,
          email: emailLinked ? email.trim() : undefined,
          avatarFile,
        });
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ ลองอีกครั้ง');
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
          <h1 className="profile-title">บัญชีของคุณ</h1>

          {error && <div className="profile-error">{error}</div>}

          <form onSubmit={handleSave} className="profile-form">
            {/* Avatar */}
            <div className="profile-avatar-row">
              <div className="profile-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" className="profile-avatar-img" onError={handleAvatarError} />
                  : <DerpyWolfAvatar />}
                <div className="profile-avatar-edit-badge">เปลี่ยนรูป</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarPick}
                className="profile-avatar-input"
              />
              <p className="profile-avatar-hint">
                คลิกที่รูปเพื่อเปลี่ยนรูป หรือ
                <button type="button" className="profile-view-link" onClick={() => setViewerOpen(true)}>
                  กดดูรูป
                </button>
              </p>
            </div>

            <ProfileField
              name="displayName"
              label="ชื่อที่แสดงในเกม"
              labelFor="displayName"
              active={activeField === 'displayName'}
              onActivate={setActiveField}
              unlocked={!!unlocked.displayName}
              onEdit={() => unlock('displayName')}
              editTitle="แก้ไขชื่อที่แสดงในเกม"
              readView={displayName}
              editView={
                <input
                  id="displayName"
                  type="text"
                  className="profile-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={32}
                  placeholder="ชื่อที่คนอื่นจะเห็นตอนเล่น"
                  autoFocus
                />
              }
            />

            <ProfileField
              name="username"
              label="ชื่อบัญชี (ใช้ล็อกอิน)"
              labelFor="username"
              aside={usernameOnCooldown && (
                <span className="profile-cooldown">เปลี่ยนได้อีกใน {daysLeft} วัน</span>
              )}
              active={activeField === 'username'}
              onActivate={setActiveField}
              unlocked={usernameUnlocked}
              onEdit={requestEditUsername}
              editDisabled={usernameOnCooldown}
              editTitle={usernameOnCooldown ? `รออีก ${daysLeft} วัน` : 'แก้ไขชื่อบัญชี'}
              readView={username}
              editView={
                <input
                  id="username"
                  type="text"
                  className="profile-input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  maxLength={32}
                  autoFocus
                />
              }
            />

            <ProfileField
              name="birthdate"
              label="วันเดือนปีเกิด"
              active={activeField === 'birthdate'}
              onActivate={setActiveField}
              unlocked={!!unlocked.birthdate}
              onEdit={() => unlock('birthdate')}
              editTitle="แก้ไขวันเดือนปีเกิด"
              readView={formatBirthdate(day, month, year)}
              editView={
                <div className="profile-birthdate-row">
                  <select
                    className="profile-select"
                    value={day}
                    onChange={e => setDay(Number(e.target.value))}
                  >
                    <option value="">วัน</option>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    className="profile-select profile-select-month"
                    value={month}
                    onChange={e => setMonth(Number(e.target.value))}
                  >
                    <option value="">เดือน</option>
                    {THAI_MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="profile-select"
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                  >
                    <option value="">ปี</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              }
              note={unlocked.birthdate && (
                <span className="profile-hint">เลือกได้ถึงปี {MAX_BIRTH_YEAR} เท่านั้น</span>
              )}
            />

            <ProfileField
              name="email"
              label="อีเมล"
              labelFor="email"
              aside={
                <span className={`profile-email-status ${emailLinked ? 'is-linked' : ''}`}>
                  {emailLinked ? '● ผูกแล้ว' : '○ ยังไม่ได้ผูก'}
                </span>
              }
              active={activeField === 'email'}
              onActivate={setActiveField}
              unlocked={!!unlocked.email}
              onEdit={() => unlock('email')}
              editTitle="แก้ไขอีเมล"
              readView={email}
              editView={
                <div className="profile-input-with-btn">
                  <input
                    id="email"
                    type="email"
                    className="profile-input"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailLinked(false); }}
                    placeholder="example@email.com"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="profile-link-btn"
                    onClick={requestLinkEmail}
                    disabled={!email.trim() || emailLinked}
                  >
                    {emailLinked ? 'ผูกแล้ว' : 'ผูกอีเมล'}
                  </button>
                </div>
              }
              note={unlocked.email && (
                <span className="profile-email-note">ใช้สำหรับกู้คืนบัญชีเท่านั้น</span>
              )}
            />

            <div className="profile-btn-row">
              <button type="submit" className="profile-btn-save" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </form>

          <div className="profile-divider" />

          <button className="profile-logout-btn" onClick={requestReset}>
            รีเซ็ตการเปลี่ยนแปลง
          </button>
        </div>
      </div>

      {viewerOpen && (
        <div className="profile-viewer-overlay" onClick={() => setViewerOpen(false)}>
          <div className="profile-viewer" onClick={e => e.stopPropagation()}>
            <div className="profile-viewer-img">
              {avatarPreview
                ? <img src={avatarPreview} alt="รูปโปรไฟล์" onError={handleAvatarError} />
                : <DerpyWolfAvatar size={220} />}
            </div>
            <div className="profile-viewer-actions">
              <button
                type="button"
                className="profile-viewer-edit"
                onClick={() => { setViewerOpen(false); fileInputRef.current?.click(); }}
              >
                แก้ไขรูปโปรไฟล์
              </button>
              <button
                type="button"
                className="profile-viewer-close"
                onClick={() => setViewerOpen(false)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modal === 'edit-username'}
        title="แก้ไขชื่อบัญชี?"
        message={`คุณสามารถเปลี่ยนชื่อบัญชีได้ทุกๆ ${USERNAME_COOLDOWN_DAYS} วัน หากยืนยันการเปลี่ยนแปลง คุณจะต้องรออีกครั้งตามกำหนด`}
        confirmLabel="แก้ไขเลย"
        onConfirm={confirmEditUsername}
        onCancel={() => setModal(null)}
      />

      <ConfirmModal
        open={modal === 'link-email'}
        title="ผูกอีเมลนี้?"
        message={`ยืนยันที่จะผูกอีเมล "${email}" เข้ากับบัญชีนี้`}
        confirmLabel="ผูกเลย"
        onConfirm={confirmLinkEmail}
        onCancel={() => setModal(null)}
      />

      <ConfirmModal
        open={modal === 'reset'}
        title="ล้างสิ่งที่แก้ไขทั้งหมด?"
        message="ข้อมูลที่ยังไม่ได้บันทึกจะหายไปทั้งหมด กลับไปเป็นค่าเดิมก่อนหน้านี้"
        confirmLabel="ล้างเลย"
        danger
        onConfirm={confirmReset}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}