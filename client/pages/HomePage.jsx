import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import bgHome from '../src/assets/bgHome.png';
import { useAuth }  from '../context/AuthContext.jsx';
import AuthModal    from '../src/components/AuthModal.jsx';

const BG_IMAGE = bgHome;
const API = '/api/rooms';


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

export default function HomePage() {
  const navigate = useNavigate();
  const { setIdentity, joinRoom } = useGame();
  const { user, logout } = useAuth();

  const [mode, setMode] = useState(null);
  const [nickname, setNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDD, setShowDD] = useState(false);
  const ddRef = useRef(null);

  function requireAuth() {
    if (!user) {
      setShowModal(true);
      return false;
    }
    return true;
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!nickname.trim() || !roomName.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostNickname: nickname.trim(), roomName: roomName.trim() }),
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

  function reset() { setMode(null); setError(null); setNickname(''); setRoomName(''); setRoomCode(''); }

  return (
    <div style={{ ...s.page, backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined }}>
      <div style={s.overlay} />

      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.title}>WEREWOLF</h1>
          {user ? (
            <div className="user-dropdown-wrap" ref={ddRef}>
              <button className="user-pill" onClick={() => setShowDD(v => !v)}>
                🧍 {user.username} {showDD ? '▲' : '▼'}
              </button>
              {showDD && (
                <div className="user-dropdown">
                  <button onClick={logout}>🚪 ออกจากระบบ</button>
                </div>
              )}
            </div>
          ) : (
            <div className="home-nav-auth">
              <button onClick={() => navigate('/login')}>เข้าสู่ระบบ</button>
              <button onClick={() => navigate('/register')}>สมัครสมาชิก</button>
            </div>
          )}
        </div>

        <div style={s.grid}>
          <div style={s.left}>
            {!mode && (
              <div style={s.menuList}>
                <MenuBtn title="Create Room" sub="Create a new room and invite your friends" onClick={() => user ? setMode('create') : setShowModal(true)} />
                <MenuBtn title="Join Room" sub="Join with room code" onClick={() => setMode('join')} />
                <MenuBtn title="Customize" sub="Change your profile and preferences" />
                <MenuBtn title="Settings" sub="Game and audio settings" />
              </div>
            )}

            {mode === 'create' && (
              <form onSubmit={handleCreate} style={s.form}>
                <h2 style={s.formTitle}>สร้างห้องใหม่</h2>
                {error && <ErrorBox msg={error} />}
                <Field label="ชื่อของคุณ" id="nick" value={nickname} onChange={e => setNickname(e.target.value)} max={32} autoFocus />
                <Field label="ชื่อห้อง" id="room" value={roomName} onChange={e => setRoomName(e.target.value)} max={64} />
                <div style={s.btnRow}>
                  <button type="submit" style={s.btnPrimary} disabled={loading || !nickname.trim() || !roomName.trim()}>
                    {loading ? 'กำลังสร้าง...' : 'สร้างห้อง'}
                  </button>
                  <button type="button" style={s.btnBack} onClick={reset}>กลับ</button>
                </div>
              </form>
            )}

            {mode === 'join' && (
              <form onSubmit={handleJoin} style={s.form}>
                <h2 style={s.formTitle}>เข้าร่วมห้อง</h2>
                {error && <ErrorBox msg={error} />}
                <Field label="ชื่อของคุณ" id="nick2" value={nickname} onChange={e => setNickname(e.target.value)} max={32} autoFocus />
                <Field label="รหัสห้อง" id="code" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} max={8} extraStyle={{ textTransform:'uppercase', letterSpacing:'0.2em' }} />
                <div style={s.btnRow}>
                  <button type="submit" style={s.btnPrimary} disabled={loading || !nickname.trim() || !roomCode.trim()}>
                    {loading ? 'กำลังเข้า...' : 'เข้าร่วม'}
                  </button>
                  <button type="button" style={s.btnBack} onClick={reset}>กลับ</button>
                </div>
              </form>
            )}

            {!mode && (
              <div style={s.playerBar}>
                <div style={s.playerAva}>🐺</div>
                <div style={{ flex: 1 }}>
                  <div style={s.playerName}>PlayerName</div>
                  <div style={s.playerLevel}>Level 12</div>
                  <div style={s.playerExp}>
                    <div style={{ ...s.playerExpFill, width: '60%' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={s.right}>
            <div style={s.panelBox}>
              <div style={s.panelHead}>
                <div style={s.panelLine} />
                <span style={s.panelTitle}>ข่าวสาร</span>
                <div style={s.panelLine} />
              </div>

              <div style={s.newsContainer}>
                {NEWS.map(n => (
                  <div key={n.id} style={s.newsItem}>
                    <div style={s.newsDot}>♦</div>
                    <div>
                      <div style={s.newsTitle}>{n.title}</div>
                      <div style={s.newsDesc}>{n.desc}</div>
                      <div style={s.newsDate}>{n.date}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={s.moreContainer}>
                <button style={s.moreBtn}>More <span style={{ marginLeft: 8 }}>{'>'}</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <span style={s.version}>v1.2.0</span>
        <div style={s.socials}>
          {['D', 'F', 'W'].map(x => (
            <div key={x} style={s.socBtn}>{x}</div>
          ))}
        </div>
      </div>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function MenuBtn({ title, sub, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{ ...s.menuBtn, ...(hovered ? s.menuBtnHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.menuText}>
        <div style={s.menuTitle}>{title}</div>
        <div style={s.menuSub}>{sub}</div>
      </div>
    </button>
  );
}

function Field({ label, id, value, onChange, placeholder, max, autoFocus, extraStyle = {} }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label htmlFor={id} style={s.fieldLabel}>{label}</label>
      <input
        id={id} value={value} onChange={onChange}
        placeholder={placeholder} maxLength={max} autoFocus={autoFocus}
        style={{ ...s.input, ...extraStyle }}
        onFocus={e => { e.target.style.borderColor = '#6b7280'; }}
        onBlur={e => { e.target.style.borderColor = '#374151'; }}
      />
    </div>
  );
}

function ErrorBox({ msg }) {
  return <div style={s.errorBox}>{msg}</div>;
}

const s = {
  page: {
    minHeight: '100dvh',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#111827',
    position: 'relative',
    fontFamily: "'Sarabun', sans-serif",
    color: '#d1d5db',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(15, 20, 25, 0.75)',
    zIndex: 0,
  },
  container: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '1000px',
    padding: '40px 20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontFamily: "'Creepster', cursive",
    fontSize: 'clamp(3rem, 6vw, 4.5rem)',
    color: '#d1d5db',
    letterSpacing: '0.1em',
    margin: 0,
    textShadow: '0 4px 10px rgba(0,0,0,0.8)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    alignItems: 'start',
  },
  left: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '20px',
    background: 'rgba(20, 24, 28, 0.6)',
    border: '1px solid #374151',
    borderRadius: '4px',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
  },
  menuBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    background: 'transparent',
    border: '1px solid #374151',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s',
  },
  menuBtnHover: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderColor: '#4b5563',
  },
  menuText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  menuTitle: {
    fontSize: '18px',
    fontWeight: 'normal',
    color: '#e5e7eb',
    fontFamily: "'Cinzel', serif",
  },
  menuSub: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  playerBar: {
    padding: '16px 20px',
    background: 'rgba(20, 24, 28, 0.6)',
    border: '1px solid #374151',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
    width: '100%',
    maxWidth: '300px',
    alignSelf: 'center',
  },
  playerAva: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#1f2937',
    border: '1px solid #4b5563',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  playerName: {
    fontSize: '15px',
    color: '#e5e7eb',
    fontFamily: "'Cinzel', serif",
  },
  playerLevel: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  playerExp: {
    height: '4px',
    background: '#374151',
    borderRadius: '2px',
    marginTop: '6px',
  },
  playerExpFill: {
    height: '100%',
    background: '#9ca3af',
    borderRadius: '2px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
    background: 'rgba(20, 24, 28, 0.8)',
    border: '1px solid #374151',
    borderRadius: '4px',
  },
  formTitle: {
    fontSize: '20px',
    color: '#e5e7eb',
    margin: '0 0 10px 0',
    fontFamily: "'Cinzel', serif",
  },
  fieldLabel: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  input: {
    width: '100%',
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: '4px',
    color: '#e5e7eb',
    padding: '12px',
    outline: 'none',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  btnPrimary: {
    flex: 1,
    padding: '12px',
    background: '#374151',
    border: '1px solid #4b5563',
    borderRadius: '4px',
    color: '#e5e7eb',
    cursor: 'pointer',
  },
  btnBack: {
    padding: '12px 20px',
    background: 'transparent',
    border: '1px solid #374151',
    borderRadius: '4px',
    color: '#9ca3af',
    cursor: 'pointer',
  },
  errorBox: {
    background: 'rgba(153, 27, 27, 0.2)',
    border: '1px solid rgba(153, 27, 27, 0.5)',
    padding: '10px',
    borderRadius: '4px',
    color: '#fca5a5',
    fontSize: '14px',
  },
  right: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  panelBox: {
    background: 'rgba(20, 24, 28, 0.6)',
    border: '1px solid #374151',
    borderRadius: '4px',
    padding: '24px',
    height: '100%',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  panelTitle: {
    fontFamily: "'Sarabun', sans-serif",
    fontSize: '18px',
    color: '#e5e7eb',
    whiteSpace: 'nowrap',
  },
  panelLine: {
    flex: 1,
    height: '1px',
    background: '#374151',
  },
  newsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    flex: 1,
  },
  newsItem: {
    display: 'flex',
    gap: '16px',
  },
  newsDot: {
    color: '#9ca3af',
    fontSize: '12px',
    marginTop: '2px',
  },
  newsTitle: {
    fontSize: '15px',
    color: '#d1d5db',
    marginBottom: '6px',
  },
  newsDesc: {
    fontSize: '13px',
    color: '#9ca3af',
    marginBottom: '6px',
  },
  newsDate: {
    fontSize: '12px',
    color: '#6b7280',
  },
  moreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '32px',
  },
  moreBtn: {
    background: 'transparent',
    border: '1px solid #374151',
    borderRadius: '4px',
    padding: '8px 24px',
    color: '#9ca3af',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    right: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  version: {
    color: '#4b5563',
    fontSize: '12px',
  },
  socials: {
    display: 'flex',
    gap: '12px',
  },
  socBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid #374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '14px',
    background: 'rgba(20, 24, 28, 0.6)',
  },
  menuSub: {
    fontSize: '13px',
    color: '#dedede21',
  },
};