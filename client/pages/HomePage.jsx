import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/Gamecontext.jsx';
import bgHome from '../src/assets/bgHome.png';
import { useAuth }  from '../context/AuthContext.jsx';
import AuthModal    from '../src/components/AuthModal.jsx';

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
    <div style={{ ...s.page, backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined }}>
      <div style={s.overlay} />
      <div style={s.fogLayer} />

      <div style={s.container}>
        <div style={s.topBar}>
          <div style={s.brandBlock}>
            <span style={s.brandLogo}>W</span>
            <div>
              <div style={s.brandName}>WE'RE NOT WOLF</div>
              <div style={s.brandTag}>พบกับโลกของเกมลึกลับและเพื่อนใหม่</div>
            </div>
          </div>

          <div style={s.authActions}>
            {user ? (
              <div style={s.userDropdownWrap} ref={ddRef}>
                <button style={s.userPill} onClick={() => setShowDD(v => !v)}>
                  <span style={s.userLevelBadge}>Lv.{user.level ?? 1}</span>
                  {user.username}
                </button>
                {showDD && (
                  <div style={s.userDropdown}>
                    <button style={s.userDropdownBtn} onClick={logout}>ออกจากระบบ</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button style={s.authBtnSecondary} onClick={() => navigate('/login')}>
                  เข้าสู่ระบบ
                </button>
                <button style={s.authBtnPrimary} onClick={() => navigate('/register')}>
                  สมัครสมาชิก
                </button>
              </>
            )}
          </div>
        </div>

        <div style={s.header}>
          <h1 style={s.title}>WE'RE NOT WOLF</h1>
        </div>

        <div style={s.grid}>
          <div style={s.left}>
            {!mode && (
              <div style={s.menuList}>
                <MenuBtn primary title="Create Room" sub="Create a new room and invite your friends" onClick={() => user ? setMode('create') : setShowModal(true)} />
                <MenuBtn title="Join Room" onClick={() => user ? setMode('join') : setShowModal(true)} />
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

                <div style={s.settingsRow}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <label htmlFor="maxPlayers" style={s.fieldLabel}>จำนวนผู้เล่นสูงสุด</label>
                    <select
                      id="maxPlayers"
                      value={maxPlayers}
                      onChange={e => setMaxPlayers(Number(e.target.value))}
                      style={s.input}
                    >
                      {[4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} คน</option>
                      ))}
                    </select>
                  </div>

                  <label style={s.privacyToggle}>
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={e => setIsPrivate(e.target.checked)}
                    />
                    <span>
                      ห้องส่วนตัว
                      <span style={s.privacyHint}>
                        {isPrivate ? 'ต้องใช้รหัสห้องเท่านั้นถึงเข้าได้' : 'ใครก็เห็นในรายการห้องสาธารณะ'}
                      </span>
                    </span>
                  </label>
                </div>

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

                <div style={s.roomListHead}>
                  <span style={s.fieldLabel}>ห้องที่เปิดอยู่</span>
                  <button type="button" onClick={fetchPublicRooms} style={s.refreshBtn} disabled={loadingRooms}>
                    {loadingRooms ? 'กำลังโหลด...' : '↻ รีเฟรช'}
                  </button>
                </div>

                <div style={s.roomList}>
                  {publicRooms.length === 0 && !loadingRooms && (
                    <div style={s.roomListEmpty}>ยังไม่มีห้องสาธารณะเปิดอยู่ตอนนี้</div>
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
                        style={{
                          ...s.roomRow,
                          ...(selected ? s.roomRowSelected : {}),
                          ...(disabled ? s.roomRowDisabled : {}),
                        }}
                      >
                        <div style={s.roomRowMain}>
                          <span style={s.roomRowName}>{r.name}</span>
                          <span style={s.roomRowCode}>#{r.id}</span>
                        </div>
                        <div style={s.roomRowMeta}>
                          <span style={{ ...s.roomStatusBadge, ...(inGame ? s.roomStatusBadgePlaying : {}) }}>
                            {inGame ? 'กำลังเล่น' : 'รอผู้เล่น'}
                          </span>
                          <span style={s.roomRowCount}>{r.playerCount}/{r.maxPlayers} คน</span>
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
                  extraStyle={{ textTransform:'uppercase', letterSpacing:'0.2em' }}
                />

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
                <div style={s.playerAva}>{user ? user.username.charAt(0).toUpperCase() : 'W'}</div>
                <div style={{ flex: 1 }}>
                  {user ? (
                    <>
                      <div style={s.playerName}>{user.username}</div>
                      <div style={s.playerLevel}>Level {user.level ?? 1}</div>
                      <div style={s.playerExp}>
                        <div
                          style={{
                            ...s.playerExpFill,
                            width: `${(((user.gamesPlayed ?? 0) % GAMES_PER_LEVEL) / GAMES_PER_LEVEL) * 100}%`,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={s.playerName}>ยังไม่ได้เข้าสู่ระบบ</div>
                      <div style={s.playerLevel}>เข้าสู่ระบบเพื่อบันทึกระดับและสถิติ</div>
                    </>
                  )}
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
                {NEWS.map(n => <NewsRow key={n.id} news={n} />)}
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

function NewsRow({ news }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ ...s.newsItem, ...(hovered ? s.newsItemHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div>
        <div style={s.newsTitle}>{news.title}</div>
        <div style={s.newsDesc}>{news.desc}</div>
        <div style={s.newsDate}>{news.date}</div>
      </div>
    </div>
  );
}

function MenuBtn({ title, sub, onClick, primary = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        ...s.menuBtn,
        ...(primary ? s.menuBtnPrimary : {}),
        ...(hovered ? (primary ? s.menuBtnPrimaryHover : s.menuBtnHover) : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.menuText}>
        <div style={{ ...s.menuTitle, ...(primary ? s.menuTitlePrimary : {}) }}>{title}</div>
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
        onFocus={e => { e.target.style.borderColor = 'var(--color-accent-dim)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; }}
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
    backgroundColor: 'var(--color-bg)',
    position: 'relative',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-text)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: `
      radial-gradient(ellipse 70% 50% at 50% 0%, rgba(212,162,76,0.05) 0%, transparent 60%),
      radial-gradient(ellipse 90% 70% at 50% 100%, rgba(0,0,0,0.55) 0%, transparent 65%),
      linear-gradient(180deg, rgba(15,17,21,0.86) 0%, rgba(15,17,21,0.78) 40%, rgba(15,17,21,0.9) 100%)
    `,
    zIndex: 0,
  },
  fogLayer: {
    position: 'absolute',
    inset: 0,
    background: `
      radial-gradient(ellipse 50% 30% at 15% 85%, rgba(180,190,200,0.035) 0%, transparent 70%),
      radial-gradient(ellipse 40% 25% at 85% 15%, rgba(180,190,200,0.025) 0%, transparent 70%)
    `,
    zIndex: 0,
    pointerEvents: 'none',
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
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  brandLogo: {
    width: '58px',
    height: '58px',
    borderRadius: 'var(--radius-lg)',
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(150deg, var(--color-accent), var(--color-accent-dim))',
    color: 'var(--color-bg)',
    fontSize: '1.5rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
  },
  brandName: {
    fontSize: '1.2rem',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  brandTag: {
    fontSize: '0.92rem',
    color: 'var(--color-text-muted)',
  },
  authActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  authBtnPrimary: {
    padding: '12px 22px',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-accent)',
    color: 'var(--color-bg)',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: 'var(--shadow-card)',
  },
  authBtnSecondary: {
    padding: '12px 20px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    cursor: 'pointer',
  },
  userDropdownWrap: {
    position: 'relative',
  },
  settingsRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  privacyToggle: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--color-text)',
    cursor: 'pointer',
    paddingTop: '22px',
    flex: 1,
  },
  privacyHint: {
    display: 'block',
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  roomListHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshBtn: {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    fontSize: '12px',
    padding: '4px 10px',
    cursor: 'pointer',
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  roomListEmpty: {
    fontSize: '13px',
    color: 'var(--color-disabled)',
    padding: '14px',
    textAlign: 'center',
    border: '1px dashed var(--color-border)',
    borderRadius: 'var(--radius-sm)',
  },
  roomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '10px 14px',
    background: 'var(--color-bg-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  roomRowSelected: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 1px var(--color-accent)',
  },
  roomRowDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  roomRowMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  roomRowName: {
    fontSize: '14px',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-display)',
  },
  roomRowCode: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.1em',
  },
  roomRowMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  roomStatusBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(212,162,76,0.16)',
    border: '1px solid var(--color-accent)',
    color: 'var(--color-accent)',
  },
  roomStatusBadgePlaying: {
    background: 'rgba(229,57,53,0.16)',
    border: '1px solid var(--color-danger)',
    color: 'var(--color-danger)',
  },
  roomRowCount: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  userPill: {
    padding: '12px 18px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userLevelBadge: {
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(212,162,76,0.16)',
    border: '1px solid var(--color-accent)',
    color: 'var(--color-accent)',
    fontSize: '0.75rem',
    fontWeight: 700,
    fontFamily: 'var(--font-display)',
  },
  userDropdown: {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    right: 0,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
    padding: '10px',
    minWidth: '180px',
    zIndex: 2,
  },
  userDropdownBtn: {
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
    color: 'var(--color-text)',
    letterSpacing: '0.03em',
    margin: 0,
    textShadow: '0 4px 16px rgba(0,0,0,0.6)',
  },
  subtitle: {
    marginTop: '18px',
    color: 'var(--color-text-muted)',
    fontSize: '1rem',
    maxWidth: '720px',
    marginLeft: 'auto',
    marginRight: 'auto',
    lineHeight: '1.6',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.08fr 0.92fr',
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
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
  },
  menuBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background-color var(--transition), border-color var(--transition)',
  },
  menuBtnHover: {
    background: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'var(--color-accent-dim)',
  },
  menuBtnPrimary: {
    background: 'rgba(212,162,76,0.07)',
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 1px rgba(212,162,76,0.15)',
  },
  menuBtnPrimaryHover: {
    background: 'rgba(212,162,76,0.13)',
    borderColor: 'var(--color-accent)',
  },
  menuTitlePrimary: {
    color: 'var(--color-accent)',
  },
  menuText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  menuTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--color-text)',
    fontFamily: 'var(--font-display)',
  },
  menuSub: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  playerBar: {
    padding: '16px 20px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: 'var(--shadow-card)',
    width: '100%',
    maxWidth: '300px',
    alignSelf: 'center',
  },
  playerAva: {
    width: '48px',
    height: '48px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-bg-2)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontFamily: 'var(--font-display)',
    color: 'var(--color-accent)',
  },
  playerName: {
    fontSize: '15px',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
  },
  playerLevel: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  playerExp: {
    height: '4px',
    background: 'var(--color-border)',
    borderRadius: '2px',
    marginTop: '6px',
  },
  playerExpFill: {
    height: '100%',
    background: 'var(--color-accent)',
    borderRadius: '2px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-card)',
  },
  formTitle: {
    fontSize: '20px',
    color: 'var(--color-text)',
    margin: '0 0 10px 0',
    fontFamily: 'var(--font-display)',
  },
  fieldLabel: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
  },
  input: {
    width: '100%',
    background: 'var(--color-bg-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
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
    background: 'var(--color-accent)',
    border: '1px solid var(--color-accent)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-bg)',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnBack: {
    padding: '12px 20px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
  },
  errorBox: {
    background: 'rgba(229,57,53,0.14)',
    border: '1px solid var(--color-danger)',
    padding: '10px',
    borderRadius: 'var(--radius-sm)',
    color: '#ffb4b0',
    fontSize: '14px',
  },
  right: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  panelBox: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    height: '100%',
    boxShadow: 'var(--shadow-card)',
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
    fontFamily: 'var(--font-display)',
    fontSize: '18px',
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
  },
  panelLine: {
    flex: 1,
    height: '1px',
    background: 'var(--color-border)',
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
    padding: '12px 14px 12px 16px',
    borderLeft: '2px solid var(--color-border)',
    background: 'rgba(255,255,255,0.015)',
    borderRadius: 'var(--radius-sm)',
    transition: 'border-color var(--transition), background-color var(--transition)',
  },
  newsItemHover: {
    borderColor: 'var(--color-accent)',
    background: 'rgba(212,162,76,0.04)',
  },
  newsDot: {
    color: 'var(--color-accent)',
    fontSize: '12px',
    marginTop: '2px',
  },
  newsTitle: {
    fontSize: '15px',
    color: 'var(--color-text)',
    marginBottom: '6px',
    fontWeight: 600,
  },
  newsDesc: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    marginBottom: '6px',
  },
  newsDate: {
    fontSize: '12px',
    color: 'var(--color-disabled)',
  },
  moreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '32px',
  },
  moreBtn: {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 24px',
    color: 'var(--color-text-muted)',
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
    color: 'var(--color-disabled)',
    fontSize: '12px',
  },
  socials: {
    display: 'flex',
    gap: '12px',
  },
  socBtn: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '14px',
    background: 'var(--color-surface)',
  },
};