import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.jsx';
import { STARTING_LEVEL } from '../../shared/leveling.js';
import bgHome from '../src/assets/bgHome.jpg';
import defaultAvatar from '../src/assets/ui/default_avatar.png';
import Reveal from '../src/components/Reveal.jsx';
import '../src/styles/ViewProfilePage.css';

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
          <p className="view-profile-sub">ข้อมูลบัญชีของคุณ</p>

          <div className="view-profile-avatar-row">
            <div className="view-profile-avatar-wrap">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="avatar" className="view-profile-avatar-img" />
                : <img src={defaultAvatar} alt="รูปโปรไฟล์เริ่มต้น" className="view-profile-avatar-img" />}
            </div>
          </div>

          <div className="view-profile-content">
            <Reveal as="div" className="view-profile-field" delay={0}>
              <div className="view-profile-field-label">ชื่อบัญชี</div>
              <div className="view-profile-field-value">{user?.username || 'ยังไม่ได้ระบุ'}</div>
            </Reveal>

            <Reveal as="div" className="view-profile-field" delay={60}>
              <div className="view-profile-field-label">ชื่อที่แสดงในเกม</div>
              <div className="view-profile-field-value">{getDisplayValue(user?.displayName)}</div>
            </Reveal>

            <Reveal as="div" className="view-profile-field" delay={120}>
              <div className="view-profile-field-label">วันเดือนปีเกิด</div>
              <div className="view-profile-field-value">{formatBirthdate(user?.birthdate)}</div>
            </Reveal>

            <Reveal as="div" className="view-profile-field" delay={180}>
              <div className="view-profile-field-label">อีเมล</div>
              <div className={`view-profile-field-value ${user?.email ? 'is-linked' : 'is-empty'}`}>
                {user?.email || 'ยังไม่ได้ผูกอีเมล'}
              </div>
            </Reveal>

            <Reveal as="div" className="view-profile-field" delay={240}>
              <div className="view-profile-field-label">จำนวนเกมที่เล่น</div>
              <div className="view-profile-field-value">{user?.gamesPlayed || 0} เกม</div>
            </Reveal>

            <Reveal as="div" className="view-profile-field" delay={300}>
              <div className="view-profile-field-label">ระดับ</div>
              <div className="view-profile-field-value level">{user?.level ?? STARTING_LEVEL}</div>
            </Reveal>
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
