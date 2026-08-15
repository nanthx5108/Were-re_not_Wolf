import React from 'react';
import { useGame } from '../context/Gamecontext.jsx';
import '../styles/FortuneInfoPanel.css';

function FortuneInfoPanel() {
  const { fortuneInfo } = useGame();

  if (!fortuneInfo || fortuneInfo.type !== 'broken_home') {
    return null;
  }

  const { title, data } = fortuneInfo;

  return (
    <div className="fi-panel gp-panel">
      <h3 className="fi-title">{title}</h3>
      <p className="fi-desc">คุณเห็นว่าผู้เล่นที่ถูกโหวตสูงสุดโหวตให้ใคร:</p>
      <ul className="fi-list">
        {data.map(vote => (
          <li key={vote.voterId} className="fi-item">
            <span className="fi-voter">{vote.voterNickname}</span>
            <span className="fi-arrow">→</span>
            <span className="fi-target">{vote.targetNickname}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FortuneInfoPanel;