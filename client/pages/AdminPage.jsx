import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.jsx';
import bgHome from '../src/assets/bgHome.jpg';
import { useToast } from '../src/components/ToastContext.jsx';
import '../src/styles/AdminPage.css';

const BG_IMAGE = bgHome;

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

function ConfirmModal({ open, title, message, confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก', danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="admin-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <h3 className="admin-modal-title">{title}</h3>
        <p className="admin-modal-message">{message}</p>
        <div className="admin-modal-actions">
          <button className="admin-modal-btn-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`admin-modal-btn-confirm ${danger ? 'is-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserEditModal({ user, open, onClose, onSave, saving, error }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        email: user.email || '',
        level: user.level,
        exp: user.exp,
        isAdmin: user.isAdmin,
      });
    }
  }, [user]);

  if (!open || !user) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.id, formData);
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className="admin-modal-title">แก้ไขผู้ใช้: {user.username}</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-field">
          <label htmlFor="displayName">Display Name:</label>
          <input type="text" id="displayName" name="displayName" value={formData.displayName} onChange={handleChange} className="admin-input" />
        </div>
        <div className="admin-form-field">
          <label htmlFor="email">Email:</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="admin-input" />
        </div>
        <div className="admin-form-field">
          <label htmlFor="level">Level:</label>
          <input type="number" id="level" name="level" value={formData.level} onChange={handleChange} className="admin-input" min="0" />
        </div>
        <div className="admin-form-field">
          <label htmlFor="exp">EXP:</label>
          <input type="number" id="exp" name="exp" value={formData.exp} onChange={handleChange} className="admin-input" min="0" />
        </div>
        <div className="admin-form-field">
          <label className="admin-checkbox-label">
            <input type="checkbox" name="isAdmin" checked={formData.isAdmin} onChange={handleChange} disabled={user.id === user.currentAdminId} />
            เป็น Admin
          </label>
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-modal-btn-cancel" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="admin-modal-btn-confirm" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  );
}

function BanUserModal({ user, open, onClose, onSave, saving, error }) {
  const [duration, setDuration] = useState('1d');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setDuration('1d');
      setReason('');
    }
  }, [open]);

  if (!open || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.id, { duration, reason });
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className="admin-modal-title">แบนผู้ใช้: {user.username}</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-field">
          <label htmlFor="duration">ระยะเวลา</label>
          <select
            id="duration"
            name="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="admin-input"
          >
            <option value="1d">1 วัน</option>
            <option value="7d">7 วัน</option>
            <option value="perm">ถาวร</option>
          </select>
        </div>
        <div className="admin-form-field">
          <label htmlFor="reason">เหตุผล (ไม่บังคับ)</label>
          <textarea
            id="reason"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="admin-input"
            rows="3"
            placeholder="เช่น ใช้คำพูดไม่เหมาะสม, ก่อกวน"
          />
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-modal-btn-cancel" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="admin-modal-btn-confirm is-danger" disabled={saving}>
            {saving ? 'กำลังแบน...' : 'ยืนยันการแบน'}
          </button>
        </div>
      </form>
    </div>
  );
}

const NEWS_TAGS = ['อัปเดต', 'กิจกรรม', 'ประกาศ', 'แพทช์', 'ชุมชน'];

function NewsEditModal({ news, open, onClose, onSave, saving, error }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (news) {
      setFormData({
        title: news.title || '',
        content: news.content || '',
        tag: news.tag || NEWS_TAGS[0],
      });
    } else {
      setFormData({
        title: '',
        content: '',
        tag: NEWS_TAGS[0],
      });
    }
  }, [news, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(news?.id, formData);
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className="admin-modal-title">{news ? `แก้ไขข่าวสาร: ${news.title}` : 'สร้างข่าวสารใหม่'}</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-field">
          <label htmlFor="newsTitle">หัวข้อข่าวสาร</label>
          <input type="text" id="newsTitle" name="title" value={formData.title} onChange={handleChange} className="admin-input" required />
        </div>
        <div className="admin-form-field">
          <label htmlFor="newsContent">เนื้อหา</label>
          <textarea id="newsContent" name="content" value={formData.content} onChange={handleChange} className="admin-input" rows="6" required />
        </div>
        <div className="admin-form-field">
          <label htmlFor="newsTag">หมวดหมู่</label>
          <select id="newsTag" name="tag" value={formData.tag} onChange={handleChange} className="admin-input">
            {NEWS_TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-modal-btn-cancel" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="admin-modal-btn-confirm" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  );
}

const FACTIONS = ['village', 'werewolf', 'neutral'];

function RoleEditModal({ role, open, onClose, onSave, saving, error }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (role) {
      setFormData({
        name_en: role.name_en || '',
        name_th: role.name_th || '',
        description_th: role.description_th || '',
        faction: role.faction || FACTIONS[0],
        icon: role.icon || '',
        night_action: role.night_action || false,
        is_active: role.is_active || true,
      });
    } else {
      setFormData({
        name_en: '',
        name_th: '',
        description_th: '',
        faction: FACTIONS[0],
        icon: '',
        night_action: false,
        is_active: true,
      });
    }
  }, [role, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(role?.id, formData);
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className="admin-modal-title">{role ? `แก้ไขบทบาท: ${role.name_th}` : 'สร้างบทบาทใหม่'}</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-field">
          <label htmlFor="roleNameEn">ชื่อบทบาท (EN)</label>
          <input type="text" id="roleNameEn" name="name_en" value={formData.name_en} onChange={handleChange} className="admin-input" required />
        </div>
        <div className="admin-form-field">
          <label htmlFor="roleNameTh">ชื่อบทบาท (TH)</label>
          <input type="text" id="roleNameTh" name="name_th" value={formData.name_th} onChange={handleChange} className="admin-input" required />
        </div>
        <div className="admin-form-field">
          <label htmlFor="roleDescTh">คำอธิบาย (TH)</label>
          <textarea id="roleDescTh" name="description_th" value={formData.description_th} onChange={handleChange} className="admin-input" rows="4" required />
        </div>
        <div className="admin-form-field">
          <label htmlFor="roleFaction">ฝ่าย</label>
          <select id="roleFaction" name="faction" value={formData.faction} onChange={handleChange} className="admin-input">
            {FACTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="admin-form-field">
          <label htmlFor="roleIcon">ไอคอน (Emoji)</label>
          <input type="text" id="roleIcon" name="icon" value={formData.icon} onChange={handleChange} className="admin-input" maxLength="10" required />
        </div>
        <div className="admin-form-field">
          <label className="admin-checkbox-label">
            <input type="checkbox" name="night_action" checked={formData.night_action} onChange={handleChange} />
            มี Night Action
          </label>
          <label className="admin-checkbox-label">
            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
            เปิดใช้งาน
          </label>
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-modal-btn-cancel" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="admin-modal-btn-confirm" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  );
}

const CARD_TYPES = ['good', 'bad'];

function FortuneCardEditModal({ card, open, onClose, onSave, saving, error }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (card) {
      setFormData({
        name_en: card.name_en || '',
        name_th: card.name_th || '',
        description_th: card.description_th || '',
        type: card.type || CARD_TYPES[0],
        icon: card.icon || '',
        is_active: card.is_active ?? true,
      });
    } else {
      setFormData({
        name_en: '',
        name_th: '',
        description_th: '',
        type: CARD_TYPES[0],
        icon: '',
        is_active: true,
      });
    }
  }, [card, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(card?.id, formData);
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className="admin-modal-title">{card ? `แก้ไขการ์ด: ${card.name_th}` : 'สร้างการ์ดใหม่'}</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-field">
          <label htmlFor="cardNameEn">ชื่อการ์ด (EN)</label>
          <input type="text" id="cardNameEn" name="name_en" value={formData.name_en} onChange={handleChange} className="admin-input" required />
        </div>
        <div className="admin-form-field">
          <label htmlFor="cardNameTh">ชื่อการ์ด (TH)</label>
          <input type="text" id="cardNameTh" name="name_th" value={formData.name_th} onChange={handleChange} className="admin-input" required />
        </div>
        <div className="admin-form-field">
          <label htmlFor="cardDescTh">คำอธิบาย (TH)</label>
          <textarea id="cardDescTh" name="description_th" value={formData.description_th} onChange={handleChange} className="admin-input" rows="4" required />
        </div>
        <div className="admin-form-field">
          <label htmlFor="cardType">ประเภท</label>
          <select id="cardType" name="type" value={formData.type} onChange={handleChange} className="admin-input">
            {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="admin-form-field">
          <label htmlFor="cardIcon">ไอคอน (Emoji หรือ Path)</label>
          <input type="text" id="cardIcon" name="icon" value={formData.icon} onChange={handleChange} className="admin-input" required />
        </div>
        <div className="admin-form-field">
          <label className="admin-checkbox-label">
            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
            เปิดใช้งาน
          </label>
        </div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-modal-btn-cancel" onClick={onClose}>ยกเลิก</button>
          <button type="submit" className="admin-modal-btn-confirm" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  );
}

function UsersTable({ users, onEditUser, onDeleteUser, onBanUser, onUnbanUser, currentAdminId }) {
  return (
    <div className="admin-table-container custom-scrollbar">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Display Name</th>
            <th>Email</th>
            <th>Level</th>
            <th>Admin</th>
            <th>สถานะ</th>
            <th>Created</th>
            <th className="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => {
            const isBanned = user.banned_until && new Date(user.banned_until) > new Date();
            return (
            <tr key={user.id} className={isBanned ? 'is-banned' : ''}>
              <td>{user.username}</td>
              <td>{user.displayName || '-'}</td>
              <td>{user.email || '-'}</td>
              <td>{user.level}</td>
              <td>{user.isAdmin ? '✔️' : '❌'}</td>
              <td>{isBanned ? 'ถูกแบน' : 'ปกติ'}</td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
              <td className="actions">
                <button className="action-btn" onClick={() => onEditUser(user)}>แก้ไข</button>
                {user.id !== currentAdminId && !user.isAdmin && (
                  isBanned
                    ? <button className="action-btn" onClick={() => onUnbanUser(user)}>ยกเลิกแบน</button>
                    : <button className="action-btn danger" onClick={() => onBanUser(user)}>แบน</button>
                )}
                {user.id !== currentAdminId && <button className="action-btn danger" onClick={() => onDeleteUser(user)}>ลบ</button>}
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
}

function RoomsList({ rooms, onCloseRoom, onForceStartRoom }) {
  return (
    <div className="admin-table-container custom-scrollbar">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Room ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Mode</th>
            <th>Players</th>
            <th className="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => (
            <tr key={room.id}>
              <td>{room.id}</td>
              <td>{room.name}</td>
              <td>{room.status}</td>
              <td>{room.gameMode}</td>
              <td>{room.playerCount} / {room.maxPlayers}</td>
              <td className="actions">
                {room.status === 'waiting' && (
                  <button className="action-btn primary" onClick={() => onForceStartRoom(room)}>Force Start</button>
                )}
                <button className="action-btn danger" onClick={() => onCloseRoom(room)}>Close Room</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogsTable({ logs }) {
  return (
    <div className="admin-table-container custom-scrollbar">
      <table className="admin-table">
        <thead>
          <tr>
            <th>เวลา</th>
            <th>Admin</th>
            <th>ประเภทการกระทำ</th>
            <th>เป้าหมาย</th>
            <th>รายละเอียด</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.created_at).toLocaleString('th-TH')}</td>
              <td>{log.admin_username} ({log.admin_id.substring(0, 4)}...)</td>
              <td>{log.action_type}</td>
              <td>
                {log.target_name || '-'}
                {log.target_id && ` (${log.target_id.substring(0, 4)}...)`}
              </td>
              <td>
                {log.details ? (
                  <pre className="admin-log-details">{JSON.stringify(log.details, null, 2)}</pre>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewsTable({ news, onEditNews, onDeleteNews, onAddNews }) {
  return (
    <div className="admin-table-container custom-scrollbar">
      <div className="admin-table-actions">
        <button className="action-btn primary" onClick={onAddNews}>+ สร้างข่าวสารใหม่</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>หัวข้อ</th>
            <th>หมวดหมู่</th>
            <th>ผู้เขียน</th>
            <th>สร้างเมื่อ</th>
            <th>อัปเดตเมื่อ</th>
            <th className="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {news.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.title}</td>
              <td>{item.tag}</td>
              <td>{item.author_username || '-'}</td>
              <td>{new Date(item.created_at).toLocaleDateString()}</td>
              <td>{new Date(item.updated_at).toLocaleDateString()}</td>
              <td className="actions">
                <button className="action-btn" onClick={() => onEditNews(item)}>แก้ไข</button>
                <button className="action-btn danger" onClick={() => onDeleteNews(item)}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FortuneCardsTable({ cards, onEditCard, onDeleteCard, onAddCard }) {
  return (
    <div className="admin-table-container custom-scrollbar">
      <div className="admin-table-actions">
        <button className="action-btn primary" onClick={onAddCard}>+ สร้างการ์ดใหม่</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>ชื่อ (EN)</th>
            <th>ชื่อ (TH)</th>
            <th>ประเภท</th>
            <th>ไอคอน</th>
            <th>Active</th>
            <th>สร้างเมื่อ</th>
            <th className="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(card => (
            <tr key={card.id}>
              <td>{card.id}</td>
              <td>{card.name_en}</td>
              <td>{card.name_th}</td>
              <td>
                <span className={`admin-tag is-${card.type}`}>{card.type}</span>
              </td>
              <td>{card.icon}</td>
              <td>{card.is_active ? '✔️' : '❌'}</td>
              <td>{new Date(card.created_at).toLocaleDateString()}</td>
              <td className="actions">
                <button className="action-btn" onClick={() => onEditCard(card)}>แก้ไข</button>
                <button className="action-btn danger" onClick={() => onDeleteCard(card)}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RolesTable({ roles, onEditRole, onDeleteRole, onAddRole }) {
  return (
    <div className="admin-table-container custom-scrollbar">
      <div className="admin-table-actions">
        <button className="action-btn primary" onClick={onAddRole}>+ สร้างบทบาทใหม่</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>ชื่อ (EN)</th>
            <th>ชื่อ (TH)</th>
            <th>ฝ่าย</th>
            <th>ไอคอน</th>
            <th>Night Action</th>
            <th>Active</th>
            <th>สร้างเมื่อ</th>
            <th className="actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(role => (
            <tr key={role.id}>
              <td>{role.id}</td>
              <td>{role.name_en}</td>
              <td>{role.name_th}</td>
              <td>{role.faction}</td>
              <td>{role.icon}</td>
              <td>{role.night_action ? '✔️' : '❌'}</td>
              <td>{role.is_active ? '✔️' : '❌'}</td>
              <td>{new Date(role.created_at).toLocaleDateString()}</td>
              <td className="actions">
                <button className="action-btn" onClick={() => onEditRole(role)}>แก้ไข</button>
                <button className="action-btn danger" onClick={() => onDeleteRole(role)}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GameStatsPanel({ stats }) {
  return (
    <div className="admin-stats-grid">
      <div className="admin-stat-card">
        <span className="stat-label">ผู้ใช้ทั้งหมด</span>
        <span className="stat-value">{stats.totalUsers?.toLocaleString() || 'N/A'}</span>
      </div>
      <div className="admin-stat-card">
        <span className="stat-label">ห้องที่สร้างทั้งหมด</span>
        <span className="stat-value">{stats.totalRoomsCreated?.toLocaleString() || 'N/A'}</span>
      </div>
      <div className="admin-stat-card">
        <span className="stat-label">เกมที่เล่นจบแล้ว</span>
        <span className="stat-value">{stats.totalGamesFinished?.toLocaleString() || 'N/A'}</span>
      </div>
      <div className="admin-stat-card">
        <span className="stat-label">ห้องที่กำลังใช้งาน</span>
        <span className="stat-value">{stats.totalActiveRooms?.toLocaleString() || 'N/A'}</span>
      </div>
      <div className="admin-stat-card">
        <span className="stat-label">ผู้เล่นในห้อง (ตอนนี้)</span>
        <span className="stat-value">{stats.totalPlayersInRooms?.toLocaleString() || 'N/A'}</span>
      </div>
      {/* Add more stats here */}
      <div className="admin-stat-card">
        <span className="stat-label">เฉลี่ยผู้เล่น/ห้อง</span>
        <span className="stat-value">{(stats.totalPlayersInRooms / stats.totalActiveRooms).toFixed(1) || 'N/A'}</span>
        <span className="stat-value">
          {stats.totalActiveRooms > 0 ? (stats.totalPlayersInRooms / stats.totalActiveRooms).toFixed(1) : 'N/A'}
        </span>
      </div>
    </div>
  );
}

// Game Settings Panel
function GameSettingsPanel({ settings, onUpdateSetting, saving, error }) {
  const [editMode, setEditMode] = useState({}); // { setting_key: true }
  const [formData, setFormData] = useState({}); // { setting_key: value }

  useEffect(() => {
    const initialFormData = {};
    settings.forEach(s => {
      initialFormData[s.setting_key] = s.setting_value;
    });
    setFormData(initialFormData);
  }, [settings]);

  const handleEditClick = (key) => {
    setEditMode(prev => ({ ...prev, [key]: true }));
  };

  const handleCancelEdit = (key) => {
    setEditMode(prev => ({ ...prev, [key]: false }));
    // Reset to original value
    const originalSetting = settings.find(s => s.setting_key === key);
    if (originalSetting) {
      setFormData(prev => ({ ...prev, [key]: originalSetting.setting_value }));
    }
  };

  const handleChange = (e, key, type) => {
    let value = e.target.value;
    if (type === 'boolean') value = e.target.checked;
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (key) => {
    const setting = settings.find(s => s.setting_key === key);
    if (setting) {
      onUpdateSetting(key, formData[key], setting.value_type);
      setEditMode(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="admin-settings-list">
      {error && <p className="admin-error">{error}</p>}
      {settings.map(s => (
        <div key={s.setting_key} className="admin-setting-item">
          <div className="admin-setting-info">
            <span className="admin-setting-key">{s.setting_key}</span>
            <p className="admin-setting-desc">{s.description || 'ไม่มีคำอธิบาย'}</p>
          </div>
          <div className="admin-setting-value-controls">
            {editMode[s.setting_key] ? (
              <SettingInput value={formData[s.setting_key]} type={s.value_type} onChange={(e) => handleChange(e, s.setting_key, s.value_type)} />
            ) : (
              <span className="admin-setting-value">{String(s.setting_value)}</span>
            )}
            {editMode[s.setting_key] ? (
              <>
                <button className="action-btn" onClick={() => handleSave(s.setting_key)} disabled={saving}>บันทึก</button>
                <button className="action-btn danger" onClick={() => handleCancelEdit(s.setting_key)}>ยกเลิก</button>
              </>
            ) : (
              <button className="action-btn" onClick={() => handleEditClick(s.setting_key)}>แก้ไข</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingInput({ value, type, onChange }) {
  switch (type) {
    case 'number':
      return <input type="number" value={value} onChange={onChange} className="admin-input" />;
    case 'boolean':
      return <input type="checkbox" checked={value} onChange={onChange} className="admin-checkbox-input" />;
    case 'json':
      return <textarea value={value} onChange={onChange} className="admin-input" rows="3" />;
    default: // string
      return <input type="text" value={value} onChange={onChange} className="admin-input" />;
  }
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="admin-pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="pagination-btn"
      >
        ‹ Previous
      </button>
      <span className="pagination-info">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="pagination-btn"
      >
        Next ›
      </button>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [apiError, setApiError] = useState('');
  const [apiLoading, setApiLoading] = useState(true);
  const toast = useToast();

  // State for users tab
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState({ page: 1, totalPages: 1 });
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 500);

  // State for rooms tab
  const [rooms, setRooms] = useState([]);
  const [roomPagination, setRoomPagination] = useState({ page: 1, totalPages: 1 });
  const [roomSearch, setRoomSearch] = useState('');
  const debouncedRoomSearch = useDebounce(roomSearch, 500);

  // State for logs tab
  const [logs, setLogs] = useState([]);
  const [logPagination, setLogPagination] = useState({ page: 1, totalPages: 1 });
  const [logSearch, setLogSearch] = useState('');
  const debouncedLogSearch = useDebounce(logSearch, 500);

  // State for news tab
  const [news, setNews] = useState([]);
  const [newsPagination, setNewsPagination] = useState({ page: 1, totalPages: 1 });
  const [newsSearch, setNewsSearch] = useState('');
  const debouncedNewsSearch = useDebounce(newsSearch, 500);

  // State for roles tab
  const [roles, setRoles] = useState([]);
  const [rolesPagination, setRolesPagination] = useState({ page: 1, totalPages: 1 });
  const [rolesSearch, setRolesSearch] = useState('');
  const debouncedRolesSearch = useDebounce(rolesSearch, 500);

  // State for fortune cards tab
  const [fortuneCards, setFortuneCards] = useState([]);
  const [fortuneCardsPagination, setFortuneCardsPagination] = useState({ page: 1, totalPages: 1 });
  const [fortuneCardsSearch, setFortuneCardsSearch] = useState('');
  const debouncedFortuneCardsSearch = useDebounce(fortuneCardsSearch, 500);

  // State for game settings tab
  const [gameSettings, setGameSettings] = useState([]);
  const [settingsSaving, setSettingsSaving] = useState(false);
  // State for game stats tab
  const [gameStats, setGameStats] = useState({});

  // State for user editing
  const [editingUser, setEditingUser] = useState(null);
  const [userEditSaving, setUserEditSaving] = useState(false);
  const [userEditError, setUserEditError] = useState('');

  // State for room closing
  const [roomToClose, setRoomToClose] = useState(null);
  const [roomToForceStart, setRoomToForceStart] = useState(null);

  // State for user deletion
  const [userToDelete, setUserToDelete] = useState(null);

  // State for user banning
  const [banningUser, setBanningUser] = useState(null);
  const [unbanningUser, setUnbanningUser] = useState(null);
  const [banSaving, setBanSaving] = useState(false);
  const [banError, setBanError] = useState('');

  // State for news management
  const [editingNews, setEditingNews] = useState(null);
  const [newsToDelete, setNewsToDelete] = useState(null);

  // State for role management
  const [editingRole, setEditingRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // State for fortune card management
  const [editingFortuneCard, setEditingFortuneCard] = useState(null);
  const [fortuneCardToDelete, setFortuneCardToDelete] = useState(null);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setUserPagination(p => ({ ...p, page: 1 }));
  }, [debouncedUserSearch]);
  useEffect(() => {
    setRoomPagination(p => ({ ...p, page: 1 }));
  }, [debouncedRoomSearch]);
  useEffect(() => {
    setLogPagination(p => ({ ...p, page: 1 }));
  }, [debouncedLogSearch]);
  useEffect(() => {
    if (activeTab === 'stats') fetchGameStats();
  }, [activeTab]);
  useEffect(() => {
    setNewsPagination(p => ({ ...p, page: 1 }));
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'settings') fetchGameSettings();
  }, [activeTab]); // Fetch stats when tab changes to stats

  useEffect(() => {
    document.title = 'Admin Dashboard — WE\'RE NOT WOLF';
  }, []);

  // Redirect ถ้าไม่ใช่ Admin หรือยังโหลดข้อมูลผู้ใช้ไม่เสร็จ
  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const fetchUsers = useCallback(async () => {
    if (!user?.isAdmin) return;
    setApiLoading(true);
    const params = new URLSearchParams({
      page: userPagination.page,
      limit: 15,
      search: debouncedUserSearch,
    });
    try {
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data.users || []);
      setUserPagination(data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  }, [user, userPagination.page, debouncedUserSearch]);

  const fetchRooms = useCallback(async () => {
    if (!user?.isAdmin) return;
    setApiLoading(true);
    const params = new URLSearchParams({
      page: roomPagination.page,
      limit: 10,
      search: debouncedRoomSearch,
    });
    try {
      const res = await fetch(`/api/admin/rooms?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch rooms');
      setRooms(data.rooms || []);
      setRoomPagination(data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  }, [user, roomPagination.page, debouncedRoomSearch]);

  const fetchAdminLogs = useCallback(async () => {
    if (!user?.isAdmin) return;
    setApiLoading(true);
    const params = new URLSearchParams({
      page: logPagination.page,
      limit: 15,
      search: debouncedLogSearch,
    });
    try {
      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch admin logs');
      setLogs(data.logs || []);
      setLogPagination(data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  }, [user, logPagination.page, debouncedLogSearch]);

  const fetchNewsAdmin = useCallback(async () => {
    if (!user?.isAdmin) return;
    setApiLoading(true);
    const params = new URLSearchParams({
      page: newsPagination.page,
      limit: 10,
      search: debouncedNewsSearch,
    });
    try {
      const res = await fetch(`/api/admin/news?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch news');
      setNews(data.news || []);
      setNewsPagination(data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  }, [user, newsPagination.page, debouncedNewsSearch]);

  const fetchRolesAdmin = useCallback(async () => {
    if (!user?.isAdmin) return;
    setApiLoading(true);
    const params = new URLSearchParams({
      page: rolesPagination.page,
      limit: 10,
      search: debouncedRolesSearch,
    });
    try {
      const res = await fetch(`/api/admin/roles?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch roles');
      setRoles(data.roles || []);
      setRolesPagination(data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  }, [user, rolesPagination.page, debouncedRolesSearch]);

  const fetchFortuneCardsAdmin = useCallback(async () => {
    if (!user?.isAdmin) return;
    setApiLoading(true);
    const params = new URLSearchParams({
      page: fortuneCardsPagination.page,
      limit: 15,
      search: debouncedFortuneCardsSearch,
    });
    try {
      const res = await fetch(`/api/admin/cards?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch fortune cards');
      setFortuneCards(data.cards || []);
      setFortuneCardsPagination(data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  }, [user, fortuneCardsPagination.page, debouncedFortuneCardsSearch]);

  const fetchGameStats = useCallback(async () => {
    if (!user?.isAdmin || activeTab !== 'stats') return;
    setApiLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch game stats');
      setGameStats(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  }, [user, activeTab]);

  const fetchGameSettings = useCallback(async () => {
    if (!user?.isAdmin || activeTab !== 'settings') return;
    setApiLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch game settings');
      setGameSettings(data.settings || []);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setApiLoading(false);
    }
  }, [user, activeTab]);

  const handleUpdateSetting = async (key, value, type) => {
    setSettingsSaving(true);
    setApiError('');
    try {
      const res = await fetch(`/api/admin/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_value: value, value_type: type }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'อัปเดตการตั้งค่าไม่สำเร็จ');
      toast.success(`อัปเดตการตั้งค่า ${key} สำเร็จ`);
      fetchGameSettings(); // Refresh settings after update
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setSettingsSaving(false);
    }
  };


  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'rooms') fetchRooms();
    else if (activeTab === 'logs') fetchAdminLogs();
    else if (activeTab === 'news') fetchNewsAdmin();
    else if (activeTab === 'roles') fetchRolesAdmin();
    else if (activeTab === 'cards') fetchFortuneCardsAdmin();
    // Stats and Settings have their own useEffects triggered by activeTab
  }, [activeTab, fetchUsers, fetchRooms]);

  // --- User Management Actions ---
  const handleEditUser = (userToEdit) => {
    setEditingUser({ ...userToEdit, currentAdminId: user.id }); // Pass current admin ID for self-edit check
    setUserEditError('');
  };

  const handleSaveUser = async (userId, formData) => {
    setUserEditSaving(true);
    setUserEditError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บันทึกข้อมูลผู้ใช้ไม่สำเร็จ');
      toast.success('อัปเดตข้อมูลผู้ใช้สำเร็จ');
      setEditingUser(null);
      fetchUsers(); // Refresh data after update
    } catch (err) {
      setUserEditError(err.message);
      toast.error(err.message);
    } finally {
      setUserEditSaving(false);
    }
  };

  const handleCloseUserEditModal = () => {
    setEditingUser(null);
    setUserEditError('');
  };

  const handleBanUser = (user) => {
    setBanningUser(user);
    setBanError('');
  };

  const handleConfirmBan = async (userId, { duration, reason }) => {
    setBanSaving(true);
    setBanError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ban', duration, reason }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'แบนผู้ใช้ไม่สำเร็จ');
      toast.success('แบนผู้ใช้สำเร็จ');
      setBanningUser(null);
      fetchUsers();
    } catch (err) {
      setBanError(err.message);
      toast.error(err.message);
    } finally {
      setBanSaving(false);
    }
  };

  const handleUnbanUser = (user) => {
    setUnbanningUser(user);
  };

  const handleConfirmUnban = async () => {
    if (!unbanningUser) return;
    try {
      const res = await fetch(`/api/admin/users/${unbanningUser.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'ยกเลิกการแบนไม่สำเร็จ');
      toast.success('ยกเลิกการแบนผู้ใช้สำเร็จ');
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUnbanningUser(null);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    setApiLoading(true);
    setApiError('');
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'ลบผู้ใช้ไม่สำเร็จ');
      toast.success(`ลบผู้ใช้ "${userToDelete.username}" สำเร็จ`);

      // If the deleted user was the last one on a page > 1, go to the previous page.
      if (users.length === 1 && userPagination.page > 1) {
        setUserPagination(p => ({ ...p, page: p.page - 1 }));
      } else {
        fetchUsers();
      }
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
      setUserToDelete(null); // Ensure modal closes even on error
    }
  };

  const handleCancelDeleteUser = () => {
    setUserToDelete(null);
  };

  // --- News Management Actions ---
  const handleAddNews = () => {
    setEditingNews({}); // Empty object for new news
    setApiError('');
  };

  const handleEditNews = (newsItem) => {
    setEditingNews(newsItem);
    setApiError('');
  };

  const handleSaveNews = async (newsId, formData) => {
    setApiLoading(true);
    setApiError('');
    try {
      const method = newsId ? 'PUT' : 'POST';
      const url = newsId ? `/api/admin/news/${newsId}` : '/api/admin/news';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บันทึกข่าวสารไม่สำเร็จ');
      toast.success(`บันทึกข่าวสารสำเร็จ`);
      setEditingNews(null);
      fetchNewsAdmin();
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  const handleDeleteNews = (newsItem) => {
    setNewsToDelete(newsItem);
  };

  const handleConfirmDeleteNews = async () => {
    if (!newsToDelete) return;
    setApiLoading(true);
    setApiError('');
    try {
      const res = await fetch(`/api/admin/news/${newsToDelete.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'ลบข่าวสารไม่สำเร็จ');
      toast.success(`ลบข่าวสาร "${newsToDelete.title}" สำเร็จ`);
      setNewsToDelete(null);
      fetchNewsAdmin();
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  // --- Role Management Actions ---
  const handleAddRole = () => {
    setEditingRole({}); // Empty object for new role
    setApiError('');
  };

  const handleEditRole = (roleItem) => {
    setEditingRole(roleItem);
    setApiError('');
  };

  const handleSaveRole = async (roleId, formData) => {
    setApiLoading(true);
    setApiError('');
    try {
      const method = roleId ? 'PUT' : 'POST';
      const url = roleId ? `/api/admin/roles/${roleId}` : '/api/admin/roles';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บันทึกบทบาทไม่สำเร็จ');
      toast.success(`บันทึกบทบาทสำเร็จ`);
      setEditingRole(null);
      fetchRolesAdmin();
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  const handleDeleteRole = (roleItem) => {
    setRoleToDelete(roleItem);
  };

  const handleConfirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setApiLoading(true);
    setApiError('');
    try {
      const res = await fetch(`/api/admin/roles/${roleToDelete.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'ลบบทบาทไม่สำเร็จ');
      toast.success(`ลบบทบาท "${roleToDelete.name_th}" สำเร็จ`);
      setRoleToDelete(null);
      fetchRolesAdmin();
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  // --- Fortune Card Management Actions ---
  const handleAddFortuneCard = () => {
    setEditingFortuneCard({});
    setApiError('');
  };

  const handleEditFortuneCard = (cardItem) => {
    setEditingFortuneCard(cardItem);
    setApiError('');
  };

  const handleSaveFortuneCard = async (cardId, formData) => {
    setApiLoading(true);
    setApiError('');
    try {
      const method = cardId ? 'PUT' : 'POST';
      const url = cardId ? `/api/admin/cards/${cardId}` : '/api/admin/cards';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บันทึกการ์ดไม่สำเร็จ');
      toast.success(`บันทึกการ์ดสำเร็จ`);
      setEditingFortuneCard(null);
      fetchFortuneCardsAdmin();
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  const handleDeleteFortuneCard = (cardItem) => {
    setFortuneCardToDelete(cardItem);
  };

  const handleConfirmDeleteFortuneCard = async () => {
    if (!fortuneCardToDelete) return;
    setApiLoading(true);
    setApiError('');
    try {
      const res = await fetch(`/api/admin/cards/${fortuneCardToDelete.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'ลบการ์ดไม่สำเร็จ');
      toast.success(`ลบการ์ด "${fortuneCardToDelete.name_th}" สำเร็จ`);
      setFortuneCardToDelete(null);
      fetchFortuneCardsAdmin();
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  // --- Room Management Actions ---
  const handleAddBotToRoom = async (room) => {
    setApiLoading(true);
    setApiError('');
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}/bots`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'เพิ่มบอทไม่สำเร็จ');
      toast.success(`เพิ่มบอทในห้อง "${room.name}" สำเร็จ`);
      fetchRooms();
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  const handleForceStartRoom = async (room) => {
    setApiLoading(true);
    setApiError('');
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}/force-start`, { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'บังคับเริ่มเกมไม่สำเร็จ');
      toast.success(`เริ่มเกมห้อง "${room.name}" เรียบร้อยแล้ว`);
      setRoomToForceStart(null);
      fetchRooms();
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  const handleCloseRoom = (room) => {
    setRoomToClose(room);
  };

  const handleRequestForceStart = (room) => {
    setRoomToForceStart(room);
  };

  const handleCancelForceStart = () => {
    setRoomToForceStart(null);
  };

  const handleConfirmForceStart = () => {
    if (roomToForceStart) handleForceStartRoom(roomToForceStart);
  };

  const handleConfirmCloseRoom = async () => {
    if (!roomToClose) return;

    setApiLoading(true);
    setApiError('');
    try {
      const res = await fetch(`/api/admin/rooms/${roomToClose.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'ปิดห้องไม่สำเร็จ');
      toast.success(`ห้อง "${roomToClose.name}" ถูกปิดแล้ว`);
      setRoomToClose(null);
      fetchRooms();
    } catch (err) {
      setApiError(err.message);
      toast.error(err.message);
    } finally {
      setApiLoading(false);
    }
  };

  const handleCancelCloseRoom = () => {
    setRoomToClose(null);
  };

  if (loading || !user || !user.isAdmin) {
    return (
      <div className="admin-page" style={{ backgroundImage: `url(${BG_IMAGE})` }}>
        <div className="admin-overlay" />
        <div className="admin-loading">กำลังตรวจสอบสิทธิ์...</div>
      </div>
    );
  }

  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab, fetchUsers, userPagination.page, debouncedUserSearch]);
  useEffect(() => { if (activeTab === 'rooms') fetchRooms(); }, [activeTab, fetchRooms, roomPagination.page, debouncedRoomSearch]);
  useEffect(() => { if (activeTab === 'logs') fetchAdminLogs(); }, [activeTab, fetchAdminLogs, logPagination.page, debouncedLogSearch]);
  useEffect(() => { if (activeTab === 'news') fetchNewsAdmin(); }, [activeTab, fetchNewsAdmin, newsPagination.page, debouncedNewsSearch]);
  useEffect(() => { if (activeTab === 'roles') fetchRolesAdmin(); }, [activeTab, fetchRolesAdmin, rolesPagination.page, debouncedRolesSearch]);
  useEffect(() => { if (activeTab === 'cards') fetchFortuneCardsAdmin(); }, [activeTab, fetchFortuneCardsAdmin, fortuneCardsPagination.page, debouncedFortuneCardsSearch]);
  useEffect(() => { if (activeTab === 'stats') fetchGameStats(); }, [activeTab, fetchGameStats]);
  useEffect(() => { if (activeTab === 'settings') fetchGameSettings(); }, [activeTab, fetchGameSettings]);


  return (
    <div className="admin-page" style={{ backgroundImage: `url(${BG_IMAGE})` }}>
      <div className="admin-overlay" />
      <div className="admin-container">
        <h1 className="admin-title">Admin Dashboard</h1>
        <p className="admin-welcome">ยินดีต้อนรับ, {user.username}!</p>
        <div className="admin-content">
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'users' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              จัดการผู้ใช้ ({userPagination.total || 0})
            </button>
            <button
              className={`admin-tab ${activeTab === 'stats' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              สถิติเกม
            </button>
            <button
              className={`admin-tab ${activeTab === 'news' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              จัดการข่าวสาร ({newsPagination.total || 0})
            </button>
            <button
              className={`admin-tab ${activeTab === 'roles' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              จัดการบทบาท ({rolesPagination.total || 0})
            </button>
            <button
              className={`admin-tab ${activeTab === 'cards' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('cards')}
            >
              จัดการการ์ด ({fortuneCardsPagination.total || 0})
            </button>
            <button
              className={`admin-tab ${activeTab === 'settings' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ตั้งค่าเกม
            </button>
            <button
              className={`admin-tab ${activeTab === 'rooms' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('rooms')}
            >
              จัดการห้อง ({roomPagination.total || 0})
            </button>
          </div>

          <div className="admin-tab-content">
            <div className="admin-controls">
              {activeTab === 'users' && (
                <input
                  type="search"
                  placeholder="ค้นหาด้วย Username, Display Name, Email..."
                  className="admin-search-input"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              )}
              {activeTab === 'rooms' && (
                <input
                  type="search"
                  placeholder="ค้นหาด้วย Room ID, Room Name..."
                  className="admin-search-input"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                />
              )}
              {activeTab === 'logs' && (
                <input
                  type="search"
                  placeholder="ค้นหาด้วย Admin, Action Type, Target Name..."
                  className="admin-search-input"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              )}
              {activeTab === 'news' && (
                <input
                  type="search"
                  placeholder="ค้นหาด้วยหัวข้อ, เนื้อหา, ผู้เขียน..."
                  className="admin-search-input"
                  value={newsSearch}
                  onChange={(e) => setNewsSearch(e.target.value)}
                />
              )}
              {activeTab === 'roles' && (
                <input
                  type="search"
                  placeholder="ค้นหาด้วยชื่อบทบาท (TH/EN), คำอธิบาย..."
                  className="admin-search-input"
                  value={rolesSearch}
                  onChange={(e) => setRolesSearch(e.target.value)}
                />
              )}
              {activeTab === 'cards' && (
                <input
                  type="search"
                  placeholder="ค้นหาด้วยชื่อการ์ด (TH/EN), คำอธิบาย..."
                  className="admin-search-input"
                  value={fortuneCardsSearch}
                  onChange={(e) => setFortuneCardsSearch(e.target.value)}
                />
              )}
              {activeTab === 'stats' && (
                <p className="admin-stats-note">สถิติโดยรวมของเกม</p>
              )}
              {activeTab === 'settings' && (
                <p className="admin-stats-note">จัดการการตั้งค่าเกมทั่วโลก</p>
              )}
            </div>

            {apiLoading && <p>กำลังโหลดข้อมูล...</p>}
            {apiError && <p className="admin-error">{apiError}</p>}

            {!apiLoading && !apiError && activeTab === 'users' && (
              <>
                <UsersTable
                  users={users}
                  onEditUser={handleEditUser}
                  onDeleteUser={handleDeleteUser}
                  onBanUser={handleBanUser}
                  onUnbanUser={handleUnbanUser}
                  currentAdminId={user.id} />
                <Pagination currentPage={userPagination.page} totalPages={userPagination.totalPages} onPageChange={(page) => setUserPagination(p => ({ ...p, page }))} />
              </>
            )}
            {!apiLoading && !apiError && activeTab === 'rooms' && (
              <>
                <RoomsList rooms={rooms} onCloseRoom={handleCloseRoom} onForceStartRoom={handleRequestForceStart} />
                <Pagination currentPage={roomPagination.page} totalPages={roomPagination.totalPages} onPageChange={(page) => setRoomPagination(p => ({ ...p, page }))} />
              </>
            )}
            {!apiLoading && !apiError && activeTab === 'logs' && (
              <>
                <LogsTable logs={logs} />
                <Pagination currentPage={logPagination.page} totalPages={logPagination.totalPages} onPageChange={(page) => setLogPagination(p => ({ ...p, page }))} />
              </>
            )}
            {!apiLoading && !apiError && activeTab === 'stats' && (
              <>
                <GameStatsPanel stats={gameStats} />
              </>
            )}
            {!apiLoading && !apiError && activeTab === 'news' && (
              <>
                <NewsTable news={news} onEditNews={handleEditNews} onDeleteNews={handleDeleteNews} onAddNews={handleAddNews} />
                <Pagination currentPage={newsPagination.page} totalPages={newsPagination.totalPages} onPageChange={(page) => setNewsPagination(p => ({ ...p, page }))} />
              </>
            )}
            {!apiLoading && !apiError && activeTab === 'roles' && (
              <>
                <RolesTable roles={roles} onEditRole={handleEditRole} onDeleteRole={handleDeleteRole} onAddRole={handleAddRole} />
                <Pagination currentPage={rolesPagination.page} totalPages={rolesPagination.totalPages} onPageChange={(page) => setRolesPagination(p => ({ ...p, page }))} />
              </>
            )}
            {!apiLoading && !apiError && activeTab === 'cards' && (
              <>
                <FortuneCardsTable cards={fortuneCards} onEditCard={handleEditFortuneCard} onDeleteCard={handleDeleteFortuneCard} onAddCard={handleAddFortuneCard} />
                <Pagination currentPage={fortuneCardsPagination.page} totalPages={fortuneCardsPagination.totalPages} onPageChange={(page) => setFortuneCardsPagination(p => ({ ...p, page }))} />
              </>
            )}
            {!apiLoading && !apiError && activeTab === 'settings' && (
              <>
                <GameSettingsPanel settings={gameSettings} onUpdateSetting={handleUpdateSetting} saving={settingsSaving} error={apiError} />
              </>
            )}
            <button className="admin-back-btn" onClick={() => navigate('/')}>
              ← กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>

      <UserEditModal
        user={editingUser}
        open={!!editingUser}
        onClose={handleCloseUserEditModal}
        onSave={handleSaveUser}
        saving={userEditSaving}
        error={userEditError}
      />

      <BanUserModal
        user={banningUser}
        open={!!banningUser}
        onClose={() => setBanningUser(null)}
        onSave={handleConfirmBan}
        saving={banSaving}
        error={banError}
      />

      <ConfirmModal
        open={!!userToDelete}
        title="ยืนยันการลบผู้ใช้?"
        message={
          <span>
            คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ <strong>{userToDelete?.username}</strong>?
            <br />
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </span>
        }
        confirmLabel="ลบผู้ใช้"
        danger
        onConfirm={handleConfirmDeleteUser}
        onCancel={handleCancelDeleteUser}
      />

      <ConfirmModal
        open={!!unbanningUser}
        title="ยืนยันการยกเลิกแบน?"
        message={`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการแบนผู้ใช้ "${unbanningUser?.username}"?`}
        confirmLabel="ยกเลิกแบน"
        onConfirm={handleConfirmUnban}
        onCancel={() => setUnbanningUser(null)}
      />

      <NewsEditModal
        news={editingNews}
        open={!!editingNews}
        onClose={() => setEditingNews(null)}
        onSave={handleSaveNews}
        saving={apiLoading}
        error={apiError}
      />

      <ConfirmModal
        open={!!newsToDelete}
        title="ยืนยันการลบข่าวสาร?"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบข่าวสาร "${newsToDelete?.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบข่าวสาร"
        danger
        onConfirm={handleConfirmDeleteNews}
        onCancel={() => setNewsToDelete(null)}
      />

      <RoleEditModal
        role={editingRole}
        open={!!editingRole}
        onClose={() => setEditingRole(null)}
        onSave={handleSaveRole}
        saving={apiLoading}
        error={apiError}
      />

      <ConfirmModal
        open={!!roleToDelete}
        title="ยืนยันการลบบทบาท?"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบบทบาท "${roleToDelete?.name_th}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบบทบาท"
        danger
        onConfirm={handleConfirmDeleteRole}
        onCancel={() => setRoleToDelete(null)}
      />

      <FortuneCardEditModal
        card={editingFortuneCard}
        open={!!editingFortuneCard}
        onClose={() => setEditingFortuneCard(null)}
        onSave={handleSaveFortuneCard}
        saving={apiLoading}
        error={apiError}
      />

      <ConfirmModal
        open={!!fortuneCardToDelete}
        title="ยืนยันการลบการ์ด?"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบการ์ด "${fortuneCardToDelete?.name_th}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบการ์ด"
        danger
        onConfirm={handleConfirmDeleteFortuneCard}
        onCancel={() => setFortuneCardToDelete(null)}
      />
      <ConfirmModal
        open={!!roomToForceStart}
        title="ต้องการบังคับเริ่มเกมห้องนี้หรือไม่?"
        message={
          <span>
            Room Name: <strong>{roomToForceStart?.name}</strong><br />
            Room Code: <strong>{roomToForceStart?.id}</strong><br />
            Players: <strong>{roomToForceStart?.playerCount} / {roomToForceStart?.maxPlayers}</strong><br />
            Game Mode: <strong>{roomToForceStart?.gameMode}</strong><br />
            Room Status: <strong>{roomToForceStart?.status}</strong>
          </span>
        }
        confirmLabel="Force Start"
        cancelLabel="Cancel"
        onConfirm={handleConfirmForceStart}
        onCancel={handleCancelForceStart}
      />
      <ConfirmModal
        open={!!roomToClose}
        title="ยืนยันการปิดห้อง?"
        message={`คุณแน่ใจหรือไม่ว่าต้องการปิดห้อง "${roomToClose?.name}"? ผู้เล่นทุกคนในห้องจะถูกเตะออก`}
        confirmLabel="ปิดห้อง"
        cancelLabel="ยกเลิก"
        danger
        onConfirm={handleConfirmCloseRoom}
        onCancel={handleCancelCloseRoom}
      />
    </div>
  );
}