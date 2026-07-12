import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { STARTING_LEVEL } from '../../shared/leveling.js';
import bgHome from '../src/assets/bgHome.png';
import '../src/styles/ViewProfilePage.css';

function DerpyWolfAvatar({ size = 120 }) {
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

export default function ViewProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getDisplayValue = (value, fallback = 'ยังไม่ได้ระบุ') => {
    return (value && value.trim()) || fallback;
  };

  const formatBirthdate = (birthdate) => {
    if (!birthdate) return 'ยังไม่ได้ระบุ';
    const [year, month, day] = birthdate.split('-');
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${day} ${months[Number(month) - 1]} ${Number(year) + 543}`;
  };

  return (
    <div className="view-profile-page" style={{ backgroundImage: bgHome ? `url(${bgHome})` : undefined }}>
      <div className="view-profile-overlay" />
      <div className="view-profile-fog" />

      <div className="view-profile-container">
        <div className="view-profile-topbar">
          <button className="view-profile-back-btn" onClick={() => navigate('/profile')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            กลับ
          </button>
        </div>

        <div className="view-profile-card">
          <span className="view-profile-card-corner tl" />
          <span className="view-profile-card-corner br" />

          <h1 className="view-profile-title">ตัวตนของคุณ</h1>
          <p className="view-profile-sub">ข้อมูลส่วนตัวในหมู่บ้าน</p>

          <div className="view-profile-avatar-row">
            <div className="view-profile-avatar-wrap">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" className="view-profile-avatar-img" />
                : <DerpyWolfAvatar />}
            </div>
          </div>

          <div className="view-profile-content">
            {/* ชื่อบัญชี */}
            <div className="view-profile-field">
              <div className="view-profile-field-label">ชื่อบัญชี</div>
              <div className="view-profile-field-value">{user?.username || 'ยังไม่ได้ระบุ'}</div>
            </div>

            {/* ชื่อที่แสดงในเกม */}
            <div className="view-profile-field">
              <div className="view-profile-field-label">ชื่อที่แสดงในเกม</div>
              <div className="view-profile-field-value">{getDisplayValue(user?.displayName)}</div>
            </div>

            {/* วันเดือนปีเกิด */}
            <div className="view-profile-field">
              <div className="view-profile-field-label">วันเดือนปีเกิด</div>
              <div className="view-profile-field-value">{formatBirthdate(user?.birthdate)}</div>
            </div>

            {/* อีเมล */}
            <div className="view-profile-field">
              <div className="view-profile-field-label">อีเมล</div>
              <div className={`view-profile-field-value ${user?.email ? 'is-linked' : 'is-empty'}`}>
                {user?.email || 'ยังไม่ได้ผูกอีเมล'}
              </div>
            </div>

            {/* สถิติเกม */}
            <div className="view-profile-field">
              <div className="view-profile-field-label">จำนวนเกมที่เล่น</div>
              <div className="view-profile-field-value">{user?.gamesPlayed || 0} เกม</div>
            </div>

            {/* ระดับ */}
            <div className="view-profile-field">
              <div className="view-profile-field-label">ระดับ</div>
              <div className="view-profile-field-value level">{user?.level ?? STARTING_LEVEL}</div>
            </div>
          </div>

          <div className="view-profile-divider" />

          <div className="view-profile-btn-row">
            <button className="view-profile-btn-edit" onClick={() => navigate('/profile')}>
              แก้ไขข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
