import React from 'react';

export default function Navbar({ roomId, nickname, connected, onLeave }) {
  return (
    <nav style={s.nav}>
      <div style={s.left}>
        <span style={s.logo}>🐺 WE'RE not WOLF</span>
        {roomId && (
          <span style={s.code}>
            Room: <strong>{roomId}</strong>
          </span>
        )}
      </div>
      <div style={s.right}>
        <span style={{ ...s.dot, color: connected ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {connected ? '● online' : '○ reconnecting'}
        </span>
        {nickname && <span style={s.nickname}>{nickname}</span>}
        {onLeave && (
          <button onClick={onLeave} style={s.leaveBtn}>
            🚪 Leave
          </button>
        )}
      </div>
    </nav>
  );
}

const s = {
  nav:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--color-border)', gap:'12px', flexWrap:'wrap' },
  left:     { display:'flex', alignItems:'center', gap:'16px' },
  right:    { display:'flex', alignItems:'center', gap:'12px' },
  logo:     { fontFamily:'var(--font-display)', fontSize:'1.2rem', color:'var(--color-accent)' },
  code:     { fontFamily:'monospace', background:'var(--color-surface-2)', padding:'2px 8px', borderRadius:'var(--radius-sm)', border:'1px solid var(--color-border)', fontSize:'13px', color:'var(--color-text-muted)' },
  dot:      { fontSize:'12px' },
  nickname: { fontSize:'13px', color:'var(--color-text-muted)', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  leaveBtn: { background:'transparent', border:'2px solid var(--color-border)', borderRadius:'var(--radius-md)', color:'var(--color-text)', fontWeight:700, fontSize:'13px', padding:'6px 14px', cursor:'pointer' },
};