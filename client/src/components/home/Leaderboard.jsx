import React from 'react';
import { IconTrophy } from '../ui/Icons.jsx';
import defaultAvatar from '../../assets/ui/default_avatar.png';
import '../../styles/HomePage.css';
import { levelProgress } from '../../../../shared/leveling.js';

const RANK_CLASS = ['is-gold', 'is-silver', 'is-bronze'];

export default function Leaderboard({ players, loading }) {
  return (
    <div className="panel-box leaderboard-box sketch-border">
      <div className="home-news-head">
        <div>
          <h2 className="home-news-heading">กระดานคะแนนการเล่น</h2>
        </div>
        <span className="leaderboard-trophy"><IconTrophy /></span>
      </div>

      {loading ? (
        <div className="leaderboard-empty">กำลังโหลดคะแนน…</div>
      ) : players.length === 0 ? (
        <div className="leaderboard-empty">ยังไม่มีคะแนน — เล่นเกมแรกเพื่อขึ้นกระดาน</div>
      ) : (
        <div className="leaderboard-list">
          {players.map((p, i) => (
            <div key={`${p.name}-${i}`} className={`leaderboard-row cv-auto sketch-border-lite ${RANK_CLASS[i] || ''}`} style={{ '--lb-i': i }}>
              <span className="leaderboard-rank">{i + 1}</span>
              <span className="leaderboard-ava">
                {p.avatarUrl
                  ? <img src={p.avatarUrl} alt="" />
                  : <img src={defaultAvatar} alt="" className="is-default" />}
              </span>
              <span className="leaderboard-name">{p.name}</span>
              <span className="leaderboard-meta">{p.gamesPlayed ?? 0} เกม</span>
              <span className="leaderboard-level">Lv.{p.level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}