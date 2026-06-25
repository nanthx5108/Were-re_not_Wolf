import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import PlayerCard from '../src/components/PlayerCard.jsx';
import ChatBox    from '../src/components/ChatBox.jsx';
import Navbar     from '../src/components/Navbar.jsx';
import '../src/styles/Lobby.css'; // เรียกใช้ CSS ใหม่

const MIN_PLAYERS = 4;

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
      <div className="lobby-centered">
        <p className="lobby-loading-text">
          {connected ? 'Loading room…' : 'Connecting to island…'}
        </p>
      </div>
    );
  }

  const isHost      = room.hostId === playerId;
  const playerCount = room.players?.length ?? 0;
  const canStart    = isHost && playerCount >= MIN_PLAYERS;

  return (
    <div className="lobby-page">
      <Navbar roomId={room.id} nickname={nickname} connected={connected} onLeave={handleLeave} />

      {error && (
        <div className="lobby-error-banner">
          <span>{error}</span>
          <button onClick={clearError} className="lobby-error-close">✕</button>
        </div>
      )}

      <main className="lobby-main">
        {/* Left Aside: Player List & Host Controls */}
        <aside className="lobby-aside">
          
          <section className="lobby-section">
            <h3 className="lobby-section-title">
              Islanders
              <span className="lobby-badge">{playerCount}</span>
            </h3>
            
            <div className="lobby-player-grid custom-scrollbar">
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

          {isHost && (
            <section className="lobby-section">
              <p className="lobby-hint">
                {playerCount < MIN_PLAYERS
                  ? `Waiting for ${MIN_PLAYERS - playerCount} more player${MIN_PLAYERS - playerCount !== 1 ? 's' : ''}…`
                  : `${playerCount} islanders ready!`}
              </p>
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`lobby-start-btn ${canStart ? 'ready' : ''}`}
              >
                🌙 Begin the Night
              </button>
            </section>
          )}

        </aside>

        {/* Right Section: Chat */}
        <section className="lobby-chat-section">
          <ChatBox />
        </section>
      </main>
    </div>
  );
}