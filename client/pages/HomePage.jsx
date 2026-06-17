import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';

const API = '/api/rooms';

export default function HomePage() {
  const navigate = useNavigate();
  const { setIdentity, joinRoom } = useGame();

  const [mode,     setMode]     = useState(null); // 'create' | 'join'
  const [nickname, setNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!nickname.trim() || !roomName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ hostNickname: nickname.trim(), roomName: roomName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room.');

      setIdentity(data.playerId, nickname.trim());
      joinRoom(data.roomId, data.playerId, nickname.trim());
      navigate(`/lobby/${data.roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!nickname.trim() || !code) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/${code}/join`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nickname: nickname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room.');

      setIdentity(data.playerId, nickname.trim());
      joinRoom(data.roomId, data.playerId, nickname.trim());
      navigate(`/lobby/${data.roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <header style={s.hero}>
        <h1 style={s.title}>WE'RE not WOLF</h1>
        <p style={s.subtitle}>
          A dark little game in a southern Thailand island village.<br />
          Trust nobody. Die dramatically.
        </p>
      </header>

      {!mode && (
        <div style={s.card}>
          <div style={s.row}>
            <button onClick={() => setMode('create')} style={s.btnPrimary}>
              🏠 Create Room
            </button>
            <button onClick={() => setMode('join')} style={s.btnGhost}>
              🚢 Join Room
            </button>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} style={s.card}>
          <h2 style={s.cardTitle}>Start a New Game</h2>
          {error && <p style={s.error}>{error}</p>}
          <label style={s.label}>Your Nickname
            <input
              style={s.input} value={nickname} maxLength={32} autoFocus
              onChange={e => setNickname(e.target.value)} placeholder="e.g. Somchai"
            />
          </label>
          <label style={s.label}>Room Name
            <input
              style={s.input} value={roomName} maxLength={64}
              onChange={e => setRoomName(e.target.value)} placeholder="e.g. Ko Kut Killers"
            />
          </label>
          <div style={s.row}>
            <button type="submit" style={s.btnPrimary}
              disabled={loading || !nickname.trim() || !roomName.trim()}>
              {loading ? 'Creating…' : '🌙 Create Room'}
            </button>
            <button type="button" style={s.btnGhost} onClick={() => { setMode(null); setError(null); }}>
              Back
            </button>
          </div>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} style={s.card}>
          <h2 style={s.cardTitle}>Join a Game</h2>
          {error && <p style={s.error}>{error}</p>}
          <label style={s.label}>Your Nickname
            <input
              style={s.input} value={nickname} maxLength={32} autoFocus
              onChange={e => setNickname(e.target.value)} placeholder="e.g. Malee"
            />
          </label>
          <label style={s.label}>Room Code
            <input
              style={s.input} value={roomCode} maxLength={8}
              onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="e.g. ABC123"
            />
          </label>
          <div style={s.row}>
            <button type="submit" style={s.btnPrimary}
              disabled={loading || !nickname.trim() || !roomCode.trim()}>
              {loading ? 'Joining…' : '🛶 Join Room'}
            </button>
            <button type="button" style={s.btnGhost} onClick={() => { setMode(null); setError(null); }}>
              Back
            </button>
          </div>
        </form>
      )}

      <footer style={s.legend}>
        <span>🏘️ Villager</span>
        <span>🐺 Werewolf</span>
        <span>👁️ Seer</span>
        <span>🛡️ Bodyguard</span>
        <span>🃏 Fool</span>
      </footer>
    </div>
  );
}

const s = {
  page:      { minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px', gap:'24px' },
  hero:      { textAlign:'center' },
  title:     { fontFamily:'var(--font-display)', fontSize:'clamp(2.4rem,8vw,4.5rem)', color:'var(--color-accent)', textShadow:'0 0 30px rgba(232,160,39,.4)', marginBottom:'8px' },
  subtitle:  { color:'var(--color-text-muted)', fontSize:'15px', maxWidth:'380px', margin:'0 auto' },
  card:      { background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', padding:'28px', width:'100%', maxWidth:'400px', display:'flex', flexDirection:'column', gap:'16px', boxShadow:'var(--shadow-card)' },
  cardTitle: { fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'var(--color-accent)' },
  label:     { display:'flex', flexDirection:'column', gap:'6px', fontSize:'13px', fontWeight:700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.08em' },
  input:     { background:'var(--color-surface-2)', border:'2px solid var(--color-border)', borderRadius:'var(--radius-md)', color:'var(--color-text)', fontFamily:'var(--font-body)', fontSize:'15px', padding:'10px 14px', outline:'none', marginTop:'4px' },
  row:       { display:'flex', gap:'10px' },
  btnPrimary:{ flex:1, padding:'10px 20px', borderRadius:'var(--radius-md)', background:'var(--color-accent)', color:'#0d1117', border:'none', fontWeight:700, fontSize:'14px', cursor:'pointer' },
  btnGhost:  { padding:'10px 20px', borderRadius:'var(--radius-md)', background:'transparent', color:'var(--color-text)', border:'2px solid var(--color-border)', fontWeight:700, fontSize:'14px', cursor:'pointer' },
  error:     { color:'var(--color-danger)', fontSize:'13px', background:'rgba(192,57,43,.1)', padding:'8px 12px', borderRadius:'var(--radius-md)', border:'1px solid var(--color-danger)' },
  legend:    { display:'flex', gap:'16px', flexWrap:'wrap', justifyContent:'center', color:'var(--color-text-muted)', fontSize:'13px' },
};