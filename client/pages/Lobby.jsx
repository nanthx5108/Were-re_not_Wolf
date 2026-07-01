import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/Gamecontext.jsx';
import PlayerCard from '../src/components/PlayerCard.jsx';
import ChatBox    from '../src/components/ChatBox.jsx';
import Navbar     from '../src/components/Navbar.jsx';
import '../src/styles/Lobby.css';

const MIN_PLAYERS = 4;

const GAME_RULES = [
  'แต่ละคืนหมาป่าจะเลือกฆ่าผู้เล่น 1 คนอย่างลับๆ',
  'Seer ตรวจสอบบทบาทของผู้เล่น 1 คนได้ทุกคืน',
  'Bodyguard ปกป้องผู้เล่น 1 คนจากการถูกฆ่าได้ทุกคืน',
  'กลางวันทุกคนโหวตขับผู้เล่นที่สงสัยว่าเป็นหมาป่าออกจากเกาะ',
  'Fool ชนะเกมทันทีถ้าโดนโหวตออก',
  'ชาวบ้านชนะถ้ากำจัดหมาป่าหมด หมาป่าชนะถ้าฆ่าชาวบ้านจนเหลือน้อยกว่าหรือเท่ากับจำนวนหมาป่า',
];

export default function Lobby() {
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const {
    room, playerId, nickname, myRole,
    connected, error,
    leaveRoom, startGame, clearError,
  } = useGame();

  useEffect(() => {
    if (!playerId || !nickname) navigate('/', { replace: true });
  }, [playerId, nickname, navigate]);

  useEffect(() => {
    if (room?.status === 'in_progress') {
      navigate(`/game/${roomId}`, { replace: true });
    }
  }, [room?.status, roomId, navigate]);

  function handleLeave() {
    leaveRoom();
    navigate('/', { replace: true });
  }

  if (!room) {
    return (
      <div className="lobby-loading">
        <p className="loading-text">
          {connected ? 'Loading room…' : 'Connecting to island…'}
        </p>
      </div>
    );
  }

  const isHost      = room.hostId === playerId;
  const playerCount = room.players?.length ?? 0;
  const roomCapacity = Number.isInteger(room.maxPlayers) ? room.maxPlayers : 8;
  const canStart    = isHost && playerCount >= MIN_PLAYERS && playerCount <= roomCapacity;

  return (
    <div className="lobby-page">
      <Navbar roomId={room.id} nickname={nickname} connected={connected} onLeave={handleLeave} />

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={clearError} className="error-close">×</button>
        </div>
      )}

      <main className="lobby-main">
        <aside className="lobby-aside">

          <section className="lobby-section">
            <div className="section-header">
              <h3 className="section-title">Islanders</h3>
              <span className="player-badge">{playerCount}/{roomCapacity}</span>
            </div>

            <div className="player-grid custom-scrollbar">
              {room.players?.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isMe={player.id === playerId}
                  isHost={player.id === room.hostId}
                  myRole={player.id === playerId ? myRole : null}
                  showRole={false}
                />
              ))}
            </div>
          </section>

          <section className="lobby-section lobby-rules">
            <div className="section-header">
              <h3 className="section-title">กฎกติกา</h3>
            </div>
            <ul className="rules-list">
              {GAME_RULES.map((rule, i) => (
                <li key={i} className="rules-item">{rule}</li>
              ))}
            </ul>
          </section>

          {isHost && (
            <section className="lobby-section host-controls">
              <p className="host-hint">
                {playerCount < MIN_PLAYERS
                  ? `Waiting for ${MIN_PLAYERS - playerCount} more player${MIN_PLAYERS - playerCount !== 1 ? 's' : ''}…`
                  : `${playerCount} islanders ready!`}
              </p>
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`btn-start-game ${canStart ? 'ready' : ''}`}
              >
                Begin the Night
              </button>
            </section>
          )}

        </aside>

        <section className="lobby-chat-section">
          <ChatBox />
        </section>
      </main>
    </div>
  );
}