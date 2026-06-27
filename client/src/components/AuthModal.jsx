import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/AuthModel.css';

export default function AuthModal({ onClose, message }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function goLogin()    { onClose(); navigate('/login',    { state: { from: location.pathname } }); }
  function goRegister() { onClose(); navigate('/register', { state: { from: location.pathname } }); }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-icon">W</div>
        <h3 className="modal-title">ต้องเข้าสู่ระบบก่อน</h3>
        <p className="modal-body">
          {message || 'คุณต้องเข้าสู่ระบบก่อนจึงจะสร้างหรือเข้าร่วมห้องได้'}
        </p>
        <div className="modal-actions">
          <button className="modal-btn modal-btn-primary"   onClick={goLogin}>เข้าสู่ระบบ</button>
          <button className="modal-btn modal-btn-secondary" onClick={goRegister}>สมัครสมาชิก</button>
        </div>
        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}