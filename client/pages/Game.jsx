import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../src/context/Gamecontext.jsx';
import { useSound } from '../src/context/SoundContext.jsx';
import ChatBox from '../src/components/ChatBox.jsx';
import PlayerSidebar from '../src/components/PlayerSidebar.jsx';
import ActionLogBar from '../src/components/ActionLogBar.jsx';
import VotingPanel from '../src/components/VotingPanel.jsx';
import NightAction from '../src/components/NightAction.jsx';
import MorningEventBanner from '../src/components/MorningEventBanner.jsx';
import MyRoleCard from '../src/components/MyRoleCard.jsx';
import '../src/styles/GamePage.css';
import EarlyInfoToast from '../src/components/EarlyInfoToast.jsx';
import FortuneInfoPanel from '../src/components/FortuneInfoPanel.jsx';
import HighlightTimeline from '../src/components/HighlightTimeline.jsx';
import FortuneEffects from '../src/components/FortuneEffects.jsx';
import FortuneCard from '../src/components/FortuneCard.jsx';
import AdminGameBar from '../src/components/AdminGameBar.jsx';
import VoiceChat from '../src/components/VoiceChat.jsx';

const ROLE_LABEL = {
  villager:  '🧑‍🌾 Villager',
  werewolf:  '🐺 Werewolf',
  seer:      '🔮 Seer',
  bodyguard: '🛡️ Bodyguard',
  silencer:  '🤐 Silencer',
  fool:      '🃏 Fool',
};

const PHASE_LOOK = {
  night_zero: { night: true, orb: '🌘', mood: 'เตรียมตัว', badge: 'NIGHT', roundWord: null }, // Changed roundWord
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
      <span className="gp-clock-label">{look.mood} {look.roundWord && `· ${look.roundWord} ${round ?? 1}`}</span> {/* Conditional roundWord */}
    </div>
  );
}

const NIGHT_ACTION_ROLES = ['werewolf', 'seer', 'bodyguard', 'silencer'];

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

function NightZeroPanel() {
  const { nightZero = { readyCount: 0, total: 0 }, markReady } = useGame();
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
  const navigate = useNavigate();
  const {
    room,
    playerId,
    nickname,
    myRole,
    messages,
    myNightAction,
    typingIds,    connected,
    leaveRoom,
    advancePhase,
    castVote,
    votes,
    voteResult,
    gameResult,
    requestExtraTime,
    highlights,
    realtimeVoteCounts,
    fortuneInfo,
    silencedNote,
    myFortuneCard,
    isDead,
  } = useGame();

  const sound = useSound();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function handleLeave() {
    leaveRoom();
    navigate('/', { replace: true });
  }

  useEffect(() => {
    if (gameResult) {
      const villageRoles = new Set(['villager', 'seer', 'bodyguard', 'silencer']);
      const normalizedWinner = gameResult.winner === 'villagers' ? 'village'
        : gameResult.winner === 'werewolves' ? 'werewolf'
        : gameResult.winner;
      let playerWins = false;

      if (normalizedWinner === 'village' && villageRoles.has(myRole)) {
        playerWins = true;
      } else if (normalizedWinner === 'werewolf' && myRole === 'werewolf') {
        playerWins = true;
      } else if (normalizedWinner === 'fool' && myRole === 'fool') {
        playerWins = true;
      }

      const sfx = playerWins ? '/assets/audio/SFX-GoodCard.mp3' : '/assets/audio/SFX-BadCard.mp3';
      sound.playSfx(sfx);

      const bgm = playerWins ? '/assets/audio/BGM-voting.mp3' : '/assets/audio/BGM-night.mp3';
      // Stop any current BGM and play the end-game music (not looping)
      sound.playBgm(bgm, false);
    }
  }, [gameResult, myRole, sound]);

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

  const showVoteTimer  = isVoting && !isDead;
  const canNightAct    = isNight && !isDead && NIGHT_ACTION_ROLES.includes(myRole) && !myNightAction;

  return (
    <div className="gp-page">
      <AdminGameBar />
      <VoiceChat />
      <MorningEventBanner />
      <EarlyInfoToast />
      <FortuneEffects card={myFortuneCard} messages={messages} />

      <header className="gp-top gp-panel">
        <div className="gp-top-left">
          <button
            className="gp-setting-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="ตั้งค่า"
            title="ตั้งค่า"
          >
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

      {gameResult && (
        <section className="gp-endcard gp-panel">
          <h2>{gameResult.message}</h2>
          <HighlightTimeline highlights={highlights} players={gameResult.reveal} />
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

      <ActionLogBar />

      <aside className="gp-chat">
        <NightAction />
        {isVoting && <VotingPanel players={players} playerId={playerId} votes={votes} onVote={castVote} myFortuneCard={myFortuneCard} realtimeVoteCounts={realtimeVoteCounts} phaseEndsAt={room.phaseEndsAt} />}
        {isResults && voteResult && (
          <div className="gp-panel" style={{ padding: 'var(--space-4)' }}>
            <h3 style={{ color: 'var(--gold-bright)', marginBottom: 'var(--space-2)' }}>ผลโหวต</h3>
            <p>{voteResult.eliminatedNickname ? `${voteResult.eliminatedNickname} ถูกเนรเทศ` : 'ไม่มีใครถูกเนรเทศ'}</p>
          </div>
        )}
        {isResults && <FortuneInfoPanel />}
        <ChatBox showWerewolfChannel clientEffect={myFortuneCard?.clientEffect} players={players} playerId={playerId} />
      </aside>

      <main className="gp-center">
        {isNightZero && <NightZeroPanel />}

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

      <PlayerSidebar
        players={players}
        playerId={playerId}
        hostId={room.hostId}
        voteMap={votes?.voteMap}
        typingIds={typingIds}
      />

      <FortuneCard card={myFortuneCard} />

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
              {myFortuneCard?.id === 'injury_time' && room.phase === 'day' && (
                <button className="gp-btn" onClick={() => { requestExtraTime(); setSettingsOpen(false); }}>
                  ขอต่อเวลา (+20 วิ)
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