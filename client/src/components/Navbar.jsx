import React from 'react';
import '../styles/Navbar.css';
import { IconSettings } from './ui/Icons.jsx';

export default function Navbar({ roomId, nickname, connected, onLeave, onSettings }) {
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

        {onSettings && (
          <button onClick={onSettings} className="navbar-settings-btn" title="การตั้งค่าเสียง">
            <IconSettings />
            <span>Settings</span>
          </button>
        )}
        
        {onLeave && (
          <button onClick={onLeave} className="navbar-leave-btn">
            Leave
          </button>
        )}
      </div>
    </nav>
  );
}