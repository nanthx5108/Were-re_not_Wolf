import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import bgHome from '../src/assets/bgHome.jpg';
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

export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const from        = location.state?.from || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('error') === 'google_auth_failed') {
      setError('เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }, [location.search]);

  function handleGoogleAuth() {
    window.location.href = `/api/auth/google?from=${encodeURIComponent(from)}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true); setError('');
    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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

        <h2 className="auth-title">เข้าสู่ระบบ</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="username">ชื่อผู้ใช้</label>
            <input
              id="username"
              type="text"
              className="auth-input"
              placeholder="ชื่อที่คนอื่นจะเห็น..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={32}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder="รหัสลับที่คุณซ่อนไว้..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? 'กำลังเข้าสู่หมู่บ้าน...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="auth-or">หรือ</div>

        <button
          type="button"
          className="auth-btn auth-btn-google"
          onClick={handleGoogleAuth}
        >
          <GoogleIcon />
          เข้าสู่ระบบด้วย Google
        </button>

        <p className="auth-switch">
          ยังไม่มีบัญชี?{' '}
          <Link to="/register" state={{ from }}>สมัครสมาชิก</Link>
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