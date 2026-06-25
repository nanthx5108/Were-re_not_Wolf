import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../src/styles/Auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

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
    <div className="auth-page">
      <div className="auth-backdrop" />
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-wolf">WE'RE</span>
          <span className="auth-logo-not"> not </span>
          <span className="auth-logo-wolf">WOLF</span>
        </div>

        <h2 className="auth-title">เข้าสู่เกาะ</h2>
        <p className="auth-sub">ใครเชื่อถือได้บ้าง? เข้าสู่ระบบเพื่อเล่น</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="username">ชื่อผู้ใช้</label>
            <input
              id="username" type="text" className="auth-input"
              placeholder="ชื่อที่คนอื่นจะเห็น..."
              value={username} onChange={e => setUsername(e.target.value)}
              maxLength={32} autoFocus autoComplete="username"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">รหัสผ่าน</label>
            <input
              id="password" type="password" className="auth-input"
              placeholder="รหัสลับของคุณ..."
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit" className="auth-btn auth-btn-primary"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : '🏝️ เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="auth-switch">
          ยังไม่มีบัญชี? <Link to="/register" state={{ from }}>สมัครสมาชิก</Link>
        </p>
      </div>
    </div>
  );
}