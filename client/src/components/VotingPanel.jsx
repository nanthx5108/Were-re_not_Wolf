import React, { useState, useEffect } from 'react';
import { useSound } from '../context/SoundContext.jsx';
import '../styles/VotingPanel.css';

export default function VotingPanel({ players = [], playerId, votes, onVote, myFortuneCard, realtimeVoteCounts, phaseEndsAt, className = '' }) {
  const alivePlayers = players.filter(p => p.isAlive);
  const targets      = alivePlayers.filter(p => p.id !== playerId);
  const totalAlive   = alivePlayers.length;
  const voteMap      = votes?.voteMap || {};
  const sound = useSound();

  const [remaining, setRemaining] = useState(0);
  const [hasChangedVote, setHasChangedVote] = useState(false);

  useEffect(() => {
    if (!phaseEndsAt) { setRemaining(0); return; }
    const tick = () => setRemaining(Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  const isMagicEyesActive = myFortuneCard?.id === 'magic_eyes' && realtimeVoteCounts;
  const counts = isMagicEyesActive ? realtimeVoteCounts : (votes?.counts || {});

  const votedCount   = Object.keys(voteMap).length;
  const myVote       = voteMap[playerId];

  const alreadyVoted = !!myVote;

  const isOpportunistEffect = myFortuneCard?.clientEffect?.type === 'LAST_MINUTE_VOTE_CHANGE';
  const canChangeVote = isOpportunistEffect && alreadyVoted && remaining <= 5 && remaining > 0 && !hasChangedVote;

  function handleVote(targetId) {
    if (canChangeVote) setHasChangedVote(true);
    sound.playSfx('/assets/audio/SFX-Vote.mp3');
    onVote(targetId);
  }

  return (
    <div className={`voting-panel ${className}`}>
      <div className="vp-header">
        <span className="vp-icon">Vote</span>
        <div>
          <p className="vp-title">โหวตคนที่สงสัย</p>
          <p className="vp-sub">ใครคือหมาป่าที่ซ่อนอยู่?</p>
        </div>
      </div>

      <div className="vp-progress-row">
        <span className="vp-progress-label">{votedCount} / {totalAlive} โหวตแล้ว</span>
        <div className="vp-progress-track">
          <div className="vp-progress-fill" style={{ width: totalAlive > 0 ? `${(votedCount / totalAlive) * 100}%` : '0%' }} />
        </div>
      </div>

      {alreadyVoted && (
        <div className={`vp-my-vote-box ${canChangeVote ? 'can-change' : ''}`}>
          คุณโหวต:{' '}
          <strong>
            {players.find(p => p.id === myVote)?.nickname ?? '?'}
          </strong>
          {canChangeVote && (
            <span className="vp-change-vote-hint">เปลี่ยนโหวตได้ใน {remaining} วิ!</span>
          )}
        </div>
      )}
      <div className="vp-list">
        {targets.map(p => {
          const voteCount  = counts[p.id] || 0;
          const hasVoted   = voteMap[p.id] !== undefined;
          const isMyTarget = myVote === p.id;

          return (
            <div key={p.id} className={`vp-row ${isMyTarget ? 'is-my-target' : ''}`}>
              <div className="vp-player-info">
                <span className="vp-avatar">Player</span>
                <span className="vp-name">{p.nickname}</span>
                {hasVoted && <span className="vp-voted-badge">โหวตแล้ว</span>}
              </div>

              <div className="vp-right">
                {voteCount > 0 && (
                  <span className={`vp-vote-count ${isMagicEyesActive ? 'is-realtime' : ''}`}>
                    {voteCount} vote{voteCount > 1 ? 's' : ''}
                  </span>
                )}
                <button
                  onClick={() => handleVote(p.id)}
                  disabled={alreadyVoted && !canChangeVote}
                  className={`vp-vote-btn ${isMyTarget ? 'is-selected' : ''}`}
                >
                  {isMyTarget ? 'เลือกแล้ว' : 'โหวต'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!alreadyVoted && (
        <p className="vp-hint">
          {isOpportunistEffect ? 'โหวตได้ครั้งเดียว (แต่เปลี่ยนใจได้ใน 5 วิสุดท้าย)' : 'โหวตได้ครั้งเดียว เปลี่ยนใจไม่ได้'}
        </p>
      )}
    </div>
  );
}