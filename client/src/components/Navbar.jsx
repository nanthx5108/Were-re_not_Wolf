import React from 'react';
import '../styles/Navbar.css';

export default function Navbar({ roomId, nickname, connected, onLeave }) {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="navbar-logo">WE'RE not WOLF</span>
        {roomId && (
          <span className="navbar-code">
            Room: <strong>{roomId}</strong>
          </span>
        )}
      </div>
      
      <div className="navbar-right">
        <span className={`navbar-status ${connected ? 'status-online' : 'status-offline'}`}>
          {connected ? 'online' : 'reconnecting'}
        </span>
        
        {nickname && <span className="navbar-nickname">{nickname}</span>}
        
        {onLeave && (
          <button onClick={onLeave} className="navbar-leave-btn">
            Leave
          </button>
        )}
      </div>
    </nav>
  );
}