import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import bgHome from '../src/assets/background_main.jpg';

const BG_IMAGE =  bgHome;

const API = '/api/rooms';

const NEWS = [
  {
    id: 1,
    title: 'อัพเดท — Voting System เปิดใช้งานแล้ว',
    desc:  'โหวตไล่ผู้ต้องสงสัยออกจากเกาะได้แล้ว พร้อม live vote count',
    date:  'Day 1',
    opacity: 1,
  },
  {
    id: 2,
    title: 'Phase Timer — นับถอยหลังทุก phase',
    desc:  'Night 30s · Day 60s · Voting 30s · Results 10s',
    date:  'Day 2',
    opacity: 0.55,
  },
  {
    id: 3,
    title: 'Coming Soon — Night Actions',
    desc:  'หมาป่า, หมอดู, บอดี้การ์ด ใช้ความสามารถกลางคืน',
    date:  'เร็วๆ นี้',
    opacity: 0.3,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { setIdentity, joinRoom } = useGame();

  const [mode,     setMode]     = useState(null);
  const [nickname, setNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!nickname.trim() || !roomName.trim()) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hostNickname: nickname.trim(), roomName: roomName.trim() }),
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nickname: nickname.trim() }),
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
    <div style={{
      ...s.page,
      backgroundImage: BG_IMAGE ? `url(${BG_IMAGE})` : undefined,
    }}>
      <div style={s.overlay} />

      <div style={s.grid}>

        <div style={s.left}>
          <div style={{ marginBottom: 4 }}>
            <h1 style={s.title}>WE'RE <span style={s.titleNot}>not</span> WOLF</h1>
            <p style={s.tagline}>🏝️ เกาะลึกลับ · ใต้ท้องฟ้ากลางคืน · ไม่มีใครรู้ความจริง</p>
          </div>

          <div style={s.sep} />

          {!mode && (
            <div style={s.menuList}>
              <MenuBtn icon="🏠" title="Create Room"   sub="สร้างห้องใหม่และเชิญเพื่อน"           onClick={() => setMode('create')} />
              <MenuBtn icon="🚢" title="Join Room"     sub="เข้าร่วมด้วยรหัสห้อง"                onClick={() => setMode('join')} />
              <MenuBtn icon="🐺" title="วิธีเล่น"      sub="กฎและบทบาทของผู้เล่น"  red />
              <MenuBtn icon="⚙️" title="ตั้งค่า"       sub="ปรับเสียงและการแสดงผล" />
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} style={s.form}>
              <h2 style={s.formTitle}>🏠 สร้างห้องใหม่</h2>
              {error && <ErrorBox msg={error} />}
              <Field label="ชื่อของคุณ"    id="nick"  value={nickname} onChange={e => setNickname(e.target.value)}  placeholder="เช่น สมชาย, มาลี..."   max={32} autoFocus />
              <Field label="ชื่อห้อง"       id="room"  value={roomName} onChange={e => setRoomName(e.target.value)}  placeholder="เช่น เกาะประหลาด..."   max={64} />
              <div style={s.btnRow}>
                <button type="submit" style={s.btnPrimary} disabled={loading || !nickname.trim() || !roomName.trim()}>
                  {loading ? '⏳ กำลังสร้าง...' : '🌙 สร้างห้อง'}
                </button>
                <button type="button" style={s.btnBack} onClick={reset}>← กลับ</button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} style={s.form}>
              <h2 style={s.formTitle}>🚢 เข้าร่วมห้อง</h2>
              {error && <ErrorBox msg={error} />}
              <Field label="ชื่อของคุณ" id="nick2" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="เช่น สมชาย, มาลี..." max={32} autoFocus />
              <Field label="รหัสห้อง"   id="code"  value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="ABC123" max={8}
                extraStyle={{ textTransform:'uppercase', letterSpacing:'0.2em', fontSize:'18px', fontWeight:700 }} />
              <div style={s.btnRow}>
                <button type="submit" style={s.btnPrimary} disabled={loading || !nickname.trim() || !roomCode.trim()}>
                  {loading ? '⏳ กำลังเข้า...' : '🛶 เข้าร่วม'}
                </button>
                <button type="button" style={s.btnBack} onClick={reset}>← กลับ</button>
              </div>
            </form>
          )}

          {!mode && (
            <div style={s.playerBar}>
              <div style={s.playerAva}>🧍</div>
              <div>
                <div style={s.playerName}>ตั้งชื่อก่อนเข้าเล่น</div>
                <div style={s.playerHint}>ชื่อจะแสดงให้ผู้เล่นคนอื่นเห็น</div>
              </div>
            </div>
          )}
        </div>

        <div style={s.right}>
          <div style={s.panelHead}>
            <span>ข่าวสาร</span>
            <div style={s.panelLine} />
          </div>

          <div style={{ flex: 1 }}>
            {NEWS.map(n => (
              <div key={n.id} style={s.newsItem}>
                <div style={{ ...s.newsDot, opacity: n.opacity }} />
                <div>
                  <div style={s.newsTitle}>{n.title}</div>
                  <div style={s.newsDesc}>{n.desc}</div>
                  <div style={s.newsDate}>{n.date}</div>
                </div>
              </div>
            ))}
          </div>

          <button style={s.moreBtn}>ดูทั้งหมด →</button>

          <div style={s.footer}>
            <div style={s.socials}>
              {['dc', 'fb', '🌐'].map(x => (
                <div key={x} style={s.socBtn}>{x}</div>
              ))}
            </div>
            <span style={s.version}>v0.6.0 beta</span>
          </div>
        </div>

      </div>
    </div>
  );
}


function MenuBtn({ icon, title, sub, red, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{ ...s.menuBtn, ...(hovered ? s.menuBtnHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...s.menuIcon, ...(red ? s.menuIconRed : {}) }}>{icon}</div>
      <div>
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
        onFocus={e  => { e.target.style.borderColor = '#e8a027'; }}
        onBlur={e   => { e.target.style.borderColor = 'rgba(60,80,100,.6)'; }}
      />
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={s.errorBox}>{msg}</div>
  );
}

const s = {
  page: {
    minHeight:           '100dvh',
    backgroundSize:      'cover',
    backgroundPosition:  'center top',
    backgroundColor:     '#080c14', // fallback ถ้าไม่มีรูป
    position:            'relative',
    fontFamily:          "'Sarabun', sans-serif",
    color:               '#d8c8a8',
  },
  overlay: {
    position:   'absolute',
    inset:       0,
    background: 'rgba(4,6,12,.6)',
    zIndex:      0,
  },
  grid: {
    position:            'relative',
    zIndex:               1,
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    minHeight:           '100dvh',
  },

  left: {
    padding:        '40px 28px 32px 40px',
    display:        'flex',
    flexDirection:  'column',
    borderRight:    '1px solid rgba(232,160,39,.12)',
  },
  title: {
    fontFamily:  "'Cinzel', 'Creepster', serif",
    fontSize:    'clamp(1.9rem, 4vw, 2.8rem)',
    color:       '#e8c878',
    letterSpacing: '.06em',
    lineHeight:   1.1,
    margin:        0,
  },
  titleNot: {
    fontSize:    '0.55em',
    color:       '#6a5030',
    fontStyle:   'italic',
    margin:      '0 4px',
  },
  tagline: {
    fontSize:     11,
    color:        '#4a5868',
    letterSpacing:'.1em',
    textTransform:'uppercase',
    marginTop:     6,
  },
  sep: {
    height:     1,
    background: 'rgba(232,160,39,.18)',
    margin:     '20px 0',
  },
  menuList: {
    display:       'flex',
    flexDirection: 'column',
    gap:            8,
    flex:           1,
  },
  menuBtn: {
    display:        'flex',
    alignItems:     'center',
    gap:             14,
    padding:        '12px 16px',
    background:     'rgba(8,12,22,.75)',
    border:         '1px solid rgba(60,80,100,.5)',
    borderRadius:    6,
    cursor:         'pointer',
    textAlign:      'left',
    width:          '100%',
    transition:     'border-color .15s, background .15s',
  },
  menuBtnHover: {
    borderColor: 'rgba(232,160,39,.45)',
    background:  'rgba(10,16,30,.9)',
  },
  menuIcon: {
    width:          38,
    height:         38,
    borderRadius:    5,
    background:     'rgba(232,160,39,.1)',
    border:         '1px solid rgba(232,160,39,.2)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '1.25rem',
    flexShrink:      0,
  },
  menuIconRed: {
    background:  'rgba(120,20,20,.25)',
    borderColor: 'rgba(180,30,30,.4)',
  },
  menuTitle: { fontSize: 14, fontWeight: 700, color: '#d8c8a8', lineHeight: 1.2 },
  menuSub:   { fontSize: 11, color: '#4a5868', marginTop: 2 },

  playerBar: {
    marginTop:   16,
    padding:     '11px 14px',
    background:  'rgba(8,12,22,.8)',
    border:      '1px solid rgba(60,80,100,.45)',
    borderRadius: 6,
    display:     'flex',
    alignItems:  'center',
    gap:          12,
  },
  playerAva: {
    width:          34,
    height:         34,
    borderRadius:  '50%',
    background:    'rgba(100,20,20,.4)',
    border:        '1px solid rgba(180,30,30,.4)',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    fontSize:      '1rem',
    flexShrink:     0,
  },
  playerName: { fontSize: 13, fontWeight: 700, color: '#c8b898' },
  playerHint: { fontSize: 10, color: '#3a4858', marginTop: 2 },

  form: {
    display:       'flex',
    flexDirection: 'column',
    gap:            14,
    flex:            1,
  },
  formTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize:   '1.2rem',
    color:      '#e8c878',
    margin:      0,
  },
  fieldLabel: {
    fontSize:      11,
    fontWeight:    700,
    color:         '#8a9ab0',
    textTransform: 'uppercase',
    letterSpacing: '.07em',
  },
  input: {
    width:       '100%',
    background:  'rgba(10,14,24,.9)',
    border:      '1.5px solid rgba(60,80,100,.6)',
    borderRadius: 6,
    color:       '#d8c8a8',
    fontFamily:  "'Sarabun', sans-serif",
    fontSize:     14,
    padding:     '10px 14px',
    outline:     'none',
    transition:  'border-color .15s',
  },
  btnRow: { display: 'flex', gap: 10, marginTop: 4 },
  btnPrimary: {
    flex:        1,
    padding:    '11px 0',
    background: '#c89030',
    border:     'none',
    borderRadius: 6,
    color:      '#080c14',
    fontFamily: "'Sarabun', sans-serif",
    fontWeight:  700,
    fontSize:    14,
    cursor:     'pointer',
  },
  btnBack: {
    padding:    '11px 18px',
    background: 'transparent',
    border:     '1px solid rgba(60,80,100,.55)',
    borderRadius: 6,
    color:      '#6a7a8a',
    fontFamily: "'Sarabun', sans-serif",
    fontWeight:  600,
    fontSize:    13,
    cursor:     'pointer',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    background:   'rgba(140,30,30,.2)',
    border:       '1px solid rgba(180,40,40,.4)',
    borderRadius:  6,
    padding:      '8px 12px',
    fontSize:      13,
    color:        '#e08080',
  },

  right: {
    padding:       '40px 36px 32px 28px',
    display:       'flex',
    flexDirection: 'column',
  },
  panelHead: {
    display:     'flex',
    alignItems:  'center',
    gap:          12,
    fontFamily:  "'Cinzel', 'Creepster', serif",
    fontSize:    '1.15rem',
    color:       '#e8c878',
    marginBottom: 18,
  },
  panelLine: {
    flex:       1,
    height:      1,
    background: 'rgba(232,160,39,.2)',
  },
  newsItem: {
    display:      'flex',
    gap:           10,
    padding:      '12px 0',
    borderBottom: '1px solid rgba(50,65,85,.4)',
  },
  newsDot: {
    width:        5,
    height:       5,
    borderRadius: '50%',
    background:   '#c8a040',
    marginTop:     6,
    flexShrink:    0,
  },
  newsTitle: { fontSize: 13, fontWeight: 700, color: '#c8b898', lineHeight: 1.3 },
  newsDesc:  { fontSize: 11, color: '#4a5868', marginTop: 3, lineHeight: 1.4 },
  newsDate:  { fontSize: 10, color: '#2e3c4c', marginTop: 4 },

  moreBtn: {
    marginTop:   14,
    padding:      9,
    width:       '100%',
    background:  'transparent',
    border:      '1px solid rgba(60,80,100,.5)',
    borderRadius: 5,
    color:       '#5a6878',
    fontFamily:  "'Sarabun', sans-serif",
    fontSize:     12,
    cursor:      'pointer',
    display:     'flex',
    alignItems:  'center',
    justifyContent:'center',
    gap:           6,
  },
  footer: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:       14,
  },
  socials: { display:'flex', gap:6 },
  socBtn: {
    width:          26,
    height:         26,
    borderRadius:  '50%',
    background:    'rgba(8,12,22,.8)',
    border:        '1px solid rgba(50,65,85,.5)',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    fontSize:       11,
    color:         '#3a4858',
    cursor:        'pointer',
  },
  version: { fontSize: 10, color: '#2a3848' },
};