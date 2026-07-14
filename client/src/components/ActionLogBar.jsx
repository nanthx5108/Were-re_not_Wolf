import React, { useState } from 'react';
import { useGame } from '../../context/Gamecontext.jsx';

// แถบ narrator เสียดสี — แสดงเหตุการณ์ล่าสุดบรรทัดเดียว กดเพื่อกางดูย้อนหลัง
// entry สังเคราะห์ฝั่ง client จาก socket event ที่มีอยู่ (night/vote/morning/silence)
export default function ActionLogBar() {
  const { actionLog } = useGame();
  const [open, setOpen] = useState(false);

  const log = actionLog || [];
  const latest = log[log.length - 1];

  function fmt(at) {
    return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className={`gp-panel gpl${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="gpl-current"
        onClick={() => log.length && setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="gpl-icon" aria-hidden="true">{latest?.icon || '📖'}</span>
        <span className={`gpl-text${latest ? '' : ' gpl-empty'}`}>
          {latest ? latest.text : 'เกาะยังเงียบ... ผู้บรรยายกำลังจิบชารอเรื่องเล่า'}
        </span>
        {log.length > 1 && <span className="gpl-caret" aria-hidden="true">▾</span>}
      </button>

      {open && log.length > 0 && (
        <div className="gp-panel gpl-history custom-scrollbar">
          {log.map((e) => (
            <div key={e.id} className="gpl-item">
              <span className="gpl-icon" aria-hidden="true">{e.icon}</span>
              <span className="gpl-item-text">{e.text}</span>
              <span className="gpl-item-time">{fmt(e.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
