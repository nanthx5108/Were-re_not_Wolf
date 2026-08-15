import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CARD_BACK } from '../constants/game.js';
import { useGameData } from '../context/GameDataContext.jsx';
import { useGame } from '../context/Gamecontext.jsx';
import { useSound } from '../context/SoundContext.jsx';
import '../styles/MyRoleCard.css';

// บทบาทของเจ้าเอง — server ส่ง myRole มาให้เฉพาะเจ้าของ socket เท่านั้น
// การ์ดคว่ำเป็น default (กันคนชะโงกดูจอ) แตะเพื่อเปิด/ปิดดูได้ตลอดเกม
export default function MyRoleCard() {
  const { myRole, teammates } = useGame();
  const { roleMap } = useGameData();
  const sound = useSound();
  const [open, setOpen] = useState(false);
  // ภาพการ์ดอาจยังไม่ถูกวางใน public/roles/ — ถ้าโหลดไม่ขึ้นให้ถอยไปใช้อีโมจิแทน
  const [artFailed, setArtFailed] = useState(false);
  const [backFailed, setBackFailed] = useState(false);

  useEffect(() => {
    if (myRole && !open) { // Play sound only when card is initially revealed (myRole changes) and not yet opened
      sound.playSfx('/audio/sfx_card_draw.wav');
    }
  }, [myRole, sound, open]);

  const roleInfo = roleMap.get(myRole);

  // ถ้าไม่มี roleInfo (เช่น role ที่ไม่รู้จัก หรือยังไม่ได้รับจาก server)
  // หรือยังไม่ถึง night_zero ก็ไม่แสดงการ์ด
  if (!myRole) return null;

  function toggle() {
    setOpen((o) => !o);
    sound.playSfx('/audio/sfx_card_flip.wav');
  }

  return (
    <div
      className="gpr-container gp-panel"
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
      aria-pressed={open}
      aria-label={open ? `การ์ด ${roleInfo?.name_th}, แตะเพื่อคว่ำ` : 'การ์ดบทบาท, แตะเพื่อเปิดดู'}
    >
      <div className={`gpr-card ${open ? 'is-flipped' : ''}`}>
        {/* Back Face */}
        <div className="gpr-face gpr-face-back">
          {!backFailed ? (
            <img
              className="gpr-art gpr-art-back"
              src={CARD_BACK}
              alt="หลังการ์ด"
              aria-hidden="true"
              onError={() => setBackFailed(true)}
            />
          ) : (
            <div className="gpr-qmark" aria-hidden="true">?</div>
          )}
          <div className="gpr-kicker">บทบาทของเจ้า</div>
          <div className="gpr-hint">แตะเพื่อเปิดดู</div>
        </div>

        {/* Front Face */}
        <div className="gpr-face gpr-face-front">
          {roleInfo?.card_image && !artFailed ? (
            <img
              className="gpr-art"
              src={roleInfo.card_image}
              alt={`การ์ด${roleInfo.name_th}`}
              onError={() => setArtFailed(true)}
            />
          ) : null}
          <div className="gpr-content">
              <div className="gpr-identity">
                {(!roleInfo?.card_image || artFailed) && (
                  <span className="gpr-icon" aria-hidden="true">{roleInfo?.icon || '❓'}</span>
                )}
                <div>
                  <div className="gpr-name">{roleInfo?.name_th || myRole}</div>
                  <div className="gpr-faction">{roleInfo?.faction_th || ''}</div>
                </div>
              </div>
              {roleInfo?.description_th && <p className="gpr-summary">{roleInfo.description_th.split('.')[0] + '.'}</p>}
              {roleInfo?.description_th && <p className="gpr-detail">{roleInfo.description_th}</p>}

              {myRole === 'werewolf' && (
                <p className="gpr-teammates">
                  🐺 เพื่อนหมาป่า: {teammates?.length
                    ? teammates.map((t) => t.nickname).join(' · ')
                    : 'ไม่มี — คืนนี้เจ้าล่าเพียงลำพัง'}
                </p>
              )}
          </div>
          <div className="gpr-toggle">แตะเพื่อคว่ำการ์ด</div>
        </div>
      </div>
    </div>
  );
}
