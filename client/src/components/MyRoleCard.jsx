import React, { useState } from 'react';
import { useGame } from '../../context/Gamecontext.jsx';
import { ROLE_INFO } from '../constants/game.js';
import '../styles/MyRoleCard.css';

// บทบาทของเจ้าเอง — server ส่ง myRole มาให้เฉพาะเจ้าของ socket เท่านั้น
// ไม่มีทางที่ผู้เล่นคนอื่นจะเห็นค่านี้ผ่าน state ของเรา
export default function MyRoleCard() {
  const { myRole, teammates } = useGame();
  // ซ่อนได้ เผื่อเล่นอยู่ในห้องเดียวกันแล้วมีคนชะโงกดูจอ
  const [hidden, setHidden] = useState(false);

  if (!myRole) return null;

  const info = ROLE_INFO[myRole] || {
    icon: '❓', label: myRole, faction: '', summary: '', detail: '',
  };

  return (
    <section className={`my-role-card is-${myRole}`}>
      <div className="my-role-head">
        <span className="my-role-kicker">บทบาทของเจ้า · เห็นคนเดียว</span>
        <button type="button" className="my-role-toggle" onClick={() => setHidden(h => !h)}>
          {hidden ? 'แสดง' : 'ซ่อน'}
        </button>
      </div>

      {hidden ? (
        <p className="my-role-hidden">ซ่อนไว้แล้ว — กด "แสดง" เมื่อไม่มีใครมองจอ</p>
      ) : (
        <>
          <div className="my-role-identity">
            <span className="my-role-icon" aria-hidden="true">{info.icon}</span>
            <div>
              <h3 className="my-role-name">{info.label}</h3>
              <span className="my-role-faction">{info.faction}</span>
            </div>
          </div>

          <p className="my-role-summary">{info.summary}</p>
          <p className="my-role-detail">{info.detail}</p>

          {myRole === 'werewolf' && (
            <div className="my-role-team">
              <span className="my-role-team-label">เพื่อนหมาป่าของเจ้า</span>
              <span className="my-role-team-names">
                {teammates?.length
                  ? teammates.map(t => t.nickname).join(' · ')
                  : 'ไม่มี — คืนนี้เจ้าล่าเพียงลำพัง'}
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
