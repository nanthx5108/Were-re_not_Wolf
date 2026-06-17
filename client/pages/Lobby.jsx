import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';
import PlayerCard from '../src/components/PlayerCard.jsx';
import ChatBox    from '../src/components/ChatBox.jsx';
import Navbar     from '../src/components/Navbar.jsx';

const MIN_PLAYERS = 4;

export default function Lobby() {
  const { roomId }                              = useParams();
  const navigate                                = useNavigate();
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
      <div style={s.centered}>
        <p style={{ color:'var(--color-text-muted)' }}>
          {connected ? 'Loading room…' : 'Connecting to island…'}
        </p>
      </div>
    );
  }

  const isHost      = room.hostId === playerId;
  const playerCount = room.players?.length ?? 0;
  const canStart    = isHost && playerCount >= MIN_PLAYERS;

  return (
    <div style={s.page}>
      <Navbar roomId={room.id} nickname={nickname} connected={connected} onLeave={handleLeave} />

      {error && (
        <div style={s.errorBanner}>
          {error}
          <button onClick={clearError} style={s.errorClose}>✕</button>
        </div>
      )}

      <main style={s.main}>
        <aside style={s.aside}>
          <section style={s.section}>
            <h3 style={s.sectionTitle}>
              Islanders
              <span style={s.badge}>{playerCount}</span>
            </h3>
            <div style={s.playerGrid}>
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
            <section style={s.section}>
              <p style={s.hint}>
                {playerCount < MIN_PLAYERS
                  ? `Waiting for ${MIN_PLAYERS - playerCount} more player${MIN_PLAYERS - playerCount !== 1 ? 's' : ''}…`
                  : `${playerCount} islanders ready!`}
              </p>
              <button
                onClick={startGame}
                disabled={!canStart}
                style={{ ...s.startBtn, opacity: canStart ? 1 : 0.45, cursor: canStart ? 'pointer' : 'not-allowed' }}
              >
                🌙 Begin the Night
              </button>
            </section>
          )}
        </aside>

        <section style={s.chatSection}>
          <ChatBox />
        </section>
      </main>
    </div>
  );
}

const s = {
  page:        { maxWidth:'960px', margin:'0 auto', padding:'0 16px 24px', display:'flex', flexDirection:'column', gap:'16px', minHeight:'100dvh' },
  centered:    { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100dvh' },
  main:        { display:'grid', gridTemplateColumns:'260px 1fr', gap:'16px', alignItems:'start' },
  aside:       { display:'flex', flexDirection:'column', gap:'12px' },
  section:     { background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', padding:'16px', display:'flex', flexDirection:'column', gap:'10px' },
  sectionTitle:{ fontFamily:'var(--font-display)', fontSize:'1.1rem', color:'var(--color-accent)', display:'flex', alignItems:'center', gap:'8px' },
  badge:       { background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius:'999px', fontSize:'12px', fontWeight:700, padding:'1px 8px', color:'var(--color-text-muted)' },
  playerGrid:  { display:'flex', flexDirection:'column', gap:'6px' },
  hint:        { fontSize:'13px', color:'var(--color-text-muted)', textAlign:'center' },
  startBtn:    { padding:'12px', borderRadius:'var(--radius-md)', background:'var(--color-accent)', color:'#0d1117', border:'none', fontWeight:700, fontSize:'15px', width:'100%' },
  chatSection: { minHeight:'500px', display:'flex', flexDirection:'column' },
  errorBanner: { background:'rgba(192,57,43,.15)', border:'1px solid var(--color-danger)', borderRadius:'var(--radius-md)', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', color:'#e57373', fontSize:'14px' },
  errorClose:  { background:'none', border:'none', color:'inherit', cursor:'pointer', fontSize:'16px', padding:'0 4px' },
};