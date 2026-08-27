import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import defaultAvatar from '../../assets/ui/default_avatar.png';
import '../../styles/HomePage.css';
import { expNeeded, levelProgress, STARTING_LEVEL } from '../../../../shared/leveling.js';

export default function UserPill({ user, onLogout, navigate }) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const pillRef = useRef(null);

  const level = user?.level ?? STARTING_LEVEL;
  const exp   = user?.exp ?? 0;
  const need  = user?.expNeeded ?? expNeeded(level);

  const [leveledUp, setLeveledUp] = useState(false);
  const prevLevel = useRef(level);

  useEffect(() => {
    if (level > prevLevel.current) {
      setLeveledUp(true);
      const t = setTimeout(() => setLeveledUp(false), 1200);
      return () => clearTimeout(t);
    }
    prevLevel.current = level;
  }, [level]);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (pillRef.current && !pillRef.current.contains(e.target)) setFlyoutOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  return (
    <div className="user-pill-wrap" ref={pillRef}>
      <button
        className="user-pill sketch-border-lite"
        onClick={() => setFlyoutOpen(o => !o)}
        aria-expanded={flyoutOpen}
        aria-haspopup="true"
      >
        <span className="user-pill-avatar">
          {user.avatarUrl
            ? <img
                src={user.avatarUrl}
                alt=""
                onError={e => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultAvatar;
                  e.currentTarget.classList.add('is-default');
                }}
              />
            : <img src={defaultAvatar} alt="" className="is-default" />}
        </span>

        <span className="user-pill-info">
          <span className="user-pill-name">{user.displayName || user.username}</span>
          <span className="user-pill-exp-row">
            <span className={`user-pill-level ${leveledUp ? 'is-levelup' : ''}`}>Lv.{level}</span>
            <span className="user-pill-exp-track player-exp">
              <span
                className={`player-exp-fill ${leveledUp ? 'is-levelup' : ''}`}
                style={{ width: `${levelProgress(level, exp) * 100}%` }}
              />
            </span>
            <span className="user-pill-exp-count">{exp}/{need}</span>
          </span>
        </span>
      </button>

      <AnimatePresence>
        {flyoutOpen && (
          <motion.div
            className="user-pill-flyout sketch-border"
            role="menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <button role="menuitem" onClick={() => { navigate('/profile'); setFlyoutOpen(false); }}>
              ดูโปรไฟล์
            </button>
            <button role="menuitem" onClick={() => { onLogout(); setFlyoutOpen(false); }}>
              ออกจากระบบ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}