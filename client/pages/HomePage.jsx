import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/Gamecontext.jsx';
import bgHome from '../src/assets/bgHome.jpg';
import { useAuth } from '../context/AuthContext.jsx';
import AuthModal from '../src/components/AuthModal.jsx';
import HowToPlayModal from '../src/components/HowToPlayModal.jsx';
import Reveal from '../src/components/Reveal.jsx';
import { expNeeded, levelProgress, STARTING_LEVEL } from '../../shared/leveling.js';
import '../src/styles/HomePage.css';

const BG_IMAGE = bgHome;
const API = '/api/rooms';

/* ── จังหวะ entrance ── ค่าทุกตัวยกมาจาก CSS keyframe เดิมให้ตรงเป๊ะ
   (เดิม: logo delay 300ms · ปุ่ม 200ms + i×150ms · กระดานข่าว 950ms) */
const EASE_OUT = [0.22, 1, 0.36, 1];      // = cubic-bezier ที่ entranceRiseIn ใช้
const EASE_POP = [0.34, 1.4, 0.5, 1];     // = menuBtnPop — มี overshoot เล็กน้อย

/* ลูกของ .menu-panel — from-state ตรงกับ @keyframes menuBtnPop เดิม */
const menuItemVariants = {
  hidden:  { opacity: 0, x: -18, y: 10, scale: 0.96 },
  visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.46, ease: EASE_POP } },
};

/* แม่ของปุ่มเมนู — คุมเฉพาะจังหวะ ไม่มี visual ของตัวเอง */
const menuPanelVariants = {
  hidden:  {},
  visible: { transition: { delayChildren: 0.2, staggerChildren: 0.15 } },
};

/* โลโก้ + กระดานข่าว — เทียบเท่า entranceRiseIn 700ms (เดิม delay 300ms / 950ms) */
const logoVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT, delay: 0.3 } },
};
const newsVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT, delay: 0.95 } },
};

const NEWS = [
  {
    id: 1,
    tag: 'อัปเดต',
    title: 'อัปเดตเวอร์ชัน 1.0.1',
    desc: 'ปรับโฉม UI ของหน้าแรกใหม่ทั้งหน้า สวยขึ้นและลื่นขึ้น',
    date: '06/07/2026',
  },
];

function DerpyWolfAvatar({ size = 96 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="65" r="42" fill="#1a1712" stroke="#9fbcd0" strokeWidth="2" />
      <path d="M28 45 L18 15 L42 38 Z" fill="#1a1712" stroke="#9fbcd0" strokeWidth="2" strokeLinejoin="round" />
      <path d="M92 45 L102 15 L78 38 Z" fill="#1a1712" stroke="#9fbcd0" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="44" cy="58" r="14" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1.5" />
      <circle cx="76" cy="58" r="14" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1.5" />
      <circle cx="47" cy="60" r="6" fill="#1a1208" />
      <circle cx="73" cy="60" r="6" fill="#1a1208" />
      <path d="M35 82 Q60 100 85 82" stroke="#9fbcd0" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M50 88 L52 100 L58 90" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1" />
      <path d="M70 88 L68 100 L62 90" fill="#f0e8d0" stroke="#9fbcd0" strokeWidth="1" />
      <path d="M58 92 Q60 105 56 112 Q52 116 50 108 Q50 98 58 92 Z" fill="#c86060" stroke="#8b3a3a" strokeWidth="1" />
    </svg>
  );
}


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



function IconBook() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3H9a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H3z"/>
      <path d="M21 4.5A1.5 1.5 0 0 0 19.5 3H15a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H21z"/>
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

function IconArrow({ style }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function IconPin() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5"/>
      <path d="M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6z"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 16 14"/>
    </svg>
  );
}

function IconLogin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  );
}

function IconRegister() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="4"/>
      <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/>
      <polyline points="17 8 19 10 23 6"/>
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

function IconGlobe({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function IconHouse() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5"/>
      <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9"/>
      <path d="M9.5 20v-6h5v6"/>
    </svg>
  );
}

function IconGroup() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconBlock() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/>
    </svg>
  );
}

const BGM_SRC = null;
const HOVER_SFX_SRC = null;

function StarsLayer() {
  const stars = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 62,
      size: Math.random() < 0.82 ? 1.5 : 2.5,
      delay: Math.random() * 6,
      dur: 3 + Math.random() * 5,
      bright: Math.random() < 0.25,
    })), []);
  return (
    <div className="home-stars" aria-hidden="true">
      {stars.map(s => (
        <span key={s.id} className={`star ${s.bright ? 'is-bright' : ''}`}
          style={{
            left: `${s.left}%`, top: `${s.top}%`,
            width: s.size, height: s.size,
            animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`,
          }} />
      ))}
    </div>
  );
}

function FirefliesLayer() {
  const flies = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      left: 8 + Math.random() * 84,
      top: 18 + Math.random() * 56,
      dur: 4 + Math.random() * 3,
      delay: Math.random() * 5,
      dx: (Math.random() * 2 - 1) * 26,
      dy: -14 - Math.random() * 22,
    })), []);
  return (
    <div className="home-fireflies" aria-hidden="true">
      {flies.map(f => (
        <span key={f.id} className="firefly" style={{
          left: `${f.left}%`, top: `${f.top}%`,
          '--ff-dur': `${f.dur}s`, '--ff-delay': `${f.delay}s`,
          '--ff-dx': `${f.dx}px`, '--ff-dy': `${f.dy}px`,
        }} />
      ))}
    </div>
  );
}

function WolfEasterEgg({ visible }) {
  return (
    <span className={`wolf-easter-egg ${visible ? 'is-visible' : ''}`} aria-hidden="true">
      {/* TODO: แทนที่ด้วย wolf artwork จริงตาม art style ของเว็บ — ตอนนี้เป็นเส้นร่างชั่วคราว */}
      <svg width="40" height="30" viewBox="0 0 40 30">
        <path d="M4 26 L14 6 L20 14 L26 6 L36 26" stroke="currentColor" strokeWidth="2" fill="none"
              strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* โลโก้เวอร์ชันจอโหลด — ตัวอักษรชุดเดียวกับ TitleLetters แต่ไม่มี state/easter egg
   จอโหลดไม่ควรมี interaction ใด ๆ */
function LoadingLogo() {
  const head = "We're not ";
  return (
    <h1 className="home-title loading-logo" aria-label="We're not Wolf">
      {head.split('').map((ch, i) => (
        <span key={i} className="title-ch">{ch === ' ' ? ' ' : ch}</span>
      ))}
      <span className="title-wolf">
        {'Wolf'.split('').map((ch, i) => (
          <span key={i} className="title-ch">{ch}</span>
        ))}
      </span>
    </h1>
  );
}

function TitleLetters() {
  const head = "We're not ";

  const hoverTimestamps = useRef([]);
  const [showWolfGraphic, setShowWolfGraphic] = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  function handleWolfEnter() {
    const now = Date.now();
    // ทิ้งครั้งที่เก่ากว่า 2 วิก่อนนับ — หน้าต่างเวลาจึงเลื่อนตามจริง ไม่ใช่รีเซ็ตเป็นช่วง ๆ
    hoverTimestamps.current = hoverTimestamps.current.filter(t => now - t < 2000);
    hoverTimestamps.current.push(now);

    if (hoverTimestamps.current.length >= 3) {
      hoverTimestamps.current = [];
      setShowWolfGraphic(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowWolfGraphic(false), 1500);
    }
  }

  return (
    <h1 className="home-title">
      {head.split('').map((ch, i) => (
        <span key={i} className="title-ch" style={{ '--ch-i': i }}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
      <span className="title-wolf" onMouseEnter={handleWolfEnter}>
        {'Wolf'.split('').map((ch, i) => (
          <span key={i} className="title-ch" style={{ '--ch-i': head.length + i }}>{ch}</span>
        ))}
        <WolfEasterEgg visible={showWolfGraphic} />
      </span>
    </h1>
  );
}

function IconTrophy() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0z"/>
      <path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 1.8 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.5-1.8 4-4 4"/>
    </svg>
  );
}

/* ── กระดานคะแนน — top 5 เลเวลสูงสุด ── */
function Leaderboard({ players, loading }) {
  const RANK_CLASS = ['is-gold', 'is-silver', 'is-bronze'];
  return (
    <div className="panel-box leaderboard-box sketch-border">
      <div className="home-news-head">
        <div>
          <h2 className="home-news-heading">กระดานคะแนนการเล่น</h2>
        </div>
        <span className="leaderboard-trophy"><IconTrophy /></span>
      </div>

      {loading ? (
        <div className="leaderboard-empty">กำลังโหลดคะแนน…</div>
      ) : players.length === 0 ? (
        <div className="leaderboard-empty">ยังไม่มีคะแนน — เล่นเกมแรกเพื่อขึ้นกระดาน</div>
      ) : (
        <div className="leaderboard-list">
          {players.map((p, i) => (
            <div key={`${p.name}-${i}`} className={`leaderboard-row cv-auto sketch-border-lite ${RANK_CLASS[i] || ''}`} style={{ '--lb-i': i }}>
              <span className="leaderboard-rank">{i + 1}</span>
              <span className="leaderboard-ava">
                {p.avatarUrl
                  ? <img src={p.avatarUrl} alt="" />
                  : <span className="leaderboard-ava-initial">{(p.name || '?').trim().charAt(0).toUpperCase()}</span>}
              </span>
              <span className="leaderboard-name">{p.name}</span>
              <span className="leaderboard-meta">{p.gamesPlayed ?? 0} เกม</span>
              <span className="leaderboard-level">Lv.{p.level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */
export default function HomePage() {
  const navigate = useNavigate();
  const { setIdentity, joinRoom } = useGame();
  const { user, logout } = useAuth();

  const bgmRef = useRef(null);
  const hoverSfxRef = useRef(null);

  useEffect(() => {
    if (!BGM_SRC) return; // silent until a real file is wired in
    const audio = new Audio(BGM_SRC);
    audio.loop = true;
    audio.volume = 0.35;
    bgmRef.current = audio;
    audio.play().catch(() => {
      const resume = () => {
        audio.play().catch(() => {});
        document.removeEventListener('click', resume);
      };
      document.addEventListener('click', resume, { once: true });
    });
    return () => { audio.pause(); };
  }, []);

  function playHoverSfx() {
    if (!HOVER_SFX_SRC) return;
    if (!hoverSfxRef.current) hoverSfxRef.current = new Audio(HOVER_SFX_SRC);
    const sfx = hoverSfxRef.current.cloneNode();
    sfx.volume = 0.4;
    sfx.play().catch(() => {});
  }

  // หน้าจอโหลดก่อนเข้าเกม — รอฟอนต์พร้อมค่อยเปิดม่าน ไม่งั้นตัวอักษรจะกระตุกตอน swap
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const MIN_DISPLAY = 600;   // โชว์อย่างน้อยเท่านี้ ไม่งั้นวาบผ่านจนดูเหมือนจอกระพริบ
    const MAX_WAIT    = 3000;  // ฟอนต์ค้าง/เน็ตช้าก็ต้องเข้าเกมได้อยู่ดี
    const start = Date.now();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const timeoutFallback = new Promise(res => setTimeout(res, MAX_WAIT));

    Promise.race([fontsReady, timeoutFallback]).then(() => {
      const elapsed = Date.now() - start;
      setTimeout(() => setIsLoading(false), Math.max(MIN_DISPLAY - elapsed, 0));
    });
  }, []);

  const [mode, setMode] = useState(null);
  const [nickname, setNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [gameMode, setGameMode] = useState('classic'); // 'classic' | 'chaos'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [joinStep, setJoinStep] = useState('browse'); // 'browse' | 'code' | 'name'
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomSearch, setRoomSearch] = useState('');
  const [roomFilter, setRoomFilter] = useState('all'); // 'all' | 'public' | 'private' | 'open'
  const [refreshSpin, setRefreshSpin] = useState(0);
  const [onlineCount, setOnlineCount] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const pageRef = useRef(null);

  // ── โลโก้หลบเมาส์ — เข้าใกล้กึ่งกลางกว่า 80px แล้วจางหาย ──
  const logoRef = useRef(null);
  const [logoHiddenByCursor, setLogoHiddenByCursor] = useState(false);
  const rafId = useRef(null);


  useEffect(() => {
    if (isLoading) return;
    const PROXIMITY_PX = 80;

    // throttle ด้วย rAF — mousemove ยิงถี่กว่าเฟรม การอ่าน rect ทุกครั้งคือ layout ซ้ำ ๆ ฟรี ๆ
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

  // สถิติหมู่บ้าน — จำนวนห้องเปิด/คนในห้อง โชว์ใต้โลโก้
  // ทำเนียบนักล่า
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
          // ไม่ส่ง config มาด้วย — server ใส่ค่าเริ่มต้นตามขนาดห้องให้ แล้ว host ไปปรับใน Lobby
          // (โหมดโกลาหลข้ามการปรับ role/เวลา — server สุ่ม + fix เวลาให้ตอนกดเริ่มเกม)
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
    setMode(null); setError(null); setNickname('');
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
    /* reducedMotion="user" ให้ motion เคารพการตั้งค่าลดการเคลื่อนไหวของ OS เอง
       (@media prefers-reduced-motion ใน global.css คุมได้แค่ CSS ไม่ถึง animation ที่เป็น JS) */
    <MotionConfig reducedMotion="user">
    {/* mode="wait" — จอโหลดต้องเฟดออกให้จบก่อน หน้าแรกถึงเริ่มเข้า
        เดิมเป็น early-return จึงตัดหายทันทีไม่มี exit */}
    <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.div
        key="loading"
        className="loading-screen"
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <LoadingLogo />
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
      {/* SVG filter #sketch-edge ย้ายไปประกาศครั้งเดียวใน App.jsx แล้ว */}

      {/* ม่านทึบชั้นเดียว วางเหนือรูปพื้นหลังแต่ใต้ชั้นบรรยากาศ —
          กดฉากเกาะให้จมลงเพื่อให้ panel/ปุ่มลอยเด่นขึ้นมา ปรับค่าเดียวจบ */}
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

          {/* จอแรก: โลโก้ + เมนู สูงเต็มจอพอดี กระดานด้านล่างจึงเริ่มพ้นขอบจอเสมอ */}
          {/* container ของลำดับ entrance — ลูกทุกตัวรับ "visible" ต่อจากนี้ */}
          <motion.div className="home-hero" initial="hidden" animate="visible">
            {/* สองชั้น: motion คุม entrance (y+opacity) · div ชั้นในคง proximity fade เดิมไว้
                ถ้ารวมเป็นชั้นเดียว inline style ของ motion จะทับ opacity ของคลาสจน fade ตาย */}
            {!isJoinBrowse && (
              <motion.div variants={logoVariants}>
                <div
                  ref={logoRef}
                  className={`home-header ${logoHiddenByCursor ? 'is-hidden-by-cursor' : ''}`}
                >
                  <TitleLetters />
                  <div className="home-hero-copy">
                  <p className="home-hero-subtitle">
                    กลยุทธ์ ความสงสัย และคำพูดเล็ก ๆ น้อย ๆ จะกำหนดชะตาของหมู่บ้าน —
                    ทุกคืนคือการเดิมพันใหม่ ทุกการโหวตคือบทพิสูจน์
                  </p>
                  <div className="home-hero-pill-list">
                    <span className="hero-pill">พูดคุยแบบเรียลไทม์</span>
                    <span className="hero-pill">โหวตคนที่สงสัย</span>
                    <span className="hero-pill">สุ่มบทบาททุกตา</span>
                  </div>
                </div>
                <div className="title-ornament">
                    <span className="title-ornament-line" />
                    <span className="title-ornament-mark" />
                    <span className="title-ornament-line" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* แถวเดียวกัน: เมนูหลัก (ซ้าย) + กระดานข่าว (ขวา) */}
            <div className="home-hero-row">
            <div className="home-left">
            {/* stagger อยู่ที่แม่ ปุ่มลูกไม่ต้องรู้ลำดับตัวเอง */}
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
                <Field label="ชื่อของคุณ" id="nick" value={nickname}
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

                <p className="form-note">
                  {gameMode === 'chaos'
                    ? 'โหมดโกลาหล: ระบบสุ่มบทบาทให้ตอนเริ่มเกม และใช้เวลาคงที่ (กลางคืน 25 วิ · คุย 90 วิ · โหวต 25 วิ)'
                    : 'บทบาทและเวลาแต่ละช่วงตั้งได้ในห้องรอก่อนเริ่มเกม'}
                </p>

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
                              ? 'ไม่มีคนอยู่'
                              : 'ลองค้นหาดูอีกครั้ง'}
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
                                    {nearFull && <span className="room-row-nearfull">เกือบเต็มแล้ว · รีบเลย</span>}
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
                    <Field label="ชื่อของคุณ" id="nick2" value={nickname}
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

            {/* กระดานข่าว — อยู่ในจอแรก แถวเดียวกับปุ่มหลัก */}
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
                    {NEWS.map(n => <NewsRow key={n.id} news={n} />)}
                  </div>
                  <div className="home-news-footer">
                    <span className="home-news-updated">อัปเดตล่าสุด &middot; {NEWS[0]?.date}</span>
                    <button className="more-btn" onClick={() => navigate('/news')}>
                      ดูทั้งหมด <span className="more-arrow"><IconArrow /></span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            </div>
          </motion.div>

          {/* กระดานคะแนน — อยู่ล่างจอแรก ซ่อนไว้จนกว่าผู้ใช้จะเลื่อนลงมาเจอ */}
          {!isJoinBrowse && (
            <Reveal className="home-below">
              <Leaderboard players={topPlayers} loading={loadingTop} />
            </Reveal>
          )}
        </div>
      </div>

      {/* Footer — กลับไปเป็น footer ปกติ ไม่ซ่อนรอเลื่อนแล้ว (ของเดิมก่อน Reveal) */}
      <footer className="home-footer">
        <div className="home-footer-left">
          <span className="version">v1.0.1</span>
          <span className="footer-credit">© 2026 Nanthaphat Punyaphat &amp; Nam</span>
        </div>
        <div className="socials">
          <a className="soc-btn sketch-border" title="Discord" href="https://discord.gg/gvDNBHQKT" target="_blank" rel="noopener noreferrer">
            <IconDiscord />
          </a>
          <a className="soc-btn sketch-border" title="Facebook" href="https://www.facebook.com/RayongTC?locale=th_TH" target="_blank" rel="noopener noreferrer">
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

/* ── Sub-components ── */
function NewsRow({ news }) {
  return (
    <div className="home-news-item">
      <div className="home-news-item-meta">
        <span className="home-news-item-tag">{news.tag}</span>
        <span className="home-news-item-date"><IconClock />{news.date}</span>
      </div>
      <div className="home-news-item-title">{news.title}</div>
      <div className="home-news-item-desc">{news.desc}</div>
    </div>
  );
}

/**
 * แถบข้อมูลผู้เล่น — รูป, ชื่อ, เลเวล, แถบ exp แบบ Minecraft
 * ตัวเลขทุกตัวมาจาก user object ที่ server ส่งมา ไม่มีการคำนวณเลเวลซ้ำฝั่งนี้
 */
/* ── ตัวตนผู้เล่นรวมไว้จุดเดียวที่ topbar — avatar + ชื่อ + Lv. + แถบ exp แบบย่อ ── */
function UserPill({ user, onLogout, navigate }) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const pillRef = useRef(null);

  const level = user?.level ?? STARTING_LEVEL;
  const exp   = user?.exp ?? 0;
  const need  = user?.expNeeded ?? expNeeded(level);

  // เลเวลอัปแล้วให้แถบสว่างวาบทีนึง — ใช้ animation ชุดเดิมที่ย้ายมาจาก player bar
  const [leveledUp, setLeveledUp] = useState(false);
  const prevLevel = useRef(level);

  useEffect(() => {
    if (level > prevLevel.current) {
      setLeveledUp(true);
      const t = setTimeout(() => setLeveledUp(false), 1200);
      return () => clearTimeout(t);
    }
    prevLevel.current = level;
  }, [level]);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (pillRef.current && !pillRef.current.contains(e.target)) setFlyoutOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  return (
    <div className="user-pill-wrap" ref={pillRef}>
      <button
        className="user-pill sketch-border-lite"
        onClick={() => setFlyoutOpen(o => !o)}
        aria-expanded={flyoutOpen}
        aria-haspopup="true"
      >
        <span className="user-pill-avatar">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="" />
            : <DerpyWolfAvatar size={26} />}
        </span>

        <span className="user-pill-info">
          <span className="user-pill-name">{user.displayName || user.username}</span>
          <span className="user-pill-exp-row">
            <span className={`user-pill-level ${leveledUp ? 'is-levelup' : ''}`}>Lv.{level}</span>
            <span className="user-pill-exp-track player-exp">
              <span
                className={`player-exp-fill ${leveledUp ? 'is-levelup' : ''}`}
                style={{ width: `${levelProgress(level, exp) * 100}%` }}
              />
            </span>
            <span className="user-pill-exp-count">{exp}/{need}</span>
          </span>
        </span>
      </button>

      {/* AnimatePresence ทำให้ตอนปิดมี exit จริง — conditional render เฉย ๆ จะหายวับทันที
          (คลาส fade-in เดิมถูกถอดออก ไม่งั้นจะซ้อนกับ opacity ที่ motion คุม) */}
      <AnimatePresence>
        {flyoutOpen && (
          <motion.div
            className="user-pill-flyout sketch-border"
            role="menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <button role="menuitem" onClick={() => { navigate('/profile'); setFlyoutOpen(false); }}>
              ดูโปรไฟล์
            </button>
            <button role="menuitem" onClick={() => { onLogout(); setFlyoutOpen(false); }}>
              ออกจากระบบ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// index = ลำดับปุ่ม ใช้หน่วงให้ทยอยโผล่ทีละใบ · hint = คำอธิบายจาง ๆ ที่โผล่ตอนชี้
// entrance รับ stagger มาจากแม่ (.menu-panel) — ปุ่มไม่ต้องรู้ลำดับตัวเองแล้ว
// hover/tap คุมด้วย motion ไม่ใช่ CSS เพราะ CSS animation จะแย่ง transform
// ทำให้ hover ไม่ขยับตลอดช่วงที่ปุ่มยังโผล่ไม่เสร็จ
function MenuBtn({ title, sub, hint, onClick, primary = false, icon, onHover }) {
  return (
    <motion.button type="button" onClick={onClick} disabled={!onClick}
      onMouseEnter={onHover}
      variants={menuItemVariants}
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`menu-btn sketch-border ${primary ? 'is-primary' : ''}`}>
      <div className="menu-icon">{icon}</div>
      <div className="menu-text">
        <div className="menu-title">{title}</div>
        {sub && <div className="menu-sub">{sub}</div>}
        {hint && <span className="menu-hint">{hint}</span>}
      </div>
      <span className="menu-arrow"><IconArrow /></span>
    </motion.button>
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