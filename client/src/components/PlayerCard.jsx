import React from 'react';

const ROLE_ICONS = {
  villager:  '🏘️',
  werewolf:  '🐺',
  seer:      '👁️',
  bodyguard: '🛡️',
  fool:      '🃏',
};

export default function PlayerCard({ player, isMe, isHost, myRole, showRole = false }) {
  return (
    <div style={{ ...s.card, opacity: player.isAlive ? 1 : 0.4 }}>
      <span style={s.avatar}>{player.isAlive ? '🧍' : '💀'}</span>
      <div style={s.info}>
        <span style={{ ...s.name, color: isMe ? 'var(--color-accent)' : 'inherit' }}>
          {player.nickname}
        </span>
        <div style={s.badges}>
          {isMe   && <span style={s.badgeMe}>you</span>}
          {isHost && <span style={s.badgeHost}>host</span>}
        </div>
      </div>
      {showRole && myRole && (
        <span style={s.role} title={myRole}>
          {ROLE_ICONS[myRole] || '❓'}
        </span>
      )}
    </div>
  );
}

const s = {
  card:      { display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', background:'var(--color-surface-2)', borderRadius:'var(--radius-md)', fontSize:'14px' },
  avatar:    { fontSize:'18px', lineHeight:1, flexShrink:0 },
  info:      { flex:1, display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' },
  name:      { fontWeight:600 },
  badges:    { display:'flex', gap:'4px' },
  badgeMe:   { background:'var(--color-village)', color:'#a8d8c8', borderRadius:'999px', fontSize:'10px', fontWeight:700, padding:'1px 6px', textTransform:'uppercase' },
  badgeHost: { background:'var(--color-accent-dim)', color:'var(--color-accent)', borderRadius:'999px', fontSize:'10px', fontWeight:700, padding:'1px 6px', textTransform:'uppercase' },
  role:      { fontSize:'18px', flexShrink:0 },
};