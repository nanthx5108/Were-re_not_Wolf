import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/Gamecontext.jsx';
import bgHome from '../src/assets/bgHome.png';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from '../src/components/AuthModal.jsx';
import '../src/styles/HomePage.css';

const BG_IMAGE = bgHome;
const API = '/api/rooms';
const GAMES_PER_LEVEL = 5;

/* Sarcastic narrator messages */
const TAGLINES = [
  "Everyone's innocent. Obviously.",
  "Trust no one. Especially yourself.",
  "The village has been waiting for you.",
  "Someone here is lying. Probably you.",
];

const NEWS = [
  {
    id: 1,
    tag: 'UPDATE',
    title: 'New Update 1.2.0',
    desc: 'เพิ่มระบบรายงานผู้เล่น และปรับสมดุลเกม',
    date: '6/24/2026',
  },
  {
    id: 2,
    tag: 'EVENT',
    title: 'Event : Werewolf Night',
    desc: 'เล่นครบ 3 เกม รับของรางวัลพิเศษ !',
    date: '6/24/2026',
  },
  {
    id: 3,
    tag: 'NOTICE',
    title: 'Maintenance',
    desc: 'ปรับปรุงเซิร์ฟเวอร์ในวันที่ 6/24/2026',
    date: '6/24/2026',
  },
];

/* ── SVG Icons ── */
function IconCreate() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4"/>
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="16" y1="11" x2="22" y2="11"/>
    </svg>
  );
}

function IconJoin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  );
}

function IconCustomize() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function IconWolf() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <ellipse cx="16" cy="20" rx="10" ry="7" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
      <circle cx="16" cy="13" r="7" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
      <path d="M11 10 L8 4 L12 9.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
      <path d="M21 10 L24 4 L20 9.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8"/>
      <circle cx="13" cy="13.5" r="1.2" fill="rgba(180,200,255,0.6)"/>
      <circle cx="19" cy="13.5" r="1.2" fill="rgba(180,200,255,0.6)"/>
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

/* ── Main Component ── */
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

  /* Random tagline */
  const tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];

  /* Close dropdown on outside click */
  useEffect(() => {
    function handleClick(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) setShowDD(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
          hostNickname: user?.username || nickname.trim(),
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
    } catch { /* silent */ }
    finally { setLoadingRooms(false); }
  }

  useEffect(() => {
    if (mode !== 'join') return;
    fetchPublicRooms();
    const id = setInterval(fetchPublicRooms, 5000);
    return () => clearInterval(id);
  }, [mode]);

  function selectRoomToJoin(code) {
    setSelectedRoomCode(code);
    setRoomCode(code);
  }

  function reset() {
    setMode(null); setError(null); setNickname('');
    setRoomName(''); setRoomCode(''); setSelectedRoomCode(null);
  }

  return (
    <div className="home-page" style={{ backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined }}>
      <div className="home-overlay" />
      <div className="home-fog" />

      <div className="home-container">
        {/* ── Topbar ── */}
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
                    <button className="user-dropdown-btn" onClick={() => { logout(); setShowDD(false); }}>
                      Running away?
                    </button>
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

        {/* ── Title ── */}
        <div className="home-header">
          <h1 className="home-title">WE'RE NOT WOLF</h1>
          <div className="title-ornament">
            <span className="title-ornament-line" />
            <span className="title-ornament-mark" />
            <span className="title-ornament-line" />
          </div>
          <p className="title-tagline">{tagline}</p>
        </div>

        {/* ── Grid ── */}
        <div className="home-grid">

          {/* LEFT */}
          <div className="home-left">
            {!mode && (
              <div className="menu-panel fade-in">
                <MenuBtn
                  primary
                  icon={<IconCreate />}
                  title="Create Room"
                  sub="Good luck managing this disaster."
                  onClick={() => user ? setMode('create') : setShowModal(true)}
                />
                <div className="menu-divider" />
                <MenuBtn
                  icon={<IconJoin />}
                  title="Join Room"
                  sub="Hope they don't vote you first."
                  onClick={() => user ? setMode('join') : setShowModal(true)}
                />
                <div className="menu-divider" />
                <MenuBtn
                  icon={<IconCustomize />}
                  title="Customize"
                  sub="Look suspicious in your own way."
                  onClick={() => user ? navigate('/customize') : setShowModal(true)}
                />
                <div className="menu-divider" />
                <MenuBtn
                  icon={<IconSettings />}
                  title="Settings"
                  sub="Game and audio settings."
                  onClick={() => navigate('/settings')}
                />
              </div>
            )}

            {mode === 'create' && (
              <form onSubmit={handleCreate} className="home-form fade-in">
                <h2 className="form-title">Create Room</h2>
                {error && <ErrorBox msg={error} />}
                <Field label="Your name" id="nick" value={nickname}
                  onChange={e => setNickname(e.target.value)} max={32} autoFocus />
                <Field label="Room name" id="room" value={roomName}
                  onChange={e => setRoomName(e.target.value)} max={64} />
                <div className="settings-row">
                  <div className="field-col">
                    <label htmlFor="maxPlayers" className="field-label">Max players</label>
                    <select id="maxPlayers" value={maxPlayers}
                      onChange={e => setMaxPlayers(Number(e.target.value))}
                      className="field-input">
                      {[4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} players</option>
                      ))}
                    </select>
                  </div>
                  <label className="privacy-toggle">
                    <input type="checkbox" checked={isPrivate}
                      onChange={e => setIsPrivate(e.target.checked)} />
                    <span>
                      Private room
                      <span className="privacy-hint">
                        {isPrivate ? 'Invite only.' : 'Anyone suspicious can join.'}
                      </span>
                    </span>
                  </label>
                </div>
                <div className="btn-row">
                  <button type="submit" className="btn-primary"
                    disabled={loading || !nickname.trim() || !roomName.trim()}>
                    {loading ? 'Creating...' : 'Create Room'}
                  </button>
                  <button type="button" className="btn-back" onClick={reset}>Back</button>
                </div>
              </form>
            )}

            {mode === 'join' && (
              <form onSubmit={handleJoin} className="home-form fade-in">
                <h2 className="form-title">Join Room</h2>
                {error && <ErrorBox msg={error} />}
                <Field label="Your name" id="nick2" value={nickname}
                  onChange={e => setNickname(e.target.value)} max={32} autoFocus />

                <div className="room-list-head">
                  <span className="field-label">Open rooms</span>
                  <button type="button" onClick={fetchPublicRooms}
                    className="refresh-btn" disabled={loadingRooms}>
                    {loadingRooms ? 'Loading...' : '↻ Refresh'}
                  </button>
                </div>

                <div className="room-list custom-scrollbar">
                  {publicRooms.length === 0 && !loadingRooms && (
                    <div className="room-list-empty">
                      The village is quiet. Too quiet.
                    </div>
                  )}
                  {publicRooms.map(r => {
                    const full = r.playerCount >= r.maxPlayers;
                    const inGame = r.status !== 'waiting';
                    const disabled = full || inGame;
                    const selected = selectedRoomCode === r.id;
                    return (
                      <button type="button" key={r.id}
                        onClick={() => !disabled && selectRoomToJoin(r.id)}
                        disabled={disabled}
                        className={`room-row ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}>
                        <div className="room-row-main">
                          <span className="room-row-name">{r.name}</span>
                          <span className="room-row-code">#{r.id}</span>
                        </div>
                        <div className="room-row-meta">
                          <span className={`room-status-badge ${inGame ? 'is-playing' : ''}`}>
                            {inGame ? 'In game' : 'Waiting'}
                          </span>
                          <span className="room-row-count">{r.playerCount}/{r.maxPlayers}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Field label="Or enter room code (private rooms)"
                  id="code" value={roomCode}
                  onChange={e => { setRoomCode(e.target.value.toUpperCase()); setSelectedRoomCode(null); }}
                  max={8} extraClassName="field-input-code" />

                <div className="btn-row">
                  <button type="submit" className="btn-primary"
                    disabled={loading || !nickname.trim() || !roomCode.trim()}>
                    {loading ? 'Joining...' : 'Join Room'}
                  </button>
                  <button type="button" className="btn-back" onClick={reset}>Back</button>
                </div>
              </form>
            )}

            {/* Player bar */}
            {!mode && (
              <div className="player-bar fade-in">
                <div className="player-ava">
                  {user ? user.username.charAt(0).toUpperCase() : <IconWolf />}
                </div>
                <div className="player-info">
                  <div className="player-name">
                    {user ? user.username : 'Anonymous Villager'}
                  </div>
                  <div className="player-level">
                    {user ? `Level ${user.level ?? 1}` : 'Sign in to save your progress'}
                  </div>
                  {user && (
                    <div className="player-exp">
                      <div className="player-exp-fill"
                        style={{ width: `${(((user.gamesPlayed ?? 0) % GAMES_PER_LEVEL) / GAMES_PER_LEVEL) * 100}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — News */}
          <div className="home-right">
            <div className="panel-box fade-in">
              <div className="panel-head">
                <span className="panel-line" />
                <span className="panel-title">The Raven's News</span>
                <span className="panel-line" />
              </div>

              <div className="news-container">
                {NEWS.map(n => <NewsRow key={n.id} news={n} />)}
              </div>

              <div className="more-container">
                <button className="more-btn" onClick={() => navigate('/news')}>
                  All news <span className="more-arrow"><IconArrow /></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
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

/* ── Sub-components ── */
function NewsRow({ news }) {
  return (
    <div className="news-item">
      <div className="news-tag">{news.tag}</div>
      <div className="news-title">{news.title}</div>
      <div className="news-desc">{news.desc}</div>
      <div className="news-date">{news.date}</div>
    </div>
  );
}

function MenuBtn({ title, sub, onClick, primary = false, icon }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={`menu-btn ${primary ? 'is-primary' : ''}`}>
      <div className="menu-icon">{icon}</div>
      <div className="menu-text">
        <div className="menu-title">{title}</div>
        <div className="menu-sub">{sub}</div>
      </div>
      <span className="menu-arrow"><IconArrow /></span>
    </button>
  );
}

function Field({ label, id, value, onChange, placeholder, max, autoFocus, extraClassName = '' }) {
  return (
    <div className="field-col">
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} value={value} onChange={onChange}
        placeholder={placeholder} maxLength={max} autoFocus={autoFocus}
        className={`field-input ${extraClassName}`} />
    </div>
  );
}

function ErrorBox({ msg }) {
  return <div className="error-box">{msg}</div>;
}