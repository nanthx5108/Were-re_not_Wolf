import React, { useState } from 'react';
import { useGame } from '../../context/Gamecontext.jsx';
import { ROLE_INFO } from '../constants/game.js';

// บทบาทของเจ้าเอง — server ส่ง myRole มาให้เฉพาะเจ้าของ socket เท่านั้น
// การ์ดคว่ำเป็น default (กันคนชะโงกดูจอ) แตะเพื่อเปิด/ปิดดูได้ตลอดเกม
export default function MyRoleCard() {
  const { myRole, teammates } = useGame();
  const [open, setOpen] = useState(false);

  if (!myRole) return null;

  const info = ROLE_INFO[myRole] || {
    icon: '❓', label: myRole, faction: '', summary: '', detail: '',
  };

  function toggle() { setOpen((o) => !o); }

  return (
    <section className={`gpr gp-panel ${open ? 'is-open' : 'is-closed'}`}>
      <div
        className="gpr-inner"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        aria-pressed={open}
      >
        <span className="gpr-kicker">บทบาทของเจ้า · เห็นคนเดียว</span>

        {!open ? (
          <>
            <span className="gpr-qmark" aria-hidden="true">?</span>
            <span className="gpr-hint">แตะเพื่อเปิดดู</span>
          </>
        ) : (
          <>
            <div className="gpr-identity">
              <span className="gpr-icon" aria-hidden="true">{info.icon}</span>
              <div>
                <div className="gpr-name">{info.label}</div>
                <div className="gpr-faction">{info.faction}</div>
              </div>
            </div>
            {info.summary && <p className="gpr-summary">{info.summary}</p>}
            {info.detail  && <p className="gpr-detail">{info.detail}</p>}

            {myRole === 'werewolf' && (
              <p className="gpr-teammates">
                🐺 เพื่อนหมาป่า: {teammates?.length
                  ? teammates.map((t) => t.nickname).join(' · ')
                  : 'ไม่มี — คืนนี้เจ้าล่าเพียงลำพัง'}
              </p>
            )}
            <span className="gpr-toggle">แตะเพื่อคว่ำการ์ด</span>
          </>
        )}
      </div>
    </section>
  );
}
