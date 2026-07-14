import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/Gamecontext.jsx';
import ChatBox from '../src/components/ChatBox.jsx';
import PlayerSidebar from '../src/components/PlayerSidebar.jsx';
import ActionLogBar from '../src/components/ActionLogBar.jsx';
import VotingPanel from '../src/components/VotingPanel.jsx';
import NightAction from '../src/components/NightAction.jsx';
import MorningEventBanner from '../src/components/MorningEventBanner.jsx';
import MyRoleCard from '../src/components/MyRoleCard.jsx';
import '../src/styles/GamePage.css';

const ROLE_LABEL = {
  villager:  '🧑‍🌾 Villager',
  werewolf:  '🐺 Werewolf',
  seer:      '🔮 Seer',
  bodyguard: '🛡️ Bodyguard',
  silencer:  '🤐 Silencer',
  fool:      '🃏 Fool',
};

// map phase → บรรยากาศกลางวัน/คืนของ clock + badge (ผูกกับ phase จริง ไม่ใช่เวลาสมมติ)
const PHASE_LOOK = {
  night_zero: { night: true, orb: '🌘', mood: 'เตรียมตัว', badge: 'NIGHT', roundWord: 'คืนที่' },
  night:   { night: true,  orb: '🌙', mood: 'กลางคืน',  badge: 'NIGHT', roundWord: 'คืนที่' },
  day:     { night: false, orb: '☀️', mood: 'กลางวัน',  badge: 'DAY',   roundWord: 'วันที่' },
  voting:  { night: false, orb: '☀️', mood: 'ลงคะแนน',  badge: 'DAY',   roundWord: 'วันที่' },
  results: { night: false, orb: '🌇', mood: 'ประกาศผล', badge: 'DAY',   roundWord: 'วันที่' },
  lobby:   { night: true,  orb: '🌙', mood: 'เตรียมตัว', badge: 'NIGHT', roundWord: 'คืนที่' },
};

function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// clock บน top bar — นับถอยหลังตามเวลาจริงของ phase (phaseEndsAt มาจาก server)
function PhaseClock({ phase, phaseEndsAt, round }) {
  const [remaining, setRemaining] = useState(0);
  const look = PHASE_LOOK[phase] || PHASE_LOOK.lobby;

  useEffect(() => {
    if (!phaseEndsAt) { setRemaining(0); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  const urgent = remaining <= 10 && remaining > 0;

  return (
    <div className={`gp-clock${look.night ? ' is-night' : ''}${urgent ? ' is-urgent' : ''}`}>
      <div className="gp-clock-face">
        <span className="gp-clock-orb" aria-hidden="true">{look.orb}</span>
        <span className="gp-clock-time">{phaseEndsAt ? fmtClock(remaining) : '--:--'}</span>
      </div>
      <span className="gp-clock-label">{look.mood} · {look.roundWord} {round ?? 1}</span>
    </div>
  );
}

// role ที่มี night action — ใช้ตัดสินว่าจะโผล่ secondary timer ตอนกลางคืนไหม
const NIGHT_ACTION_ROLES = ['werewolf', 'seer', 'bodyguard', 'silencer'];

// secondary timer — conditional: นับถอยหลังเวลาเฉพาะกิจ (โหวต / ใช้สกิล)
// ใช้ phaseEndsAt เดียวกับ clock แต่เน้นย้ำเป็นกล่องแยกพร้อม label + progress
function SecondaryTimer({ phaseEndsAt, phaseDurationMs, label, color }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!phaseEndsAt) { setRemaining(0); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  const total = phaseDurationMs || 30000;
  const pct = phaseEndsAt ? Math.max(0, Math.min(1, (phaseEndsAt - Date.now()) / total)) : 0;
  const urgent = remaining <= 10 && remaining > 0;

  return (
    <div className={`gp-sectimer${urgent ? ' is-urgent' : ''}`}>
      <div className="gp-sectimer-top">
        <span className="gp-sectimer-label">{label}</span>
        <span className="gp-sectimer-count">{remaining}s</span>
      </div>
      <div className="gp-sectimer-track">
        <div className="gp-sectimer-fill" style={{ width: `${pct * 100}%`, background: urgent ? 'var(--phase-voting)' : color }} />
      </div>
    </div>
  );
}

// คืนที่ 0 — พาเนลกลางจอ: ยืนยันว่าดู role แล้ว + ความคืบหน้าของทั้งห้อง
function NightZeroPanel() {
  const { nightZero, markReady } = useGame();
  const [ready, setReady] = useState(false);

  function confirm() {
    setReady(true);
    markReady();
  }

  return (
    <div className="gp-panel gpz">
      <span className="gpz-kicker">คืนก่อนเริ่มเกม</span>
      <p className="gpz-text">เปิดการ์ดด้านล่างดูบทบาทของเจ้าให้ดี — ยังไม่มีอะไรเกิดขึ้นในคืนนี้</p>
      <button className="gp-btn gpz-btn" onClick={confirm} disabled={ready}>
        {ready ? 'รอผู้เล่นคนอื่น…' : 'ดูแล้ว พร้อมเริ่ม'}
      </button>
      <span className="gpz-count">{nightZero.readyCount}/{nightZero.total} พร้อมแล้ว</span>
    </div>
  );
}

export default function Game() {
  useParams();
  const navigate = useNavigate();
  const {
    room,
    playerId,
    nickname,
    myRole,
    myNightAction,
    typingIds,
    connected,
    error,
    leaveRoom,
    advancePhase,
    castVote,
    votes,
    voteResult,
    gameResult,
    silencedNote,
    isDead,
    clearError,
  } = useGame();

  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleLeave() {
    leaveRoom();
    navigate('/', { replace: true });
  }

  if (!room) {
    return (
      <div className="gp-page" style={{ placeItems: 'center' }}>
        <p className="gp-clock-label">กำลังเข้าสู่เกม…</p>
      </div>
    );
  }

  const isHost   = room.hostId === playerId;
  const players  = room.players || [];
  const isNight  = room.phase === 'night';
  const isNightZero = room.phase === 'night_zero';
  const isVoting = room.phase === 'voting';
  const isResults = room.phase === 'results';
  const look     = PHASE_LOOK[room.phase] || PHASE_LOOK.lobby;

  // secondary timer โผล่เฉพาะ 2 กรณี (ตาม spec): ช่วงโหวต / คืนที่เรามีสกิลให้ใช้
  const showVoteTimer  = isVoting && !isDead;
  const canNightAct    = isNight && !isDead && NIGHT_ACTION_ROLES.includes(myRole) && !myNightAction;

  return (
    <div className="gp-page">
      <MorningEventBanner />

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <header className="gp-top gp-panel">
        <div className="gp-top-left">
          <button
            className="gp-setting-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="ตั้งค่า"
            title="ตั้งค่า"
          >
            {/* grid icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2"  y="2"  width="6" height="6" rx="1.4" fill="currentColor"/>
              <rect x="12" y="2"  width="6" height="6" rx="1.4" fill="currentColor"/>
              <rect x="2"  y="12" width="6" height="6" rx="1.4" fill="currentColor"/>
              <rect x="12" y="12" width="6" height="6" rx="1.4" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <div className="gp-clock-stack">
          <PhaseClock phase={room.phase} phaseEndsAt={room.phaseEndsAt} round={room.round} />
          {showVoteTimer && (
            <SecondaryTimer
              phaseEndsAt={room.phaseEndsAt} phaseDurationMs={room.phaseDurationMs}
              label="⚖️ เวลาโหวต" color="var(--phase-voting)"
            />
          )}
          {canNightAct && (
            <SecondaryTimer
              phaseEndsAt={room.phaseEndsAt} phaseDurationMs={room.phaseDurationMs}
              label="🌙 เวลาใช้สกิล" color="var(--phase-night)"
            />
          )}
        </div>

        <div className="gp-top-right">
          <span className={`gp-daybadge ${look.night ? 'is-night' : 'is-day'}`}>
            {look.badge} {room.round ?? 1}
          </span>
          <div className="gp-roomcode">ห้อง <b>{room.id}</b></div>
        </div>
      </header>

      {error && (
        <div className="gp-banner">
          <span>{error}</span>
          <button onClick={clearError}>ปิด</button>
        </div>
      )}

      {gameResult && (
        <section className="gp-endcard gp-panel">
          <h2>{gameResult.message}</h2>
          {gameResult.reveal?.length > 0 && (
            <div className="gp-reveal">
              {gameResult.reveal.map((p) => (
                <span
                  key={p.id}
                  className={`gp-reveal-chip${p.role === 'werewolf' ? ' is-wolf' : ''}${p.isAlive ? '' : ' is-dead'}`}
                >
                  {p.nickname} · {ROLE_LABEL[p.role] || p.role}
                </span>
              ))}
            </div>
          )}
          <button className="gp-btn" onClick={handleLeave}>กลับหน้าแรก</button>
        </section>
      )}

      {/* ── ACTION LOG BAR ──────────────────────────────────── */}
      <ActionLogBar />

      {/* ── LEFT: Chat ──────────────────────────────────────── */}
      <aside className="gp-chat">
        <NightAction />
        {isVoting && <VotingPanel players={players} playerId={playerId} votes={votes} onVote={castVote} />}
        {isResults && voteResult && (
          <div className="gp-panel" style={{ padding: 'var(--space-4)' }}>
            <h3 style={{ color: 'var(--gold-bright)', marginBottom: 'var(--space-2)' }}>ผลโหวต</h3>
            <p>{voteResult.eliminatedNickname ? `${voteResult.eliminatedNickname} ถูกเนรเทศ` : 'ไม่มีใครถูกเนรเทศ'}</p>
          </div>
        )}
        <ChatBox showWerewolfChannel />
      </aside>

      {/* ── CENTER: character stage + your role ─────────────── */}
      <main className="gp-center">
        {isNightZero && <NightZeroPanel />}

        {/* ช่องตัวละคร — เว้นไว้รอระบบแต่งตัว (customize) จริง */}
        <div className="gpch gp-panel">
          <div className="gpch-frame">
            <span className="gpch-silhouette" aria-hidden="true">🧍</span>
            <span className="gpch-note">ตัวละครของเจ้า</span>
          </div>
        </div>

        <MyRoleCard />
        {(silencedNote || isDead) && (
          <div className="gp-panel" style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '0.85rem' }}>
            {silencedNote && !isDead && <p>🤐 โดนใบ้! วันนี้เจ้าพิมพ์อะไรไม่ได้จนกว่าจะขึ้นคืนใหม่</p>}
            {isDead && <p>👻 เจ้าตายแล้ว — ดูเกมต่อได้ และคุยได้เฉพาะในห้องวิญญาณ</p>}
          </div>
        )}
      </main>

      {/* ── RIGHT: player sidebar (dynamic priority list) ───── */}
      <PlayerSidebar
        players={players}
        playerId={playerId}
        hostId={room.hostId}
        voteMap={votes?.voteMap}
        typingIds={typingIds}
      />

      {/* ── in-game settings modal ──────────────────────────── */}
      {settingsOpen && (
        <div className="gp-modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="gp-modal gp-panel" onClick={(e) => e.stopPropagation()}>
            <div className="gp-modal-head">
              <h3>ตั้งค่า</h3>
              <button className="gp-modal-close" onClick={() => setSettingsOpen(false)} aria-label="ปิด">✕</button>
            </div>
            <div className="gp-modal-row">
              <p className="gp-clock-label">
                {nickname} · {connected ? 'เชื่อมต่ออยู่' : 'หลุดการเชื่อมต่อ'}
              </p>
              {isHost && (isNight || isVoting || isResults) && (
                <button className="gp-btn" onClick={() => { advancePhase(); setSettingsOpen(false); }}>
                  ข้ามช่วงนี้ (host)
                </button>
              )}
              <button className="gp-btn" onClick={handleLeave}>ออกจากเกม</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
