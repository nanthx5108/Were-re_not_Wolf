import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../src/styles/Auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const from         = location.state?.from || '/';

  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) return setError('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
    if (password.length < 6)        return setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    if (password !== password2)      return setError('รหัสผ่านไม่ตรงกัน');
    setLoading(true);
    try {
      await register({ username, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'อ่อนแอ', 'พอใช้', 'แข็งแกร่ง'][strength];
  const strengthClass = ['', 'weak',   'fair',  'strong'][strength];

  return (
    <div className="auth-page">
      <div className="auth-backdrop" />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-wolf">WE'RE</span>
          <span className="auth-logo-not"> not </span>
          <span className="auth-logo-wolf">WOLF</span>
        </div>

        <h2 className="auth-title">เข้าร่วมเกาะ</h2>
        <p className="auth-sub">สร้างตัวตนของคุณ — แต่ระวัง ความลับมักถูกเปิดเผย</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="username">ชื่อผู้ใช้</label>
            <input
              id="username" type="text" className="auth-input"
              placeholder="3–32 ตัวอักษร"
              value={username} onChange={e => setUsername(e.target.value)}
              maxLength={32} autoFocus autoComplete="username"
            />
            {username.length > 0 && (
              <span className="auth-hint">
                {username.trim().length < 3
                  ? `⚠ ต้องการอีก ${3 - username.trim().length} ตัว`
                  : '✓ โอเค'}
              </span>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">รหัสผ่าน</label>
            <input
              id="password" type="password" className="auth-input"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {strength > 0 && (
              <div className="auth-strength">
                <div className={`auth-strength-bar ${strengthClass}`} />
                <span className="auth-hint">{strengthLabel}</span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password2">ยืนยันรหัสผ่าน</label>
            <input
              id="password2" type="password" className="auth-input"
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
              value={password2} onChange={e => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
            {password2.length > 0 && (
              <span className="auth-hint">
                {password === password2 ? '✓ รหัสผ่านตรงกัน' : '⚠ รหัสผ่านไม่ตรงกัน'}
              </span>
            )}
          </div>

          <button
            type="submit" className="auth-btn auth-btn-primary"
            disabled={loading || username.trim().length < 3 || password.length < 6}
          >
            {loading ? 'กำลังสมัคร...' : '🌴 สมัครสมาชิก'}
          </button>
        </form>

        <p className="auth-switch">
          มีบัญชีอยู่แล้ว? <Link to="/login" state={{ from }}>เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  );
}