import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../src/styles/HomePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="home-page">
      <div className="home-container" style={{ paddingTop: '120px' }}>
        <h2 style={{ marginBottom: 12 }}>โปรไฟล์ผู้เล่น</h2>
        <div style={{ maxWidth: 720 }}>
          <p>ชื่อผู้ใช้: {user?.username ?? 'ยังไม่ได้เข้าสู่ระบบ'}</p>
          <p>ระดับ: {user?.level ?? '-'}</p>
          <button className="btn-back" onClick={() => navigate(-1)}>กลับ</button>
        </div>
      </div>
    </div>
  );
}
