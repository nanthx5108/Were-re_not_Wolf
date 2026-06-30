
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/Gamecontext.jsx';
import bgHome from '../src/assets/bgHome.png';
import { useAuth }  from '../context/AuthContext.jsx';
import AuthModal    from '../src/components/AuthModal.jsx';
import '../src/styles/HomePage.css';


const BG_IMAGE = bgHome;
const API = '/api/rooms';
const GAMES_PER_LEVEL = 5;

const NEWS = [
  {
    id: 1,
    title: 'New Update 1.2.0',
    desc: 'เพิ่มระบบรายงานผู้เล่น และปรับสมดุลเกม',
    date: '6/24/2026',
  },
  {
    id: 2,
    title: 'Event : Werewolf Night',
    desc: 'เล่นครบ 3 เกม รับของรางวัลพิเศษ !',
    date: '6/24/2026',
  },
  {
    id: 3,
    title: 'Maintenance',
    desc: 'ปรับปรุงเซิร์ฟเวอร์ในวันที่ 6/24/2026',
    date: '6/24/2026',
  },
];
function IconWolf() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <ellipse cx="15" cy="17" rx="10" ry="8" fill="#1a1712" stroke="#4a3f2e" strokeWidth="1.2"/>
      <circle cx="15" cy="13" r="7" fill="#222018" stroke="#4a3f2e" strokeWidth="1.2"/>
      <path d="M10 10 L7 4 L11 9" fill="#1e1c18" stroke="#4a3f2e" strokeWidth="1"/>
      <path d="M20 10 L23 4 L19 9" fill="#1e1c18" stroke="#4a3f2e" strokeWidth="1"/>
      <circle cx="12.5" cy="13" r="1.5" fill="#c8b89a" opacity="0.7"/>
      <circle cx="17.5" cy="13" r="1.5" fill="#c8b89a" opacity="0.7"/>
    </svg>
  );
}

function IconCreate() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="11" cy="11" r="5" stroke="#c8b89a" strokeWidth="1.8"/>
      <circle cx="21" cy="11" r="5" stroke="#c8b89a" strokeWidth="1.8"/>
      <path d="M2 28c0-6 4-9 9-9h10c5 0 9 3 9 9" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function IconJoin() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="5" y="4" width="18" height="24" rx="1" stroke="#c8b89a" strokeWidth="1.8"/>
      <line x1="23" y1="12" x2="30" y2="12" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="27" y1="8" x2="30" y2="12" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="27" y1="16" x2="30" y2="12" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function IconCustomize() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" stroke="#c8b89a" strokeWidth="1.8"/>
      <circle cx="16" cy="16" r="5" stroke="#c8b89a" strokeWidth="1.8"/>
      <line x1="16" y1="5" x2="16" y2="2" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="16" y1="30" x2="16" y2="27" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="5" y1="16" x2="2" y2="16" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="30" y1="16" x2="27" y2="16" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="8" y="4" width="16" height="20" rx="1" stroke="#c8b89a" strokeWidth="1.8"/>
      <line x1="11" y1="9" x2="21" y2="9" stroke="#c8b89a" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="11" y1="13" x2="21" y2="13" stroke="#c8b89a" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="11" y1="17" x2="17" y2="17" stroke="#c8b89a" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
}
function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { setIdentity, joinRoom } = useGame();
  const { user, logout } = useAuth();

  const [mode, setMode] = useState(null);
  const [nickname, setNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDD, setShowDD] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomCode, setSelectedRoomCode] = useState(null);
  const ddRef = useRef(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!nickname.trim() || !roomName.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          hostNickname: user.username,
          roomName: roomName.trim(),
          maxPlayers,
          isPrivate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างห้องไม่สำเร็จ');
      setIdentity(data.playerId, nickname.trim());
      joinRoom(data.roomId, data.playerId, nickname.trim());
      navigate(`/lobby/${data.roomId}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!nickname.trim() || !code) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เข้าร่วมห้องไม่สำเร็จ');
      setIdentity(data.playerId, nickname.trim());
      joinRoom(data.roomId, data.playerId, nickname.trim());
      navigate(`/lobby/${data.roomId}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function fetchPublicRooms() {
    setLoadingRooms(true);
    try {
      const res = await fetch(API, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setPublicRooms(data.rooms || []);
    } catch (err) {
    } finally {
      setLoadingRooms(false);
    }
  }

  useEffect(() => {
    if (mode !== 'join') return;
    fetchPublicRooms();
    const interval = setInterval(fetchPublicRooms, 4000);
    return () => clearInterval(interval);
  }, [mode]);

  function selectRoomToJoin(code) {
    setSelectedRoomCode(code);
    setRoomCode(code);
  }

  function reset() { setMode(null); setError(null); setNickname(''); setRoomName(''); setRoomCode(''); setSelectedRoomCode(null); }

  return (
    <div className="home-page" style={{ backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined }}>
      <div className="home-overlay" />
      <div className="home-fog" />

      <div className="home-container">
<div className="home-topbar">
  <div className="home-auth-actions">
    {user ? (
      <div className="user-dropdown-wrap" ref={ddRef}>
        <button className="user-pill" onClick={() => setShowDD(v => !v)}>
          <span className="user-level-badge">Lv.{user.level ?? 1}</span>
          {user.username}
        </button>
        {showDD && (
          <div className="user-dropdown fade-in">
            <button className="user-dropdown-btn" onClick={logout}>ออกจากระบบ</button>
          </div>
        )}
      </div>
    ) : (
      <>
        <button className="auth-btn auth-btn-secondary" onClick={() => navigate('/login')}>
          เข้าสู่ระบบ
        </button>
        <button className="auth-btn auth-btn-primary" onClick={() => navigate('/register')}>
          สมัครสมาชิก
        </button>
      </>
    )}
  </div>
</div>
        <div className="home-header">
  <h1 className="home-title">WEREWOLF</h1>
</div>
        <div className="home-grid">
          <div className="home-left">
            {!mode && (
              <div className="menu-panel">
                <MenuBtn primary icon={<IconCreate />} title="Create Room"
                    sub="Create a new room and invite your friends"
                     onClick={() => user ? setMode('create') : setShowModal(true)} />
                <MenuBtn icon={<IconJoin />} title="Join Room" sub="Join with room code"
                     onClick={() => user ? setMode('join') : setShowModal(true)} />
                <MenuBtn
                  icon={<IconCustomize />}
                  title="Customize"
                  sub="Change your profile and preferences"
                  onClick={() => user ? navigate('/customize') : setShowModal(true)}
                />
                <MenuBtn
                  icon={<IconSettings />}
                  title="Settings"
                  sub="Game and audio settings"
                  onClick={() => navigate('/settings')}
                />              
              </div>
            )}

            {mode === 'create' && (
              <form onSubmit={handleCreate} className="home-form fade-in">
                <h2 className="form-title">สร้างห้องใหม่</h2>
                {error && <ErrorBox msg={error} />}
                <Field label="ชื่อของคุณ" id="nick" value={nickname} onChange={e => setNickname(e.target.value)} max={32} autoFocus />
                <Field label="ชื่อห้อง" id="room" value={roomName} onChange={e => setRoomName(e.target.value)} max={64} />

                <div className="settings-row">
                  <div className="field-col">
                    <label htmlFor="maxPlayers" className="field-label">จำนวนผู้เล่นสูงสุด</label>
                    <select
                      id="maxPlayers"
                      value={maxPlayers}
                      onChange={e => setMaxPlayers(Number(e.target.value))}
                      className="field-input"
                    >
                      {[4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} คน</option>
                      ))}
                    </select>
                  </div>

                  <label className="privacy-toggle">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={e => setIsPrivate(e.target.checked)}
                    />
                    <span>
                      ห้องส่วนตัว
                      <span className="privacy-hint">
                        {isPrivate ? 'ต้องใช้รหัสห้องเท่านั้นถึงเข้าได้' : 'ใครก็เห็นในรายการห้องสาธารณะ'}
                      </span>
                    </span>
                  </label>
                </div>

                <div className="btn-row">
                  <button type="submit" className="btn-primary" disabled={loading || !nickname.trim() || !roomName.trim()}>
                    {loading ? 'กำลังสร้าง...' : 'สร้างห้อง'}
                  </button>
                  <button type="button" className="btn-back" onClick={reset}>กลับ</button>
                </div>
              </form>
            )}

            {mode === 'join' && (
              <form onSubmit={handleJoin} className="home-form fade-in">
                <h2 className="form-title">เข้าร่วมห้อง</h2>
                {error && <ErrorBox msg={error} />}
                <Field label="ชื่อของคุณ" id="nick2" value={nickname} onChange={e => setNickname(e.target.value)} max={32} autoFocus />

                <div className="room-list-head">
                  <span className="field-label">ห้องที่เปิดอยู่</span>
                  <button type="button" onClick={fetchPublicRooms} className="refresh-btn" disabled={loadingRooms}>
                    {loadingRooms ? 'กำลังโหลด...' : '↻ รีเฟรช'}
                  </button>
                </div>

                <div className="room-list custom-scrollbar">
                  {publicRooms.length === 0 && !loadingRooms && (
                    <div className="room-list-empty">ยังไม่มีห้องสาธารณะเปิดอยู่ตอนนี้</div>
                  )}
                  {publicRooms.map(r => {
                    const full      = r.playerCount >= r.maxPlayers;
                    const inGame    = r.status !== 'waiting';
                    const disabled  = full || inGame;
                    const selected  = selectedRoomCode === r.id;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => !disabled && selectRoomToJoin(r.id)}
                        disabled={disabled}
                        className={`room-row ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
                      >
                        <div className="room-row-main">
                          <span className="room-row-name">{r.name}</span>
                          <span className="room-row-code">#{r.id}</span>
                        </div>
                        <div className="room-row-meta">
                          <span className={`room-status-badge ${inGame ? 'is-playing' : ''}`}>
                            {inGame ? 'กำลังเล่น' : 'รอผู้เล่น'}
                          </span>
                          <span className="room-row-count">{r.playerCount}/{r.maxPlayers} คน</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Field
                  label="หรือใส่รหัสห้อง (สำหรับห้องส่วนตัว)"
                  id="code"
                  value={roomCode}
                  onChange={e => { setRoomCode(e.target.value.toUpperCase()); setSelectedRoomCode(null); }}
                  max={8}
                  extraClassName="field-input-code"
                />

                <div className="btn-row">
                  <button type="submit" className="btn-primary" disabled={loading || !nickname.trim() || !roomCode.trim()}>
                    {loading ? 'กำลังเข้า...' : 'เข้าร่วม'}
                  </button>
                  <button type="button" className="btn-back" onClick={reset}>กลับ</button>
                </div>
              </form>
            )}

          {!mode && (
            <div className="player-bar">
              <div className="player-ava">
                {user ? user.username.charAt(0).toUpperCase() : <IconWolf />}
              </div>
              <div className="player-info">
                {user ? (
                  <>
                    <div className="player-name">{user.username}</div>
                    <div className="player-level">Level {user.level ?? 1}</div>
                    <div className="player-exp">
                      <div
                        className="player-exp-fill"
                        style={{ width: `${(((user.gamesPlayed ?? 0) % GAMES_PER_LEVEL) / GAMES_PER_LEVEL) * 100}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
              <div className="player-name">PlayerName</div>
              <div className="player-level">Level 1</div>
              <div className="player-exp">
                <div className="player-exp-fill" style={{ width: '30%' }} />
              </div>
            </>
           )}
          </div>
         </div>
          )}
          </div>

          <div className="home-right">
            <div className="panel-box">
              <div className="panel-head">
                <span className="panel-line" />
                <span className="panel-title">ข่าวสาร</span>
                <span className="panel-line" />
              </div>

              <div className="news-container">
                {NEWS.map(n => <NewsRow key={n.id} news={n} />)}
              </div>

              <div className="more-container">
                <button className="more-btn" onClick={() => navigate('/news')}>
                  More <span className="more-arrow">›</span>
                </button>
              </div>            
              </div>
          </div>
        </div>
      </div>

        <footer className="home-footer">
          <span className="version">v1.2.0</span>
          <div className="socials">
            <a className="soc-btn" title="Discord" href="https://discord.gg/PLACEHOLDER" target="_blank" rel="noopener noreferrer">
              <IconDiscord />
            </a>
            <a className="soc-btn" title="Facebook" href="https://facebook.com/PLACEHOLDER" target="_blank" rel="noopener noreferrer">
              <IconFacebook />
            </a>
            <a className="soc-btn" title="Website" href="https://PLACEHOLDER.com" target="_blank" rel="noopener noreferrer">
              <IconGlobe />
            </a>
          </div>
        </footer>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function NewsRow({ news }) {
  return (
    <div className="news-item">
      <div className="news-title">{news.title}</div>
      <div className="news-desc">{news.desc}</div>
      <div className="news-date">{news.date}</div>
    </div>
  );
}

function MenuBtn({ title, onClick, primary = false, icon }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={`menu-btn ${primary ? 'is-primary' : ''}`}>
      <div className="menu-icon">{icon}</div>
      <div className="menu-text">
        <div className="menu-title">{title}</div>
      </div>
    </button>
  );
}

function Field({ label, id, value, onChange, placeholder, max, autoFocus, extraClassName = '' }) {
  return (
    <div className="field-col">
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id} value={value} onChange={onChange}
        placeholder={placeholder} maxLength={max} autoFocus={autoFocus}
        className={`field-input ${extraClassName}`}
      />
    </div>
  );
}

function ErrorBox({ msg }) {
  return <div className="error-box">{msg}</div>;
}