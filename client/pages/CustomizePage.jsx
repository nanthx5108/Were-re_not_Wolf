import React from 'react';
import { useNavigate } from 'react-router-dom';
import bgHome from '../src/assets/bgHome.jpg';
import '../src/styles/HomePage.css';

export default function CustomizePage() {
  const navigate = useNavigate();

  return (
    <div className="home-page" style={{ backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined }}>
      <div className="home-overlay" />
      <div className="home-fog" />
      <div className="home-container">
        <div className="home-header">
          <h1 className="home-title">Customize</h1>
        </div>
        <div className="panel-box">
          <p style={{ color: 'var(--color-text)', marginBottom: '24px' }}>
            ปรับแต่งโปรไฟล์ หรือการตั้งค่าอื่น ๆ ที่นี่
          </p>
          <button className="btn-back" type="button" onClick={() => navigate('/')}>กลับหน้าหลัก</button>
        </div>
      </div>
    </div>
  );
}
