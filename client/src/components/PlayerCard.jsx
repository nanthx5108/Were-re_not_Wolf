import React from 'react';
import '../styles/PlayerCard.css';

const ROLE_ICONS = {
  villager:  'Villager',
  werewolf:  'Werewolf',
  seer:      'Seer',
  bodyguard: 'Bodyguard',
  silencer:  'Silencer',
  fool:      'Fool',
};

export default function PlayerCard({ player, isMe, isHost, myRole, showRole = false }) {
  const offline = player.isConnected === false;

  return (
    <div
      className={`player-card ${player.isAlive ? 'alive' : 'dead'} ${isMe ? 'is-me' : ''}`}
      style={offline ? { opacity: 0.5 } : undefined}
    >
      <span className="player-avatar">{player.isAlive ? 'Alive' : 'Dead'}</span>

      <div className="player-info">
        <span className="player-name">
          {player.nickname}
        </span>

        <div className="player-badges">
          {isMe   && <span className="badge badge-me">you</span>}
          {isHost && <span className="badge badge-host">host</span>}
          {offline && <span className="badge" title="ขาดการเชื่อมต่อ">offline</span>}
        </div>
      </div>

      {showRole && myRole && (
        <span className="player-role" title={myRole}>
          {ROLE_ICONS[myRole] || '?'}
        </span>
      )}
    </div>
  );
}