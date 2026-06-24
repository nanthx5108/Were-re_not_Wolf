import React from 'react';
import '../styles/PlayerCard.css';

const ROLE_ICONS = {
  villager:  '🏘️',
  werewolf:  '🐺',
  seer:      '👁️',
  bodyguard: '🛡️',
  fool:      '🃏',
};

export default function PlayerCard({ player, isMe, isHost, myRole, showRole = false }) {
  return (
    <div className={`player-card ${player.isAlive ? 'alive' : 'dead'} ${isMe ? 'is-me' : ''}`}>
      <span className="player-avatar">{player.isAlive ? '🧍' : '💀'}</span>
      
      <div className="player-info">
        <span className="player-name">
          {player.nickname}
        </span>
        
        <div className="player-badges">
          {isMe   && <span className="badge badge-me">you</span>}
          {isHost && <span className="badge badge-host">host</span>}
        </div>
      </div>

      {showRole && myRole && (
        <span className="player-role" title={myRole}>
          {ROLE_ICONS[myRole] || '❓'}
        </span>
      )}
    </div>
  );
}