import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/Gamecontext.jsx';
import ChatBox    from '../src/components/ChatBox.jsx';
import HowToPlayModal from '../src/components/HowToPlayModal.jsx';
import RoomConfigPanel from '../src/components/RoomConfigPanel.jsx';
import { MORNING_EVENT_INFO } from '../src/constants/game.js';
import bgHome from '../src/assets/bgHome.jpg';
import '../src/styles/GamePage.css';   /* ChatBox ใช้คลาส .gpc-* จากไฟล์นี้ */
import '../src/styles/Lobby.css';

const MIN_PLAYERS = 4;

const GAME_RULES = [
  'แต่ละคืนหมาป่าจะร่วมกันเลือกฆ่าผู้เล่น 1 คนอย่างลับๆ และเห็นทีมกันเอง',
  'Seer ตรวจผู้เล่น 1 คนได้ทุกคืน แต่รู้แค่ว่าเขาอยู่ฝ่ายไหน',
  'Bodyguard ปกป้องผู้เล่น 1 คนจากการถูกฆ่าได้ทุกคืน ห้ามเฝ้าคนเดิม 2 คืนติด',
  'Silencer ปิดปากผู้เล่น 1 คน ทำให้เขาพิมพ์อะไรไม่ได้เลยตลอดวันถัดไป',
  'กลางวันทุกคนโหวตขับผู้เล่นที่สงสัยว่าเป็นหมาป่าออกจากเกาะ คะแนนเสมอ = ไม่มีใครถูกขับ',
  'Fool ชนะเกมทันทีถ้าโดนโหวตออก (แต่ถ้าถูกฆ่ากลางคืนไม่นับ)',
  'ชาวบ้านชนะถ้ากำจัดหมาป่าหมด หมาป่าชนะถ้าฆ่าชาวบ้านจนเหลือน้อยกว่าหรือเท่ากับจำนวนหมาป่า',
];

/* ── หิ่งห้อยลอยเหนือฉากหลัง — ชุดเดียวกับหน้าแรก ให้สองหน้าเป็นเกาะเดียวกัน ── */
function FirefliesLayer() {
  const flies = useMemo(() =>
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      left: 4 + Math.random() * 92,
      top: 12 + Math.random() * 74,
      dur: 4 + Math.random() * 3,
      delay: Math.random() * 5,
      dx: (Math.random() * 2 - 1) * 26,
      dy: -14 - Math.random() * 22,
    })), []);
  return (
    <div className="lobby-fireflies" aria-hidden="true">
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

function initialOf(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/* หมุดไม้สี่มุม — signature ของทั้งเว็บ ตอกป้ายไม้ไว้กับผนัง */
function Pegs() {
  return (
    <span className="pegs" aria-hidden="true">
      <span className="peg peg-tl" /><span className="peg peg-tr" />
      <span className="peg peg-bl" /><span className="peg peg-br" />
    </span>
  );
}

/* หัวข้อป้ายไม้ — เส้นคั่นสองข้างเป็นของจริง ไม่ใช่ขีดที่พิมพ์ในข้อความ */
function PlaqueTitle({ children }) {
  return (
    <h2 className="panel-title">
      <span className="panel-title-rule" aria-hidden="true" />
      <span className="panel-title-text">{children}</span>
      <span className="panel-title-rule" aria-hidden="true" />
    </h2>
  );
}

/* ── แถวผู้เล่นในคอลัมน์ขวา ── */
function IslanderRow({ player, isMe, isHost, index }) {
  const offline = player.isConnected === false;
  return (
    <li
      className={`islander${isMe ? ' is-me' : ''}${offline ? ' is-offline' : ''}`}
      style={{ '--row-i': index }}
    >
      <span className="islander-ava" aria-hidden="true">{initialOf(player.nickname)}</span>
      <span className="islander-meta">
        <span className="islander-name">{player.nickname}</span>
        <span className="islander-tags">
          {isHost  && <span className="islander-tag is-host">โฮสต์</span>}
          {isMe    && <span className="islander-tag is-me">คุณ</span>}
          {offline && <span className="islander-tag is-offline">หลุดการเชื่อมต่อ</span>}
        </span>
      </span>
      <span className="islander-dot" aria-hidden="true" />
    </li>
  );
}

export default function Lobby() {
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const {
    room, playerId, nickname, connected, error,
    leaveRoom, startGame, clearError, updateRoomConfig,
  } = useGame();

  const [cfgTab,   setCfgTab]   = useState('roles');   // บทบาท / เวลา
  const [mainTab,  setMainTab]  = useState('chat');    // ช่องแชท / กติกา
  const [copied,   setCopied]   = useState(false);
  const [howTo,    setHowTo]    = useState(false);
  const copyTimer = useRef(null);

  useEffect(() => {
    if (!playerId || !nickname) navigate('/', { replace: true });
  }, [playerId, nickname, navigate]);

  useEffect(() => {
    if (room?.status === 'in_progress') {
      navigate(`/game/${roomId}`, { replace: true });
    }
  }, [room?.status, roomId, navigate]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  function handleLeave() {
    leaveRoom();
    navigate('/', { replace: true });
  }

  // คัดลอกรหัสห้องไปชวนเพื่อน — ขึ้น "คัดลอกแล้ว" 1.6 วิแล้วกลับเป็นเดิม
  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(room.id);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* เบราว์เซอร์ไม่ให้สิทธิ์ — ผู้เล่นยังลากเลือกรหัสเองได้ */
    }
  }

  if (!room) {
    return (
      <div className="lobby-loading" style={{ backgroundImage: `url(${bgHome})` }}>
        <div className="lobby-overlay" />
        <div className="lobby-loading-inner">
          <span className="lobby-loading-moon" aria-hidden="true" />
          <p className="loading-text">
            {connected ? 'กำลังโหลดห้อง…' : 'กำลังเชื่อมต่อ…'}
          </p>
        </div>
      </div>
    );
  }

  const isHost       = room.hostId === playerId;
  const playerCount  = room.players?.length ?? 0;
  const roomCapacity = Number.isInteger(room.maxPlayers) ? room.maxPlayers : 8;
  const canStart     = isHost && playerCount >= MIN_PLAYERS && playerCount <= roomCapacity;
  const emptySeats   = Math.max(0, roomCapacity - playerCount);

  return (
    <div className="lobby-shell" style={{ backgroundImage: `url(${bgHome})` }}>
      <div className="lobby-overlay" />
      <div className="lobby-fog" aria-hidden="true" />
      <div className="lobby-grain" aria-hidden="true" />
      <FirefliesLayer />

      <header className="lobby-topbar">
        <button onClick={handleLeave} className="lobby-leave">
          <span className="lobby-leave-arrow" aria-hidden="true">←</span>
          ออกห้อง
        </button>

        <div className="lobby-roomid">
          <span className={`lobby-conn ${connected ? 'is-on' : 'is-off'}`}
                title={connected ? 'เชื่อมต่ออยู่' : 'กำลังเชื่อมต่อใหม่'} />
          <span className="lobby-roomid-label">ROOM ID</span>
          <span className="lobby-roomid-code">{room.id}</span>
          <button onClick={copyRoomId} className="lobby-copy"
                  aria-label="คัดลอกรหัสห้อง" title="คัดลอกรหัสห้อง">
            {copied ? '✓' : '⧉'}
          </button>
          {copied && <span className="lobby-copied">คัดลอกแล้ว</span>}
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={clearError} className="error-close" aria-label="ปิด">×</button>
        </div>
      )}

      <main className="lobby-grid">

        {/* ── ซ้าย: ตั้งค่าห้อง ── */}
        <section className="lobby-panel lobby-config">
          <Pegs />

          <div className="panel-head">
            <PlaqueTitle>ตั้งค่าห้อง</PlaqueTitle>
            {!isHost && <span className="panel-note">โฮสต์เป็นคนตั้ง</span>}
          </div>

          <div className="lobby-tabs" role="tablist" aria-label="หมวดการตั้งค่า">
            {[['roles', 'บทบาท'], ['timing', 'เวลา']].map(([key, label]) => (
              <button key={key} role="tab" aria-selected={cfgTab === key}
                      className={`lobby-tab${cfgTab === key ? ' is-active' : ''}`}
                      onClick={() => setCfgTab(key)}>
                {label}
              </button>
            ))}
          </div>

          <div className="lobby-panel-body custom-scrollbar" key={cfgTab}>
            <RoomConfigPanel
              section={cfgTab}
              roleConfig={room.roleConfig}
              phaseDurations={room.phaseDurations}
              revealRoleOnDeath={room.revealRoleOnDeath}
              maxPlayers={roomCapacity}
              playerCount={playerCount}
              editable={isHost}
              onChange={updateRoomConfig}
            />
          </div>
        </section>

        {/* ── กลาง: แชท / กติกา ── */}
        <section className="lobby-panel lobby-center">
          <Pegs />

          <div className="panel-head is-split">
            <div className="lobby-tabs" role="tablist" aria-label="ช่องกลาง">
              {[['chat', 'ช่องแชท'], ['rules', 'กติกา']].map(([key, label]) => (
                <button key={key} role="tab" aria-selected={mainTab === key}
                        className={`lobby-tab${mainTab === key ? ' is-active' : ''}`}
                        onClick={() => setMainTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {isHost ? (
              <button onClick={startGame} disabled={!canStart}
                      className={`btn-start-game${canStart ? ' ready' : ''}`}>
                {canStart
                  ? `เริ่มเกม · ${playerCount}/${roomCapacity}`
                  : `รออีก ${MIN_PLAYERS - playerCount} คน`}
              </button>
            ) : (
              <span className="lobby-waiting">
                รอเกมเริ่ม <strong>{playerCount}/{roomCapacity}</strong>
              </span>
            )}
          </div>

          {mainTab === 'chat' ? (
            <div className="lobby-chatwrap">
              <ChatBox showHead={false} />
            </div>
          ) : (
            <div className="lobby-panel-body custom-scrollbar lobby-rules">
              <h3 className="lobby-subhead">กติกาโดยย่อ</h3>
              <ul className="rules-list">
                {GAME_RULES.map((rule, i) => (
                  <li key={i} className="rules-item" style={{ '--row-i': i }}>{rule}</li>
                ))}
              </ul>

              <h3 className="lobby-subhead">
                เหตุการณ์ประจำเช้า
                <span className="panel-note">สุ่ม 1 อย่างทุกเช้า</span>
              </h3>
              <p className="events-intro">
                ทุกเช้าหลังจบกลางคืน เกาะจะสุ่มเหตุการณ์ขึ้นมา 1 อย่างและประกาศให้ทุกคนรู้พร้อมกัน
                บางเหตุการณ์เปลี่ยนกติกาของคืนถัดไป บางอย่างเปลี่ยนเวลาพูดคุย และบางอย่างก็ไม่มีผลอะไรเลย
                เหตุการณ์ที่เพิ่งออกจะไม่ออกซ้ำติด ๆ กัน
              </p>
              <ul className="events-list">
                {MORNING_EVENT_INFO.map((ev, i) => (
                  <li key={ev.title} className="events-item" style={{ '--row-i': i }}>
                    <span className="events-icon" aria-hidden="true">{ev.icon}</span>
                    <span className="events-text">
                      <strong className="events-title">{ev.title}</strong>
                      <span className="events-effect">{ev.effect}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── ขวา: รายชื่อผู้เล่น ── */}
        <aside className="lobby-panel lobby-players">
          <Pegs />

          <div className="panel-head">
            <PlaqueTitle>ผู้เล่น</PlaqueTitle>
            <span className="player-badge">{playerCount}/{roomCapacity}</span>
          </div>

          <ul className="lobby-panel-body custom-scrollbar islander-list">
            {room.players?.map((player, i) => (
              <IslanderRow
                key={player.id}
                player={player}
                index={i}
                isMe={player.id === playerId}
                isHost={player.id === room.hostId}
              />
            ))}
            {Array.from({ length: emptySeats }, (_, i) => (
              <li key={`seat-${i}`} className="islander is-empty" style={{ '--row-i': playerCount + i }}>
                <span className="islander-ava is-empty" aria-hidden="true" />
                <span className="islander-empty-text">ที่นั่งว่าง</span>
              </li>
            ))}
          </ul>

          <p className="lobby-invite">
            ส่งรหัส <strong>{room.id}</strong> ให้เพื่อนเพื่อเข้าห้องนี้
          </p>
        </aside>
      </main>

      <button className="lobby-fab" onClick={() => setHowTo(true)}
              aria-label="วิธีการเล่น" title="วิธีการเล่น">
        <span aria-hidden="true">?</span>
      </button>

      {howTo && <HowToPlayModal onClose={() => setHowTo(false)} />}
    </div>
  );
}
