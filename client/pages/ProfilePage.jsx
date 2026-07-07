import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import bgHome from '../src/assets/bgHome.png';
import '../src/styles/ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleViewProfile = () => {
    navigate('/profile/view');
  };

  const handleSettings = () => {
    navigate('/profile/settings');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="profile-page" style={{ backgroundImage: bgHome ? `url(${bgHome})` : undefined }}>
      <div className="profile-overlay" />
      <div className="profile-fog" />

      <div className="profile-container">
        <div className="profile-topbar">
          <button className="profile-back-btn" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            กลับหน้าหลัก
          </button>
        </div>

        <div className="profile-card">
          <span className="profile-card-corner tl" />
          <span className="profile-card-corner br" />

          <h1 className="profile-title">บัญชีของคุณ</h1>
          <p className="profile-sub">เลือกสิ่งที่ต้องการทำ</p>

          {/* User Info Header */}
          <div className="profile-header-info">
            <div className="profile-username">
              <span className="profile-username-label">ชื่อบัญชี:</span>
              <span className="profile-username-value">{user?.username}</span>
            </div>
            <div className="profile-displayname">
              <span className="profile-displayname-label">ชื่อเล่น:</span>
              <span className="profile-displayname-value">{user?.displayName || user?.username || 'ยังไม่ได้ระบุ'}</span>
            </div>
          </div>

          <div className="profile-divider" />

          {/* Action Buttons */}
          <div className="profile-actions">
            <button className="profile-action-btn view-profile" onClick={handleViewProfile}>
              <div className="profile-action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="profile-action-content">
                <div className="profile-action-title">ดูข้อมูล</div>
                <div className="profile-action-desc">ดูข้อมูลส่วนตัวของคุณ</div>
              </div>
            </button>

            <button className="profile-action-btn setup-account" onClick={handleSettings}>
              <div className="profile-action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
                </svg>
              </div>
              <div className="profile-action-content">
                <div className="profile-action-title">ตั้งค่าบัญชี</div>
                <div className="profile-action-desc">แก้ไขข้อมูลส่วนตัว</div>
              </div>
            </button>

            <button className="profile-action-btn logout" onClick={handleLogout}>
              <div className="profile-action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </div>
              <div className="profile-action-content">
                <div className="profile-action-title">ออกจากระบบ</div>
                <div className="profile-action-desc">ลงชื่อออกจากบัญชี</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
