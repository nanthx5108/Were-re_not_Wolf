import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import bgHome from '../src/assets/bgHome.png';
import '../src/styles/Auth.css';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

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

  useEffect(() => {
    if (new URLSearchParams(location.search).get('error') === 'google_auth_failed') {
      setError('สมัครสมาชิกด้วย Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }, [location.search]);

  function handleGoogleAuth() {
    window.location.href = `/api/auth/google?from=${encodeURIComponent(from)}`;
  }

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

  const strength      = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'อ่อนแอ', 'พอใช้', 'แข็งแกร่ง'][strength];
  const strengthClass = ['', 'weak',   'fair',  'strong'][strength];

  return (
    <div
      className="auth-page"
      style={{ backgroundImage: bgHome ? `url(${bgHome})` : undefined }}
    >
      <div className="auth-overlay" />
      <div className="auth-fog" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-wolf">WE'RE</span>
          <span className="auth-logo-not"> not </span>
          <span className="auth-logo-wolf">WOLF</span>
        </div>

        <div className="auth-divider" />

        <h2 className="auth-title">เข้าร่วมหมู่บ้าน</h2>
        <p className="auth-sub">สร้างตัวตนของคุณ — แต่ระวัง ความลับมักถูกเปิดเผย</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="username">ชื่อผู้ใช้</label>
            <input
              id="username"
              type="text"
              className="auth-input"
              placeholder="3–32 ตัวอักษร"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={32}
              autoFocus
              autoComplete="username"
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
              id="password"
              type="password"
              className="auth-input"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              value={password}
              onChange={e => setPassword(e.target.value)}
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
              id="password2"
              type="password"
              className="auth-input"
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
            {password2.length > 0 && (
              <span className="auth-hint">
                {password === password2 ? '✓ รหัสผ่านตรงกัน' : '⚠ รหัสผ่านไม่ตรงกัน'}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={loading || username.trim().length < 3 || password.length < 6}
          >
            {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>
        </form>

        <div className="auth-or">หรือ</div>

        <button
          type="button"
          className="auth-btn auth-btn-google"
          onClick={handleGoogleAuth}
        >
          <GoogleIcon />
          สมัครสมาชิกด้วย Google
        </button>

        <p className="auth-switch">
          มีบัญชีอยู่แล้ว?{' '}
          <Link to="/login" state={{ from }}>เข้าสู่ระบบ</Link>
        </p>

        <div className="auth-back">
          <button className="auth-back-btn" onClick={() => navigate('/')}>
            ← กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
}