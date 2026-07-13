import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/Gamecontext.jsx';
import PlayerCard from '../src/components/PlayerCard.jsx';
import ChatBox from '../src/components/ChatBox.jsx';
import PhaseTimer from '../src/components/PhaseTimer.jsx';
import VotingPanel from '../src/components/VotingPanel.jsx';
import NightAction from '../src/components/NightAction.jsx';
import MorningEventBanner from '../src/components/MorningEventBanner.jsx';
import MyRoleCard from '../src/components/MyRoleCard.jsx';
import Navbar from '../src/components/Navbar.jsx';
import '../src/styles/Lobby.css';

const ROLE_LABEL = {
  villager:  '🧑‍🌾 Villager',
  werewolf:  '🐺 Werewolf',
  seer:      '🔮 Seer',
  bodyguard: '🛡️ Bodyguard',
  silencer:  '🤐 Silencer',
  fool:      '🃏 Fool',
};

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
    silencedNote,
    isDead,
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
      <MorningEventBanner />
      <Navbar roomId={room.id} nickname={nickname} connected={connected} onLeave={handleLeave} />

      {error && (
        <div className="lobby-error-banner">
          <span>{error}</span>
          <button onClick={clearError} className="lobby-error-close">Close</button>
        </div>
      )}

      {gameResult && (
        <div className="lobby-error-banner" style={{ background: 'var(--gold-glow-soft)', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
          <strong>{gameResult.message}</strong>

          {gameResult.reveal?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {gameResult.reveal.map((p) => (
                <span key={p.id} style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  border: '1px solid var(--color-border)',
                  background: p.role === 'werewolf' ? 'rgba(229,115,115,.18)' : 'rgba(255,255,255,.05)',
                  textDecoration: p.isAlive ? 'none' : 'line-through',
                  opacity: p.isAlive ? 1 : 0.6,
                }}>
                  {p.nickname} · {ROLE_LABEL[p.role] || p.role}
                </span>
              ))}
            </div>
          )}

          <button className="lobby-start-btn" onClick={handleLeave}>กลับหน้าแรก</button>
        </div>
      )}

      <main className="lobby-main" style={{ alignItems: 'stretch' }}>
        <aside className="lobby-aside" style={{ gap: '1rem' }}>
          {/* บทบาทของเจ้าเอง — ค่านี้มาถึงเฉพาะ socket ของเจ้าตัว คนอื่นไม่มีทางเห็น */}
          <MyRoleCard />

          {(silencedNote || isDead) && (
            <div className="game-status-row">
              {silencedNote && !isDead && (
                <div className="game-status is-silenced">
                  <span className="game-status-icon" aria-hidden="true">🤐</span>
                  <span>โดนใบ้! ผู้ปิดปากเล่นงานเจ้าเมื่อคืน — วันนี้เจ้าพิมพ์อะไรไม่ได้เลย จนกว่าจะขึ้นคืนใหม่</span>
                </div>
              )}
              {isDead && (
                <div className="game-status is-dead">
                  <span className="game-status-icon" aria-hidden="true">👻</span>
                  <span>เจ้าตายแล้ว — ดูเกมต่อได้ และคุยได้เฉพาะในห้องวิญญาณ</span>
                </div>
              )}
            </div>
          )}

          <section className="lobby-section">
            <h3 className="lobby-section-title">Players</h3>
            <div className="lobby-player-grid custom-scrollbar">
              {alivePlayers.map((player) => (
                <PlayerCard key={player.id} player={player} isMe={player.id === playerId} isHost={player.id === room.hostId} myRole={player.id === playerId ? myRole : null} showRole={false} />
              ))}
            </div>
          </section>

          <section className="lobby-section">
            <PhaseTimer phase={room.phase} phaseEndsAt={room.phaseEndsAt} phaseDurationMs={room.phaseDurationMs} round={room.round} />
            {(isNight || isVoting || isResults) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                {isHost && <button className="lobby-start-btn" onClick={advancePhase}>Skip phase</button>}
              </div>
            )}
          </section>
        </aside>

        <section className="lobby-chat-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* NightAction ตัดสินใจเองว่าจะแสดงตัวเลือกกลางคืน หรือผลตรวจของ Seer (ซึ่งมาถึงตอนกลางวัน) */}
          <NightAction />

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
