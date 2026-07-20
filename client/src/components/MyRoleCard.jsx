import React, { useState } from 'react';
import { useGame } from '../../context/Gamecontext.jsx';
import { ROLE_INFO, CARD_BACK } from '../constants/game.js';

// บทบาทของเจ้าเอง — server ส่ง myRole มาให้เฉพาะเจ้าของ socket เท่านั้น
// การ์ดคว่ำเป็น default (กันคนชะโงกดูจอ) แตะเพื่อเปิด/ปิดดูได้ตลอดเกม
export default function MyRoleCard() {
  const { myRole, teammates } = useGame();
  const [open, setOpen] = useState(false);
  // ภาพการ์ดอาจยังไม่ถูกวางใน public/roles/ — ถ้าโหลดไม่ขึ้นให้ถอยไปใช้อีโมจิแทน
  const [artFailed, setArtFailed] = useState(false);
  const [backFailed, setBackFailed] = useState(false);

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
            {!backFailed ? (
              <img
                className="gpr-art gpr-art-back"
                src={CARD_BACK}
                alt=""
                aria-hidden="true"
                onError={() => setBackFailed(true)}
              />
            ) : (
              <span className="gpr-qmark" aria-hidden="true">?</span>
            )}
            <span className="gpr-hint">แตะเพื่อเปิดดู</span>
          </>
        ) : (
          <>
            {info.card && !artFailed ? (
              <img
                className="gpr-art"
                src={info.card}
                alt={`การ์ด${info.label}`}
                onError={() => setArtFailed(true)}
              />
            ) : null}

            <div className="gpr-identity">
              {(!info.card || artFailed) && (
                <span className="gpr-icon" aria-hidden="true">{info.icon}</span>
              )}
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
