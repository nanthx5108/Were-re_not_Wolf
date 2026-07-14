import React, { useState } from 'react';
import { ROLE_INFO } from '../constants/game.js';

const SIDEBAR_LIMIT = 6;

function initialOf(nickname) {
  return (nickname || '?').trim().charAt(0).toUpperCase() || '?';
}

/**
 * จัดลำดับความสำคัญของผู้เล่น:
 *   1) คนที่โหวตแล้วในรอบนี้ (เรียงตามลำดับที่โหวต — voteMap เก็บ insertion order)
 *   2) คนที่กำลัง active (typing) — เว้นไว้ให้ Part 8 เชื่อม socket
 *   3) ที่เหลือ: คนเป็นก่อนคนตาย
 * คืน list เดียวกันเสมอ แต่ติด flag voted/typing ไว้ให้ UI
 */
function prioritize(players, voteMap, typingIds) {
  const voters = voteMap ? Object.keys(voteMap) : [];
  const voterRank = new Map(voters.map((id, i) => [id, i]));
  const typing = new Set(typingIds || []);

  const decorated = players.map((p) => ({
    ...p,
    voteRank: voterRank.has(p.id) ? voterRank.get(p.id) : null,
    isTyping: typing.has(p.id),
  }));

  return decorated.sort((a, b) => {
    if (a.isTyping !== b.isTyping) return a.isTyping ? -1 : 1;
    const av = a.voteRank !== null, bv = b.voteRank !== null;
    if (av && bv) return a.voteRank - b.voteRank;
    if (av !== bv) return av ? -1 : 1;
    if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
    return 0;
  });
}

// กล่องสถานะ role: การ์ดคว่ำ '?' หรือ role จริงถ้าคนตาย + host เปิด revealRoleOnDeath
// (server ส่ง player.revealedRole มาเมื่อ setting เปิด — ยังไม่มีจนกว่าจะทำ Part 7)
function RoleBox({ player }) {
  const revealed = !player.isAlive && player.revealedRole;
  if (revealed) {
    const info = ROLE_INFO[player.revealedRole];
    return (
      <div className="gps-role is-revealed" title={info?.label || player.revealedRole}>
        {info?.icon || '?'}
      </div>
    );
  }
  return <div className="gps-role is-facedown">?</div>;
}

function PlayerRow({ player, isMe, isHost }) {
  const votedTop3 = player.voteRank !== null && player.voteRank < 3;
  return (
    <div className={`gps-row${isMe ? ' is-me' : ''}${player.isTyping ? ' is-active' : ''}${player.isAlive ? '' : ' is-dead'}`}>
      <div className="gps-avatar">
        {initialOf(player.nickname)}
        {!player.isAlive && <span className="gps-avatar-cross" aria-hidden="true">✕</span>}
      </div>
      <div className="gps-meta">
        <span className="gps-name">
          {player.nickname}{isHost && <span className="gps-hostdot" title="host"> ★</span>}
        </span>
        {player.isTyping
          ? <span className="gps-tag is-typing">กำลังพิมพ์…</span>
          : votedTop3 && <span className="gps-tag">โหวตแล้ว</span>}
      </div>
      <RoleBox player={player} />
    </div>
  );
}

export default function PlayerSidebar({ players, playerId, hostId, voteMap, typingIds }) {
  const [showAll, setShowAll] = useState(false);

  const ordered   = prioritize(players, voteMap, typingIds);
  const highlight  = ordered.slice(0, SIDEBAR_LIMIT);
  const aliveCount = players.filter((p) => p.isAlive).length;

  return (
    <aside className="gp-side">
      <div className="gp-panel gps">
        <div className="gps-head">
          <h3>ผู้เล่น</h3>
          <span className="gps-count">{aliveCount}/{players.length} รอด</span>
        </div>

        <div className="gps-list custom-scrollbar">
          {highlight.map((p) => (
            <PlayerRow key={p.id} player={p} isMe={p.id === playerId} isHost={p.id === hostId} />
          ))}
        </div>

        <button className="gps-all-btn" onClick={() => setShowAll(true)}>
          ดูผู้เล่นทั้งหมด ({players.length})
        </button>
      </div>

      {showAll && (
        <div className="gp-modal-backdrop" onClick={() => setShowAll(false)}>
          <div className="gp-modal gp-panel gpm" onClick={(e) => e.stopPropagation()}>
            <div className="gp-modal-head">
              <h3>ผู้เล่นในห้อง</h3>
              <button className="gp-modal-close" onClick={() => setShowAll(false)} aria-label="ปิด">✕</button>
            </div>
            <div className="gpm-grid custom-scrollbar">
              {ordered.map((p) => (
                <PlayerRow key={p.id} player={p} isMe={p.id === playerId} isHost={p.id === hostId} />
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
