import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../src/context/Gamecontext.jsx';
import bgHome from '../src/assets/bgHome.jpg';
import { useSound } from '../src/context/SoundContext.jsx';
import logoLoadingImage from '../src/assets/logo/logo_loading.png';
import logoMainImage from '../src/assets/logo/Logo-Main.png';
import defaultAvatar from '../src/assets/ui/default_avatar.png';
import AuthModal from '../src/components/AuthModal.jsx';
import HowToPlayModal from '../src/components/HowToPlayModal.jsx';
import Reveal from '../src/components/Reveal.jsx';
import { expNeeded, levelProgress, STARTING_LEVEL } from '../../shared/leveling.js';
import {
  IconCreate, IconJoin, IconBook, IconSettings, IconArrow, IconPin, IconLock, IconClock,
  IconLogin, IconRegister, IconDiscord, IconFacebook, IconGlobe, IconSearch, IconHouse, IconGroup, IconBlock, IconTrophy,
} from '../src/components/ui/Icons.jsx';
import { useAuth } from '../src/context/AuthContext.jsx';
import '../src/styles/HomePage.css';
import StarsLayer from '../src/components/home/StarsLayer.jsx';
import FirefliesLayer from '../src/components/home/FirefliesLayer.jsx';
import WolfEasterEgg from '../src/components/home/WolfEasterEgg.jsx';
import NewsRow from '../src/components/home/NewsRow.jsx';
import Leaderboard from '../src/components/home/Leaderboard.jsx';
import UserPill from '../src/components/home/UserPill.jsx';
import MenuBtn from '../src/components/home/MenuBtn.jsx';
import Field from '../src/components/ui/Field.jsx';
import ErrorBox from '../src/components/ui/ErrorBox.jsx';

const BG_IMAGE = bgHome;
const API = '/api/rooms';

const EASE_OUT = [0.22, 1, 0.36, 1];
const EASE_POP = [0.34, 1.4, 0.5, 1];


const menuItemVariants = {
  hidden:  { opacity: 0, x: -18, y: 10, scale: 0.96 },
  visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.46, ease: EASE_POP } },
};

const menuPanelVariants = {
  hidden:  {},
  visible: { transition: { delayChildren: 0.2, staggerChildren: 0.15 } },
};

const logoVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT, delay: 0.3 } },
};
const newsVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT, delay: 0.95 } },
};

const HOVER_SFX_SRC = '/assets/audio/SFX-Chat.mp3';

export default function HomePage() {
  const navigate = useNavigate();
  const { setIdentity, joinRoom } = useGame();
  const sound = useSound();
  const { user, logout } = useAuth();

  function playHoverSfx() {
    sound.playUi(HOVER_SFX_SRC);
  }

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const MIN_DISPLAY = 600;
    const MAX_WAIT    = 3000;
    const start = Date.now();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const timeoutFallback = new Promise(res => setTimeout(res, MAX_WAIT));

    Promise.race([fontsReady, timeoutFallback]).then(() => {
      const elapsed = Date.now() - start;
      setTimeout(() => setIsLoading(false), Math.max(MIN_DISPLAY - elapsed, 0));
    });
  }, []);

  const [mode, setMode] = useState(null);
  const [nickname, setNickname] = useState(user?.displayName || user?.username || '');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [gameMode, setGameMode] = useState('classic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [joinStep, setJoinStep] = useState('browse');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomSearch, setRoomSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState('all');
  const [refreshSpin, setRefreshSpin] = useState(0);
  const [news, setNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [onlineCount, setOnlineCount] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const pageRef = useRef(null);

  const logoRef = useRef(null);
  const [logoHiddenByCursor, setLogoHiddenByCursor] = useState(false);
  const rafId = useRef(null);


  useEffect(() => {
    if (isLoading) return;
    const PROXIMITY_PX = 80;

    function handleMove(e) {
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        const el = logoRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        setLogoHiddenByCursor(Math.hypot(e.clientX - cx, e.clientY - cy) < PROXIMITY_PX);
      });
    }

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isLoading]);

  useEffect(() => {
    let cancelled = false;
    async function fetchTop() {
      try {
        const res = await fetch('/api/stats/leaderboard');
        const data = await res.json();
        if (!cancelled && res.ok) setTopPlayers(data.players || []);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoadingTop(false); }
    }
    fetchTop();
    const id = setInterval(fetchTop, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchOnline() {
      try {
        const res = await fetch('/api/stats/online');
        const data = await res.json();
        if (!cancelled && res.ok) setOnlineCount(data.online);
      } catch { /* silent */ }
    }
    fetchOnline();
    const id = setInterval(fetchOnline, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchNews() {
      try {
        const res = await fetch('/api/news?limit=3'); // Fetch top 3 news for homepage
        const data = await res.json();
        if (!cancelled && res.ok) setNews(data.news || []);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoadingNews(false); }
    }
    fetchNews();
    return () => { cancelled = true; };
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
          gameMode,
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

  function handleRefreshRooms() {
    setRefreshSpin(s => s + 360);
    fetchPublicRooms();
  }

  useEffect(() => {
    if (mode !== 'join') return;
    fetchPublicRooms();
    const id = setInterval(fetchPublicRooms, 5000);
    return () => clearInterval(id);
  }, [mode]);

  function selectRoomToJoin(room) {
    setError(null);
    setSelectedRoom(room);
    if (room.isPrivate) {
      setRoomCode('');
      setJoinStep('code');
    } else {
      setRoomCode(room.id);
      setJoinStep('name');
    }
  }

  function confirmRoomCode(e) {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setError(null);
    setJoinStep('name');
  }

  function backJoinStep() {
    setError(null);
    if (joinStep === 'name' && selectedRoom?.isPrivate) {
      setJoinStep('code');
    } else {
      setJoinStep('browse');
      setSelectedRoom(null);
      setRoomCode('');
    }
  }

  function reset() {
    setMode(null); setError(null); setNickname(user?.displayName || user?.username || '');
    setRoomName(''); setRoomCode('');
    setJoinStep('browse'); setSelectedRoom(null);
    setRoomSearch(''); setRoomFilter('all');
    setMaxPlayers(8); setIsPrivate(false); setGameMode('classic');
  }

  const HOST_AVATAR_COLORS = ['#b4cbda', '#9fbcd0', '#5FA36A', '#c98a8a', '#d6a45c'];

  const filteredRooms = publicRooms.filter(r => {
    if (roomFilter === 'public' && r.isPrivate) return false;
    if (roomFilter === 'private' && !r.isPrivate) return false;
    if (roomFilter === 'open' && r.playerCount >= r.maxPlayers) return false;
    const q = roomSearch.trim().toLowerCase();
    if (q && !r.name.toLowerCase().includes(q) && !(r.host || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const ROOM_FILTER_TABS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'public', label: 'สาธารณะ' },
    { key: 'private', label: 'ส่วนตัว' },
    { key: 'open', label: 'ยังไม่เต็ม' },
  ];

  const isJoinBrowse = mode === 'join' && joinStep === 'browse';

  return (

    <MotionConfig reducedMotion="user">
    <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.div
        key="loading"
        className="loading-screen"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <img src={logoLoadingImage} alt="We're Not Wolf" className="logo-loading-image" />
        <div className="loading-spinner" />
      </motion.div>
    ) : (
    <motion.div
      key="page"
      ref={pageRef}
      className="home-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      style={{ backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined }}
    >
      <div className="home-darken-layer" aria-hidden="true" />
      <div className="home-overlay" />
      <StarsLayer />
      <div className="home-moonbeams" aria-hidden="true" />
      <div className="home-fog" />
      <div className="home-water-shimmer" aria-hidden="true" />
      <div className="home-lantern-glow" aria-hidden="true" />
      <FirefliesLayer />

      <div className="home-vignette" aria-hidden="true" />
      <div className="home-grain" aria-hidden="true" />

      <div className={`home-container ${isJoinBrowse ? 'is-wide' : ''}`}>
        <div className="home-topbar">
          <div className="online-badge" title="ผู้เล่นที่ออนไลน์อยู่ตอนนี้">
            <span className="online-dot" />
            <span className="online-text">
              ออนไลน์ · <span className="online-count">{onlineCount ?? '—'}</span> คน
            </span>
          </div>

          <div className="home-auth-actions">
            {user ? (
              <UserPill user={user} onLogout={logout} navigate={navigate} />
            ) : (
              <>
                <button className="top-btn top-btn-ghost sketch-border-lite" onClick={() => navigate('/login')} onMouseEnter={playHoverSfx}>
                  <IconLogin />
                  เข้าสู่ระบบ
                </button>
                <button className="top-btn top-btn-gold sketch-border-lite" onClick={() => navigate('/register')} onMouseEnter={playHoverSfx}>
                  <IconRegister />
                  สมัครสมาชิก
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`home-grid ${isJoinBrowse ? 'is-join-browse' : ''}`}>

          <motion.div className="home-hero" initial="hidden" animate="visible">
            {!isJoinBrowse && (
              <motion.div variants={logoVariants}>
                <div
                  ref={logoRef}
                  className={`home-header ${logoHiddenByCursor ? 'is-hidden-by-cursor' : ''}`}
                >
                  <img src={logoMainImage} alt="We're Not Wolf" className="home-logo-image" />
                <div className="title-ornament">
                    <span className="title-ornament-line" />
                    <span className="title-ornament-mark" />
                    <span className="title-ornament-line" />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="home-hero-row">
            <div className="home-left">
            {!mode && (
              <motion.div className="menu-panel" variants={menuPanelVariants}>
                <MenuBtn
                  primary
                  icon={<IconCreate />}
                  title="สร้างห้อง"
                  onClick={() => user ? setMode('create') : setShowModal(true)}
                  onHover={playHoverSfx}
                />
                <MenuBtn
                  icon={<IconJoin />}
                  title="เข้าร่วมห้อง"
                  onClick={() => user ? setMode('join') : setShowModal(true)}
                  onHover={playHoverSfx}
                />
                <MenuBtn
                  icon={<IconBook />}
                  title="วิธีการเล่น"
                  hint="อ่านกติกา บทบาทและวิธีการเล่นได้ที่นี่"
                  onClick={() => setShowHowTo(true)}
                  onHover={playHoverSfx}
                />
                <MenuBtn
                  icon={<IconSettings />}
                  title="การตั้งค่า"
                  hint="เสียงและการแสดงผล"
                  onClick={() => navigate('/settings')}
                  onHover={playHoverSfx}
                />
              </motion.div>
            )}

            {mode === 'create' && (
              <form onSubmit={handleCreate} className="home-form sketch-border fade-in">
                <h2 className="form-title">สร้างห้องใหม่</h2>
                {error && <ErrorBox msg={error} />}
                <Field label="ชื่อของคุณ" id="nick" value={nickname} readOnly={!!user}
                  onChange={e => setNickname(e.target.value)} max={32} autoFocus />
                <Field label="ชื่อห้อง" id="room" value={roomName}
                  onChange={e => setRoomName(e.target.value)} max={64} />

                <div className="mode-select" role="radiogroup" aria-label="โหมดเกม">
                  <label className="field-label">โหมดเกม</label>
                  <div className="mode-options">
                    {[
                      { key: 'classic', title: 'คลาสสิค'},
                      { key: 'chaos',   title: 'โกลาหล'},
                    ].map(m => (
                      <button
                        key={m.key}
                        type="button"
                        role="radio"
                        aria-checked={gameMode === m.key}
                        className={`mode-card sketch-border-lite${gameMode === m.key ? ' is-active' : ''}`}
                        onClick={() => setGameMode(m.key)}
                      >
                        <span className="mode-card-title">{m.title}</span>
                        <span className="mode-card-desc">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

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
                        {isPrivate ? 'ผู้เล่นจะเข้าห้องส่วนตัวได้ต้องเข้าผ่านรหัสห้องเท่านั้น' : 'ใครก็เข้าร่วมห้องได้'}
                      </span>
                    </span>
                  </label>
                </div>

                <div className="btn-row">
                  <button type="submit" className="btn-primary sketch-border"
                    disabled={loading || !nickname.trim() || !roomName.trim()}>
                    {loading ? 'กำลังสร้าง...' : 'สร้างห้อง'}
                  </button>
                  <button type="button" className="btn-back" onClick={reset}>กลับ</button>
                </div>
              </form>
            )}

            {mode === 'join' && (
              <form onSubmit={joinStep === 'code' ? confirmRoomCode : handleJoin} className="home-form sketch-border fade-in">

                {joinStep === 'browse' && (
                  <>
                    <div className="join-header-row">
                      <button type="button" className="join-back-btn" onClick={reset}>
                        <IconArrow style={{ transform: 'rotate(180deg)' }} /> ย้อนกลับไปหน้าหลัก
                      </button>
                    </div>

                    {error && <ErrorBox msg={error} />}

                    <div className="join-search-row">
                      <div className="join-search-wrap">
                        <IconSearch />
                        <input
                          type="text"
                          className="join-search-input"
                          placeholder="ค้นหาชื่อห้อง..."
                          value={roomSearch}
                          onChange={e => setRoomSearch(e.target.value)}
                        />
                      </div>
                      <button type="button" onClick={handleRefreshRooms}
                        className="refresh-btn" disabled={loadingRooms}>
                        <span className="refresh-icon" style={{ transform: `rotate(${refreshSpin}deg)` }}>↻</span>
                        รีเฟรช
                      </button>
                    </div>

                    <div className="join-filter-tabs">
                      {ROOM_FILTER_TABS.map(tab => (
                        <button type="button" key={tab.key}
                          className={`join-filter-tab ${roomFilter === tab.key ? 'is-active' : ''}`}
                          onClick={() => setRoomFilter(tab.key)}>
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="room-list-panel">

                      {filteredRooms.length === 0 ? (
                        <div className="room-list-empty-rich">
                          <IconHouse />
                          <div className="room-list-empty-title">
                            {publicRooms.length === 0 ? 'ตอนนี้ยังไม่มีห้องเปิดอยู่' : 'ไม่พบห้องที่ตรงกัน'}
                          </div>
                          <div className="room-list-empty-sub">
                            {publicRooms.length === 0
                              ? 'สร้างห้องของคุณเพื่อเริ่มเล่นได้เลย'
                              : 'ลองเปลี่ยนตัวกรองหรือคำค้นหาดูอีกครั้ง'}
                          </div>
                        </div>
                      ) : (
                        <div className="room-list custom-scrollbar">
                          {filteredRooms.map((r, i) => {
                            const full = r.playerCount >= r.maxPlayers;
                            const inGame = r.status !== 'waiting';
                            const disabled = full || inGame;
                            const pct = Math.min(1, r.playerCount / Math.max(1, r.maxPlayers));
                            const nearFull = !full && pct >= 0.75;
                            const countClass = full ? 'is-full' : nearFull ? 'is-near' : 'is-ok';
                            const hostInitial = (r.host || '?').trim().charAt(0).toUpperCase();
                            const hostColor = HOST_AVATAR_COLORS[i % HOST_AVATAR_COLORS.length];
                            return (
                              <div key={r.id} className={`room-row-rich cv-auto sketch-border-lite ${disabled ? 'is-disabled' : ''}`}>
                                <span className="room-row-index">{String(i + 1).padStart(2, '0')}</span>

                                <span className="room-row-icon">
                                  <IconHouse />
                                  {full && <span className="room-row-icon-badge"><IconBlock /></span>}
                                </span>

                                <div className="room-row-info">
                                  <div className="room-row-info-top">
                                    <span className="room-row-title">{r.name}</span>
                                    {r.isPrivate ? (
                                      <span className="room-tag is-private"><IconLock /> ห้องส่วนตัว</span>
                                    ) : (
                                      <span className="room-tag is-public"><IconGlobe size={13} /> ห้องสาธารณะ</span>
                                    )}
                                    {nearFull && <span className="room-row-nearfull">ห้องใกล้เต็ม</span>}
                                    {inGame && <span className="room-row-nearfull is-playing">กำลังเล่น</span>}
                                  </div>
                                  {r.host && (
                                    <div className="room-row-info-bottom">
                                      <span className="room-row-host-dot" style={{ background: hostColor }}>{hostInitial}</span>
                                      <span className="room-row-host-text">โฮสต์โดย {r.host}</span>
                                    </div>
                                  )}
                                </div>

                                <div className={`room-row-count ${countClass}`}>
                                  <span className="room-row-count-num">
                                    <IconGroup /> {r.playerCount}<span className="room-row-count-max">/{r.maxPlayers}</span>
                                  </span>
                                  <span className="room-row-count-bar">
                                    <span className="room-row-count-fill" style={{ width: `${pct * 100}%` }} />
                                  </span>
                                </div>

                                {disabled ? (
                                  <button type="button" disabled className="room-row-join-btn is-disabled">
                                    {full ? 'เต็มแล้ว' : 'กำลังเล่น'}
                                  </button>
                                ) : (
                                  <button type="button" className="room-row-join-btn" onClick={() => selectRoomToJoin(r)}>
                                    เข้าร่วม
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {joinStep !== 'browse' && <h2 className="form-title">เข้าร่วมห้อง</h2>}
                {joinStep !== 'browse' && error && <ErrorBox msg={error} />}

                {joinStep === 'code' && (
                  <>
                    <div className="join-selected-room">
                      <span className="join-selected-label"><IconLock /> ห้องส่วนตัว</span>
                      <span className="join-selected-name">{selectedRoom?.name}</span>
                    </div>
                    <p className="field-hint">ห้องนี้เป็นห้องส่วนตัว กรอกรหัสห้องที่ได้รับมาก่อนถึงจะเข้าร่วมได้</p>
                    <Field label="รหัสห้อง" id="code" value={roomCode}
                      onChange={e => setRoomCode(e.target.value.toUpperCase())}
                      max={8} extraClassName="field-input-code" autoFocus />

                    <div className="btn-row">
                      <button type="submit" className="btn-primary sketch-border" disabled={!roomCode.trim()}>
                        ถัดไป
                      </button>
                      <button type="button" className="btn-back" onClick={backJoinStep}>กลับ</button>
                    </div>
                  </>
                )}

                {joinStep === 'name' && (
                  <>
                    <div className="join-selected-room">
                      <span className="join-selected-label">
                        {selectedRoom?.isPrivate && <IconLock />} กำลังเข้าร่วมห้อง
                      </span>
                      <span className="join-selected-name">{selectedRoom?.name}</span>
                    </div>
                    <Field label="ชื่อของคุณ" id="nick2" value={nickname} readOnly={!!user}
                      onChange={e => setNickname(e.target.value)} max={32} autoFocus />

                    <div className="btn-row">
                      <button type="submit" className="btn-primary sketch-border"
                        disabled={loading || !nickname.trim() || !roomCode.trim()}>
                        {loading ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
                      </button>
                      <button type="button" className="btn-back" onClick={backJoinStep}>กลับ</button>
                    </div>
                  </>
                )}
              </form>
            )}

            </div>

            {!isJoinBrowse && (
              <motion.div
                className="home-news"
                variants={newsVariants}
                whileHover={{ y: -4 }}
              >
                <div className="panel-box sketch-border">
                  <div className="home-news-head">
                    <div>
                      <h2 className="home-news-heading">กระดานประกาศข่าวสาร</h2>
                    </div>
                    <span className="home-news-pin"><IconPin /></span>
                  </div>

                  <div className="home-news-list">
                    {loadingNews ? <p>กำลังโหลดข่าวสาร...</p> : news.map(n => <NewsRow key={n.id} news={n} />)}
                  </div>
                  <div className="home-news-footer">
                    <span className="home-news-updated">อัปเดตล่าสุด &middot; {news[0] ? new Date(news[0].created_at).toLocaleDateString('th-TH') : 'N/A'}</span>
                    <button className="more-btn" onClick={() => navigate('/news')}>
                      ดูทั้งหมด <span className="more-arrow"><IconArrow /></span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            </div>
          </motion.div>

          {!isJoinBrowse && (
            <Reveal className="home-below">
              <Leaderboard players={topPlayers} loading={loadingTop} />
            </Reveal>
          )}
        </div>
      </div>

      <footer className="home-footer">
        <div className="home-footer-left">
          <span className="version">v1.0.2</span>
          <span className="footer-credit">© 2026 Nanthaphat Punyaphat &amp; Nam</span>
        </div>
        <div className="socials">
          <a className="soc-btn sketch-border" title="Discord" href="https://discord.gg/gvDNBHQKT" target="_blank" rel="noopener noreferrer" aria-label="Join our Discord">
            <IconDiscord />
          </a>
          <a className="soc-btn sketch-border" title="Facebook" href="https://www.facebook.com/RayongTC?locale=th_TH" target="_blank" rel="noopener noreferrer" aria-label="Visit our Facebook page">
            <IconFacebook />
          </a>
        </div>
      </footer>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
    </motion.div>
    )}
    </AnimatePresence>
    </MotionConfig>
  );
}