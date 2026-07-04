import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame }  from '../context/Gamecontext.jsx';
import { useAuth }  from '../context/AuthContext.jsx';
import AuthModal    from '../src/components/AuthModal.jsx';
import bgHome       from '../src/assets/bgHome.png';
import '../src/styles/HomePage.css';

const API          = '/api/rooms';
const GAMES_PER_LV = 5;

/* ── Sarcastic narrator ── */
const TAGLINES = [
  'หมู่บ้านเงียบผิดปกติ... เงียบเกินไป',
  'ทุกคนมีความลับ บางคนมีมากกว่าหนึ่ง',
  'เรือกลับมาแล้ว แต่ไม่มีใครขึ้นฝั่ง',
  'โคมไฟยังติดอยู่ ทั้งที่ไม่มีใครอยู่บ้าน',
];

/* ── Current patch news (แก้เนื้อหาได้เอง) ── */
const NEWS = [
  {
    id: 1,
    tag: 'UPDATE',
    title: 'Homepage Redesign v2',
    date: '4 ก.ค. 2569',
    summary: 'ปรับ UI ใหม่ทั้งหมด — font ใหม่, animation entrance, wolf icon, news popup',
    detail: `รายละเอียดการอัปเดต Homepage v2:\n• เปลี่ยนฟอนต์เป็น Cinzel Decorative / Special Elite / Noto Sans Thai\n• เพิ่ม entrance animation (fade-in sequence)\n• เพิ่ม wolf SVG icon บนปุ่ม Create Room\n• ปุ่มเมนูมี hover glow + pop-up effect\n• News card กดดูรายละเอียดเป็น popup ได้\n• Footer แสดงชื่อเจ้าของลิขสิทธิ์`,
  },
  {
    id: 2,
    tag: 'FIX',
    title: 'Room Browser + Level System',
    date: '2 ก.ค. 2569',
    summary: 'เพิ่มหน้ารายการห้อง, ระบบ Level คำนวณจากจำนวนเกมที่เล่นจบ',
    detail: `• GET /api/rooms — ดึงรายการห้องสาธารณะแบบ real-time\n• Level = floor(games_played / 5) + 1\n• สร้างห้องเลือก max players (4–8) และ private/public ได้\n• แก้ bug import Gamecontext casing บน Linux`,
  },
  {
    id: 3,
    tag: 'DEV',
    title: 'Schema & Auth Fix',
    date: '28 มิ.ย. 2569',
    summary: 'แก้ users table column names, เพิ่ม games_played, fix session',
    detail: `• ALTER TABLE users เปลี่ยน user_id → id, user_name → username\n• เพิ่ม games_played INT DEFAULT 0\n• authController ส่ง level + gamesPlayed กลับทุก endpoint\n• roomService ผูก playerId กับ userId เมื่อ login`,
  },
];

/* ── Hover sound (Web Audio API — ไม่ต้องใช้ไฟล์เสียง) ── */
function playHoverSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(680, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (_) {}
}

/* ── Wolf sketch SVG (zany cartoon style) ── */
const WolfIcon = ({ size = 38 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-label="wolf">
    {/* ears */}
    <path d="M10 22 L6 8 L17 16Z" stroke="#D4A24C" strokeWidth="2" strokeLinejoin="round" fill="rgba(212,162,76,0.15)"/>
    <path d="M38 22 L42 8 L31 16Z" stroke="#D4A24C" strokeWidth="2" strokeLinejoin="round" fill="rgba(212,162,76,0.15)"/>
    {/* head */}
    <ellipse cx="24" cy="27" rx="15" ry="13" stroke="#D4A24C" strokeWidth="2" fill="rgba(15,17,21,0.6)"/>
    {/* bug eyes */}
    <circle cx="18" cy="24" r="4" stroke="#D4A24C" strokeWidth="1.5" fill="rgba(15,17,21,0.8)"/>
    <circle cx="30" cy="24" r="4" stroke="#D4A24C" strokeWidth="1.5" fill="rgba(15,17,21,0.8)"/>
    <circle cx="18.8" cy="23.2" r="1.8" fill="#D4A24C"/>
    <circle cx="30.8" cy="23.2" r="1.8" fill="#D4A24C"/>
    <circle cx="18.8" cy="23.2" r="0.7" fill="#0F1115"/>
    <circle cx="30.8" cy="23.2" r="0.7" fill="#0F1115"/>
    {/* snout */}
    <ellipse cx="24" cy="31" rx="5" ry="3.5" stroke="#D4A24C" strokeWidth="1.5" fill="rgba(139,94,60,0.3)"/>
    {/* nose */}
    <ellipse cx="24" cy="29.5" rx="2" ry="1.2" fill="#D4A24C"/>
    {/* grin */}
    <path d="M19.5 34 Q24 37 28.5 34" stroke="#D4A24C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* fangs */}
    <path d="M21.5 34 L20.5 36.5" stroke="#ECECEC" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M26.5 34 L27.5 36.5" stroke="#ECECEC" strokeWidth="1.2" strokeLinecap="round"/>
    {/* fur tuft */}
    <path d="M13 20 Q10 17 12 14" stroke="#D4A24C" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    <path d="M35 20 Q38 17 36 14" stroke="#D4A24C" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
  </svg>
);

/* ── Customize pencil SVG ── */
const CustomizeIcon = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* person body */}
    <circle cx="20" cy="16" r="6" stroke="#D4A24C" strokeWidth="1.8" fill="rgba(15,17,21,0.6)"/>
    <path d="M8 36 Q8 26 20 26 Q32 26 32 36" stroke="#D4A24C" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    {/* pencil top-right */}
    <g transform="translate(27,4) rotate(40)">
      <rect x="0" y="0" width="5" height="12" rx="1" stroke="#D4A24C" strokeWidth="1.4" fill="rgba(212,162,76,0.2)"/>
      <polygon points="0,12 5,12 2.5,16" stroke="#D4A24C" strokeWidth="1" fill="#D4A24C"/>
    </g>
  </svg>
);

/* ── Join Door SVG ── */
const JoinIcon = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="6" width="18" height="28" rx="2" stroke="#D4A24C" strokeWidth="1.8" fill="rgba(139,94,60,0.2)"/>
    <circle cx="22" cy="21" r="1.8" fill="#D4A24C"/>
    <path d="M28 20 L38 20 M34 16 L38 20 L34 24" stroke="#D4A24C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Settings gear SVG ── */
const SettingsIcon = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="5" stroke="#D4A24C" strokeWidth="2"/>
    {[0,45,90,135,180,225,270,315].map(a => {
      const r = a * Math.PI / 180;
      const x1 = 20 + 9  * Math.sin(r), y1 = 20 - 9  * Math.cos(r);
      const x2 = 20 + 13 * Math.sin(r), y2 = 20 - 13 * Math.cos(r);
      return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D4A24C" strokeWidth="2.5" strokeLinecap="round"/>;
    })}
  </svg>
);

/* ── Default wolf avatar (derpy) ── */
const DefaultAvatar = () => (
  <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="24" cy="28" rx="14" ry="12" fill="rgba(29,33,41,1)" stroke="#343B46" strokeWidth="1.5"/>
    <path d="M11 24 L7 10 L16 18Z" fill="rgba(29,33,41,1)" stroke="#343B46" strokeWidth="1.5"/>
    <path d="M37 24 L41 10 L32 18Z" fill="rgba(29,33,41,1)" stroke="#343B46" strokeWidth="1.5"/>
    <circle cx="18.5" cy="25" r="4.5" fill="#0F1115" stroke="#D4A24C" strokeWidth="1.5"/>
    <circle cx="29.5" cy="25" r="4.5" fill="#0F1115" stroke="#D4A24C" strokeWidth="1.5"/>
    <circle cx="19.5" cy="24" r="2" fill="#D4A24C"/>
    <circle cx="30.5" cy="24" r="2" fill="#D4A24C"/>
    <circle cx="19.5" cy="24" r="0.9" fill="#0F1115"/>
    <circle cx="30.5" cy="24" r="0.9" fill="#0F1115"/>
    <ellipse cx="24" cy="31.5" rx="5" ry="3.5" fill="rgba(139,94,60,0.35)" stroke="#343B46" strokeWidth="1"/>
    <ellipse cx="24" cy="30" rx="2" ry="1.3" fill="#8B5E3C"/>
    <path d="M20 35 Q24 38 28 35" stroke="#D4A24C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M22 35 L21 37.5" stroke="#ECECEC" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M26 35 L27 37.5" stroke="#ECECEC" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export default function HomePage() {
  const navigate = useNavigate();
  const { setIdentity, joinRoom } = useGame();
  const { user, logout } = useAuth();

  const [entered,    setEntered]    = useState(false);
  const [showLogo,   setShowLogo]   = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);
  const [showNews,   setShowNews]   = useState(false);
  const [mode,       setMode]       = useState(null);
  const [nickname,   setNickname]   = useState('');
  const [roomName,   setRoomName]   = useState('');
  const [roomCode,   setRoomCode]   = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate,  setIsPrivate]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [showModal,  setShowModal]  = useState(false);
  const [showDD,     setShowDD]     = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newsPopup,  setNewsPopup]  = useState(null);
  const [tagline]    = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);

  /* Entrance sequence */
  useEffect(() => {
    const t1 = setTimeout(() => setEntered(true),  100);
    const t2 = setTimeout(() => setShowLogo(true),  600);
    const t3 = setTimeout(() => setShowMenu(true), 1100);
    const t4 = setTimeout(() => setShowNews(true), 1500);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!nickname.trim() || !roomName.trim()) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(API, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        credentials: 'include',
        body: JSON.stringify({ hostNickname: user.username, roomName: roomName.trim(), maxPlayers, isPrivate }),
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
      const res  = await fetch(`${API}/${code}/join`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        credentials: 'include',
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
      const res  = await fetch(API, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setPublicRooms(data.rooms || []);
    } catch (_) {}
    finally { setLoadingRooms(false); }
  }

  useEffect(() => {
    if (mode !== 'join') return;
    fetchPublicRooms();
    const t = setInterval(fetchPublicRooms, 4000);
    return () => clearInterval(t);
  }, [mode]);

  function reset() {
    setMode(null); setError(null);
    setNickname(''); setRoomName(''); setRoomCode(''); setSelectedRoom(null);
  }

  const gamesPlayed  = user?.gamesPlayed ?? 0;
  const level        = user?.level ?? 1;
  const expPct       = (gamesPlayed % GAMES_PER_LV) / GAMES_PER_LV * 100;

  return (
    <div className={`hp-page ${entered ? 'is-entered' : ''}`}
         style={{ backgroundImage: `url(${bgHome})` }}>

      {/* Atmospheric layers */}
      <div className="hp-overlay"/>
      <div className="hp-fog"/>
      <div className="hp-vignette"/>

      <div className="hp-container">

        {/* ── Header ── */}
        <header className="hp-header">
          <div className="hp-brand">
            <span className="hp-brand-icon"><WolfIcon size={28}/></span>
            <span className="hp-brand-sub">We're Not Wolf</span>
          </div>

          <div className="hp-auth">
            {user ? (
              <div className="hp-user-wrap">
                <button className="hp-user-pill"
                        onMouseEnter={playHoverSound}
                        onClick={() => setShowDD(v => !v)}>
                  <span className="hp-badge-lv">Lv.{level}</span>
                  <span className="hp-user-name">{user.username}</span>
                  <span className="hp-chevron">{showDD ? '▲' : '▼'}</span>
                </button>
                {showDD && (
                  <div className="hp-user-dropdown fade-slide-in">
                    <button className="hp-dd-item" onClick={() => { setShowDD(false); navigate('/settings'); }}>
                      ⚙ ตั้งค่า
                    </button>
                    <button className="hp-dd-item hp-dd-danger"
                            onMouseEnter={playHoverSound}
                            onClick={logout}>
                      ← ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hp-auth-btns">
                <button className="hp-btn-login"
                        onMouseEnter={playHoverSound}
                        onClick={() => navigate('/login')}>
                  เข้าสู่ระบบ
                </button>
                <button className="hp-btn-register"
                        onMouseEnter={playHoverSound}
                        onClick={() => navigate('/register')}>
                  สมัครสมาชิก
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ── Logo ── */}
        <div className={`hp-logo-wrap ${showLogo ? 'is-visible' : ''}`}>
          <h1 className="hp-logo-line1">WE'RE NOT</h1>
          <h1 className="hp-logo-line2">WOLF</h1>
          <div className="hp-logo-ornament">
            <span className="hp-orn-line"/><span className="hp-orn-diamond"/><span className="hp-orn-line"/>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="hp-grid">

          {/* Left — menu + player bar */}
          <div className={`hp-left ${showMenu ? 'is-visible' : ''}`}>
            {!mode && (
              <div className="hp-menu-panel">
                <MenuBtn
                  primary
                  Icon={WolfIcon}
                  title="สร้างห้อง"
                  onClick={() => user ? setMode('create') : setShowModal(true)}
                />
                <MenuBtn
                  Icon={JoinIcon}
                  title="เข้าร่วมห้อง"
                  onClick={() => user ? setMode('join') : setShowModal(true)}
                />
                <MenuBtn
                  Icon={CustomizeIcon}
                  title="ตกแต่งตัวละคร"
                  onClick={() => user ? navigate('/customize') : setShowModal(true)}
                />
                <MenuBtn
                  Icon={SettingsIcon}
                  title="ตั้งค่า"
                  onClick={() => navigate('/settings')}
                />
              </div>
            )}

            {mode === 'create' && (
              <form onSubmit={handleCreate} className="hp-form fade-slide-in">
                <h2 className="hp-form-title">สร้างห้องใหม่</h2>
                {error && <div className="hp-error shake">{error}</div>}
                <Field label="ชื่อของคุณ" id="nick"  value={nickname} onChange={e => setNickname(e.target.value)}  max={32} autoFocus />
                <Field label="ชื่อห้อง"   id="room"  value={roomName} onChange={e => setRoomName(e.target.value)}  max={64} />
                <div className="hp-form-row">
                  <div className="hp-field-group" style={{ flex: 1 }}>
                    <label className="hp-field-label">จำนวนผู้เล่นสูงสุด</label>
                    <select value={maxPlayers} onChange={e => setMaxPlayers(+e.target.value)} className="hp-input">
                      {[4,5,6,7,8].map(n => <option key={n} value={n}>{n} คน</option>)}
                    </select>
                  </div>
                  <label className="hp-privacy-toggle">
                    <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)}/>
                    <span>ห้องส่วนตัว<small>{isPrivate ? 'เข้าได้ด้วยรหัสเท่านั้น' : 'ใครก็เข้าได้'}</small></span>
                  </label>
                </div>
                <div className="hp-btn-row">
                  <button type="submit" className="hp-btn-primary" disabled={loading || !nickname.trim() || !roomName.trim()}>
                    {loading ? 'กำลังสร้าง...' : 'สร้างห้อง'}
                  </button>
                  <button type="button" className="hp-btn-back" onClick={reset}>กลับ</button>
                </div>
              </form>
            )}

            {mode === 'join' && (
              <form onSubmit={handleJoin} className="hp-form fade-slide-in">
                <h2 className="hp-form-title">เข้าร่วมห้อง</h2>
                {error && <div className="hp-error shake">{error}</div>}
                <Field label="ชื่อของคุณ" id="nick2" value={nickname} onChange={e => setNickname(e.target.value)} max={32} autoFocus />
                <div className="hp-room-list-head">
                  <span className="hp-field-label">ห้องที่เปิดอยู่</span>
                  <button type="button" className="hp-refresh-btn" onClick={fetchPublicRooms} disabled={loadingRooms}>
                    {loadingRooms ? '...' : '↻'}
                  </button>
                </div>
                <div className="hp-room-list custom-scrollbar">
                  {publicRooms.length === 0 && !loadingRooms && (
                    <p className="hp-room-empty">หมู่บ้านเงียบผิดปกติ... เงียบเกินไป</p>
                  )}
                  {publicRooms.map(r => {
                    const full  = r.playerCount >= r.maxPlayers;
                    const live  = r.status !== 'waiting';
                    const sel   = selectedRoom === r.id;
                    return (
                      <button key={r.id} type="button"
                        disabled={full || live}
                        className={`hp-room-row ${sel ? 'is-sel' : ''} ${full||live ? 'is-off' : ''}`}
                        onClick={() => { setSelectedRoom(r.id); setRoomCode(r.id); }}>
                        <div>
                          <span className="hp-room-name">{r.name}</span>
                          <span className="hp-room-code">#{r.id}</span>
                        </div>
                        <div className="hp-room-right">
                          <span className={`hp-room-badge ${live ? 'is-live' : ''}`}>{live ? 'กำลังเล่น' : 'รอผู้เล่น'}</span>
                          <span className="hp-room-cnt">{r.playerCount}/{r.maxPlayers}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Field label="หรือใส่รหัสห้อง" id="code" value={roomCode}
                  onChange={e => { setRoomCode(e.target.value.toUpperCase()); setSelectedRoom(null); }}
                  max={8} extraClass="hp-code-input" />
                <div className="hp-btn-row">
                  <button type="submit" className="hp-btn-primary" disabled={loading || !nickname.trim() || !roomCode.trim()}>
                    {loading ? 'กำลังเข้า...' : 'เข้าร่วม'}
                  </button>
                  <button type="button" className="hp-btn-back" onClick={reset}>กลับ</button>
                </div>
              </form>
            )}

            {/* Player bar */}
            {!mode && (
              <div className="hp-player-bar">
                <div className="hp-avatar">
                  {user ? (
                    <span className="hp-avatar-initial">{user.username.charAt(0).toUpperCase()}</span>
                  ) : (
                    <DefaultAvatar />
                  )}
                </div>
                <div className="hp-player-info">
                  {user ? (
                    <>
                      <span className="hp-player-name">{user.username}</span>
                      <span className="hp-player-level">Level {level}</span>
                      <div className="hp-exp-bar">
                        <div className="hp-exp-fill" style={{ width: `${expPct}%` }}/>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="hp-player-name">คนแปลกหน้า</span>
                      <span className="hp-player-level">เข้าสู่ระบบเพื่อบันทึกระดับ</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right — news */}
          <div className={`hp-right ${showNews ? 'is-visible' : ''}`}>
            <div className="hp-news-panel">
              <div className="hp-news-head">
                <span className="hp-news-line"/><span className="hp-news-title">นกส่งสาร</span><span className="hp-news-line"/>
              </div>
              <div className="hp-news-list">
                {NEWS.map(n => (
                  <div key={n.id} className="hp-news-card" onClick={() => setNewsPopup(n)}>
                    <span className={`hp-news-tag tag-${n.tag.toLowerCase()}`}>{n.tag}</span>
                    <div className="hp-news-body">
                      <p className="hp-news-ttl">{n.title}</p>
                      <p className="hp-news-sum">{n.summary}</p>
                    </div>
                    <span className="hp-news-date">{n.date}</span>
                  </div>
                ))}
              </div>
              <div className="hp-news-footer">
                <button className="hp-btn-news-all" onMouseEnter={playHoverSound}
                        onClick={() => navigate('/news')}>
                  ดูทั้งหมด →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="hp-footer">
        <span className="hp-footer-tag" title={tagline}>🐺 {tagline}</span>
        <span className="hp-footer-copy">© 2026 Nanthaphat &amp; Punyaphat · v1.2.0</span>
        <div className="hp-socials">
          {['D','F','𝕏'].map(x => <span key={x} className="hp-soc">{x}</span>)}
        </div>
      </footer>

      {/* News popup */}
      {newsPopup && (
        <div className="hp-popup-bg" onClick={() => setNewsPopup(null)}>
          <div className="hp-popup fade-slide-in" onClick={e => e.stopPropagation()}>
            <button className="hp-popup-close" onClick={() => setNewsPopup(null)}>✕</button>
            <span className={`hp-news-tag tag-${newsPopup.tag.toLowerCase()}`}>{newsPopup.tag}</span>
            <h2 className="hp-popup-title">{newsPopup.title}</h2>
            <p className="hp-popup-date">{newsPopup.date}</p>
            <pre className="hp-popup-detail">{newsPopup.detail}</pre>
          </div>
        </div>
      )}

      {showModal && <AuthModal onClose={() => setShowModal(false)}/>}
    </div>
  );
}

/* ── Sub-components ── */
function MenuBtn({ Icon, title, onClick, primary = false }) {
  return (
    <button
      type="button"
      className={`hp-menu-btn ${primary ? 'is-primary' : ''}`}
      onClick={onClick}
      onMouseEnter={playHoverSound}
    >
      <span className="hp-menu-icon"><Icon size={36}/></span>
      <span className="hp-menu-title">{title}</span>
    </button>
  );
}

function Field({ label, id, value, onChange, max, autoFocus, extraClass = '' }) {
  return (
    <div className="hp-field-group">
      <label htmlFor={id} className="hp-field-label">{label}</label>
      <input id={id} value={value} onChange={onChange} maxLength={max} autoFocus={autoFocus}
             className={`hp-input ${extraClass}`}/>
    </div>
  );
}