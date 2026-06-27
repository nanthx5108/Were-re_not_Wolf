import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import PlayerCard from '../src/components/PlayerCard.jsx';
import ChatBox from '../src/components/ChatBox.jsx';
import PhaseTimer from '../src/components/PhaseTimer.jsx';
import VotingPanel from '../src/components/VotingPanel.jsx';
import NightAction from '../src/components/NightAction.jsx';
import Navbar from '../src/components/Navbar.jsx';
import '../src/styles/Lobby.css';

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const {
    room,
    playerId,
    nickname,
    myRole,
    connected,
    error,
    leaveRoom,
    advancePhase,
    castVote,
    votes,
    voteResult,
    gameResult,
    clearError,
  } = useGame();

  function handleLeave() {
    leaveRoom();
    navigate('/', { replace: true });
  }

  if (!room) {
    return <div className="lobby-centered"><p className="lobby-loading-text">Loading game…</p></div>;
  }

  const isHost = room.hostId === playerId;
  const alivePlayers = room.players || [];
  const isNight = room.phase === 'night';
  const isVoting = room.phase === 'voting';
  const isResults = room.phase === 'results';

  return (
    <div className="lobby-page">
      <Navbar roomId={room.id} nickname={nickname} connected={connected} onLeave={handleLeave} />

      {error && (
        <div className="lobby-error-banner">
          <span>{error}</span>
          <button onClick={clearError} className="lobby-error-close">Close</button>
        </div>
      )}

      {gameResult && (
        <div className="lobby-error-banner" style={{ background: 'rgba(232, 160, 39, 0.16)' }}>
          <span><strong>{gameResult.message}</strong></span>
        </div>
      )}

      <main className="lobby-main" style={{ alignItems: 'stretch' }}>
        <aside className="lobby-aside" style={{ gap: '1rem' }}>
          <section className="lobby-section">
            <h3 className="lobby-section-title">Players</h3>
            <div className="lobby-player-grid custom-scrollbar">
              {alivePlayers.map((player) => (
                <PlayerCard key={player.id} player={player} isMe={player.id === playerId} isHost={player.id === room.hostId} myRole={player.id === playerId ? myRole : null} showRole={false} />
              ))}
            </div>
          </section>

          <section className="lobby-section">
            <PhaseTimer phase={room.phase} phaseEndsAt={room.phaseEndsAt} round={room.round} />
            {(isNight || isVoting || isResults) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                {isHost && <button className="lobby-start-btn" onClick={advancePhase}>Skip phase</button>}
              </div>
            )}
          </section>
        </aside>

        <section className="lobby-chat-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isNight && <NightAction />}
          {isVoting && <VotingPanel players={alivePlayers} playerId={playerId} votes={votes} onVote={castVote} />}
          {isResults && voteResult && (
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)' }}>
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-accent)' }}>Results</h3>
              <p>{voteResult.eliminatedNickname ? `${voteResult.eliminatedNickname} was eliminated.` : 'No one was eliminated.'}</p>
            </div>
          )}
          <ChatBox showWerewolfChannel />
        </section>
      </main>
    </div>
  );
}
