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

/* Sarcastic narrator messages — southern village voice */
const TAGLINES = [
  'ทุกคนบริสุทธิ์ใจ อย่างแน่นอน',
  'อย่าไว้ใจใคร โดยเฉพาะตัวเอง',
  'หมู่บ้านรอคุณอยู่นานแล้ว',
  'มีคนโกหกอยู่ที่นี่ น่าจะเป็นคุณ',
  'เรือกลับมาแล้ว แต่ไม่มีใครขึ้นฝั่ง',
  'โคมไฟยังติดอยู่ ทั้งที่ไม่มีใครอยู่บ้าน',
];

const NEWS = [
  {
    id: 1,
    tag: 'อัปเดต',
    title: 'อัปเดตเวอร์ชัน 1.2.0',
    desc: 'เพิ่มระบบรายงานผู้เล่น และปรับสมดุลเกม',
    date: '24/06/2026',
  },
  {
    id: 2,
    tag: 'กิจกรรม',
    title: 'กิจกรรม : คืนหมาป่า',
    desc: 'เล่นครบ 3 เกม รับของรางวัลพิเศษ !',
    date: '24/06/2026',
  },
  {
    id: 3,
    tag: 'ประกาศ',
    title: 'ปิดปรับปรุงระบบ',
    desc: 'ปรับปรุงเซิร์ฟเวอร์ในวันที่ 30/06/2026',
    date: '24/06/2026',
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

/* ── Audio paths — placeholders, replace with real files when ready ── */
const BGM_SRC = null;        // e.g. import bgm from '../src/assets/audio/bgm.mp3'
const HOVER_SFX_SRC = null;  // e.g. import hoverSfx from '../src/assets/audio/hover.mp3'

/* ── Main Component ── */
export default function HomePage() {
  const navigate = useNavigate();
  const { setIdentity, joinRoom } = useGame();
  const { user, logout } = useAuth();

  const bgmRef = useRef(null);
  const hoverSfxRef = useRef(null);

  /* Background music — plays once on entrance, respects browser autoplay policy */
  useEffect(() => {
    if (!BGM_SRC) return; // silent until a real file is wired in
    const audio = new Audio(BGM_SRC);
    audio.loop = true;
    audio.volume = 0.35;
    bgmRef.current = audio;
    audio.play().catch(() => {
      // Autoplay blocked — will start on first user interaction instead
      const resume = () => {
        audio.play().catch(() => {});
        document.removeEventListener('click', resume);
      };
      document.addEventListener('click', resume, { once: true });
    });
    return () => { audio.pause(); };
  }, []);

  function playHoverSfx() {
    if (!HOVER_SFX_SRC) return; // silent until a real file is wired in
    if (!hoverSfxRef.current) hoverSfxRef.current = new Audio(HOVER_SFX_SRC);
    const sfx = hoverSfxRef.current.cloneNode();
    sfx.volume = 0.4;
    sfx.play().catch(() => {});
  }

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
    <div className="home-page entrance-page" style={{ backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined }}>
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
                      หนีแล้วหรอ?
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button className="auth-btn auth-btn-secondary" onClick={() => navigate('/login')} onMouseEnter={playHoverSfx}>
                  เข้าสู่ระบบ
                </button>
                <button className="auth-btn auth-btn-primary" onClick={() => navigate('/register')} onMouseEnter={playHoverSfx}>
                  สมัครสมาชิก
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Title ── */}
        <div className="home-header entrance-logo">
          <h1 className="home-title">WE'RE NOT WOLF</h1>
          <div className="title-ornament">
            <span className="title-ornament-line" />
            <span className="title-ornament-mark" />
            <span className="title-ornament-line" />
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="home-grid">

          {/* LEFT */}
          <div className="home-left entrance-menu">
            {!mode && (
              <div className="menu-panel">
                <MenuBtn
                  primary
                  icon={<IconCreate />}
                  title="สร้างห้อง"
                  onClick={() => user ? setMode('create') : setShowModal(true)}
                  onHover={playHoverSfx}
                />
                <div className="menu-divider" />
                <MenuBtn
                  icon={<IconJoin />}
                  title="เข้าร่วมห้อง"
                  onClick={() => user ? setMode('join') : setShowModal(true)}
                  onHover={playHoverSfx}
                />
                <div className="menu-divider" />
                <MenuBtn
                  icon={<IconSettings />}
                  title="การตั้งค่า"
                  onClick={() => navigate('/settings')}
                  onHover={playHoverSfx}
                />
              </div>
            )}

            {mode === 'create' && (
              <form onSubmit={handleCreate} className="home-form fade-in">
                <h2 className="form-title">สร้างห้องใหม่</h2>
                {error && <ErrorBox msg={error} />}
                <Field label="ชื่อของคุณ" id="nick" value={nickname}
                  onChange={e => setNickname(e.target.value)} max={32} autoFocus />
                <Field label="ชื่อห้อง" id="room" value={roomName}
                  onChange={e => setRoomName(e.target.value)} max={64} />
                <div className="settings-row">
                  <div className="field-col">
                    <label htmlFor="maxPlayers" className="field-label">จำนวนผู้เล่นสูงสุด</label>
                    <select id="maxPlayers" value={maxPlayers}
                      onChange={e => setMaxPlayers(Number(e.target.value))}
                      className="field-input">
                      {[4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} คน</option>
                      ))}
                    </select>
                  </div>
                  <label className="privacy-toggle">
                    <input type="checkbox" checked={isPrivate}
                      onChange={e => setIsPrivate(e.target.checked)} />
                    <span>
                      ห้องส่วนตัว
                      <span className="privacy-hint">
                        {isPrivate ? 'เฉพาะผู้ที่ได้รับเชิญเท่านั้น' : 'คนน่าสงสัยก็เข้าได้เหมือนกัน'}
                      </span>
                    </span>
                  </label>
                </div>
                <div className="btn-row">
                  <button type="submit" className="btn-primary"
                    disabled={loading || !nickname.trim() || !roomName.trim()}>
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
                <Field label="ชื่อของคุณ" id="nick2" value={nickname}
                  onChange={e => setNickname(e.target.value)} max={32} autoFocus />

                <div className="room-list-head">
                  <span className="field-label">ห้องที่เปิดอยู่</span>
                  <button type="button" onClick={fetchPublicRooms}
                    className="refresh-btn" disabled={loadingRooms}>
                    {loadingRooms ? 'กำลังโหลด...' : '↻ รีเฟรช'}
                  </button>
                </div>

                <div className="room-list custom-scrollbar">
                  {publicRooms.length === 0 && !loadingRooms && (
                    <div className="room-list-empty">
                      หมู่บ้านเงียบผิดปกติ... เงียบเกินไป
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
                            {inGame ? 'กำลังเล่น' : 'รอผู้เล่น'}
                          </span>
                          <span className="room-row-count">{r.playerCount}/{r.maxPlayers} คน</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Field label="หรือกรอกรหัสห้อง (สำหรับห้องส่วนตัว)"
                  id="code" value={roomCode}
                  onChange={e => { setRoomCode(e.target.value.toUpperCase()); setSelectedRoomCode(null); }}
                  max={8} extraClassName="field-input-code" />

                <div className="btn-row">
                  <button type="submit" className="btn-primary"
                    disabled={loading || !nickname.trim() || !roomCode.trim()}>
                    {loading ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
                  </button>
                  <button type="button" className="btn-back" onClick={reset}>กลับ</button>
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
                    {user ? user.username : 'คนแปลกหน้า'}
                  </div>
                  <div className="player-level">
                    {user ? `ระดับ ${user.level ?? 1}` : 'เข้าสู่ระบบเพื่อบันทึกความคืบหน้า'}
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
          <div className="home-right entrance-news">
            <div className="panel-box">
              <div className="panel-head">
                <span className="panel-line" />
                <span className="panel-title">นกส่งสาร</span>
                <span className="panel-line" />
              </div>

              <div className="news-container">
                {NEWS.map(n => <NewsRow key={n.id} news={n} />)}
              </div>

              <div className="more-container">
                <button className="more-btn" onClick={() => navigate('/news')}>
                  ดูทั้งหมด <span className="more-arrow"><IconArrow /></span>
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

function MenuBtn({ title, sub, onClick, primary = false, icon, onHover }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      onMouseEnter={onHover}
      className={`menu-btn ${primary ? 'is-primary' : ''}`}>
      <div className="menu-icon">{icon}</div>
      <div className="menu-text">
        <div className="menu-title">{title}</div>
        {sub && <div className="menu-sub">{sub}</div>}
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