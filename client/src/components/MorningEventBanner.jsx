import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/Gamecontext.jsx';
import '../styles/MorningEvent.css';

// Seer รู้แค่ฝ่าย ไม่ใช่บทบาท — Fool อยู่ฝ่ายเป็นกลาง จึงอ่านว่า "ไม่ใช่หมาป่า" เหมือนชาวบ้าน
const SEER_FACTION_TEXT = {
  werewolf: 'คือหมาป่า!',
  village:  'ไม่ใช่หมาป่า',
  neutral:  'ไม่ใช่หมาป่า',
};

export default function MorningEventBanner() {
  const { room, morningEvent, privateNote, seerResult, myRole } = useGame();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { setDismissed(false); }, [morningEvent]);

  if (!morningEvent || dismissed || room?.phase !== 'day') return null;

  const seerTarget = seerResult
    ? (room.players || []).find((p) => p.id === seerResult.targetId)
    : null;

  const seerText = seerResult && myRole === 'seer'
    ? (seerResult.faction === 'unclear'
        ? `นิมิตคืนนี้พร่ามัวไปหมด... มองไม่ออกว่า ${seerTarget?.nickname || 'เป้าหมาย'} อยู่ฝ่ายไหน`
        : `${seerTarget?.nickname || 'เป้าหมาย'} ${SEER_FACTION_TEXT[seerResult.faction] || 'ไม่ใช่หมาป่า'}`)
    : null;

  return (
    <div className="morning-event-overlay" role="dialog" aria-modal="true">
      <div className="morning-event-card">
        <span className="morning-event-peg morning-event-peg--tl" aria-hidden="true" />
        <span className="morning-event-peg morning-event-peg--tr" aria-hidden="true" />
        <span className="morning-event-peg morning-event-peg--bl" aria-hidden="true" />
        <span className="morning-event-peg morning-event-peg--br" aria-hidden="true" />

        <p className="morning-event-kicker">เหตุการณ์ประจำเช้า วันที่ {morningEvent.round}</p>
        <div className="morning-event-icon">{morningEvent.icon}</div>
        <h2 className="morning-event-title">{morningEvent.title}</h2>

        {/* ผลต่อเกมมาก่อนคำบรรยาย — คำบรรยายเล่าอ้อม ๆ ผู้เล่นใหม่อ่านแล้วเดาไม่ออกว่าจะเกิดอะไร */}
        {morningEvent.effect && (
          <div className="morning-event-effect">
            <p className="morning-event-effect-label">เหตุการณ์นี้ส่งผลอะไร</p>
            <p className="morning-event-effect-text">{morningEvent.effect}</p>
          </div>
        )}

        {morningEvent.announcement && (
          <p className="morning-event-announcement">{morningEvent.announcement}</p>
        )}

        <p className="morning-event-narrator">"{morningEvent.narrator}"</p>

        {(privateNote || seerText) && (
          <div className="morning-event-private">
            <p className="morning-event-private-label">ถึงคุณคนเดียวเท่านั้น</p>
            {seerText && <p>{seerText}</p>}
            {privateNote && <p>{privateNote}</p>}
          </div>
        )}

        <button className="morning-event-dismiss" onClick={() => setDismissed(true)}>
          รับทราบ... มั้ง
        </button>
      </div>
    </div>
  );
}
