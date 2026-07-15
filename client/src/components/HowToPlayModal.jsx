import React, { useState, useEffect } from 'react';
import { ROLE_INFO, MORNING_EVENT_INFO, morningEventChance } from '../constants/game.js';
import '../styles/HowToPlay.css';

// สามหัวข้อตามที่ผู้เล่นมักถาม: เล่นยังไงให้ชนะ · บทบาทมีอะไรบ้าง · เช้าจะเจออะไร
const TABS = [
  { key: 'win',    label: 'เล่นยังไงให้ชนะ', icon: '🏆' },
  { key: 'roles',  label: 'ข้อมูลบทบาททั้งหมด', icon: '🎭' },
  { key: 'events', label: 'การสุ่มเหตุการณ์', icon: '🎲' },
];

// ลำดับบทบาทตามความสำคัญที่ผู้เล่นควรอ่าน ไม่ใช่ตามตัวอักษร
const ROLE_ORDER = ['werewolf', 'villager', 'seer', 'bodyguard', 'silencer', 'fool'];

const PHASES_FLOW = [
  { icon: '🌙', name: 'กลางคืน', text: 'หมู่บ้านหลับ — หมาป่าเลือกเหยื่อร่วมกัน ผู้หยั่งรู้ตรวจ 1 คน ผู้พิทักษ์เฝ้า 1 คน ผู้ปิดปากเลือกเหยื่อที่จะพูดไม่ได้พรุ่งนี้' },
  { icon: '🌅', name: 'เช้า',     text: 'ประกาศว่าใครตาย แล้วสุ่มเหตุการณ์ประจำเช้า 1 อย่าง (หรือไม่เกิดอะไรเลยก็ได้)' },
  { icon: '💬', name: 'พูดคุย',   text: 'ทุกคนที่ยังไม่ตายคุยกัน กล่าวหา แก้ต่าง โกหก — เวลาอาจสั้นหรือยาวขึ้นตามเหตุการณ์เช้านี้' },
  { icon: '🗳️', name: 'โหวต',     text: 'โหวตขับ 1 คนออกจากเกาะ คะแนนเสมอ = ไม่มีใครถูกขับ แล้ววนกลับไปกลางคืน' },
];

const WIN_CONDITIONS = [
  { side: 'ฝ่ายหมู่บ้าน', color: 'village', text: 'ชนะเมื่อกำจัดหมาป่าได้หมดทุกตัว' },
  { side: 'ฝ่ายหมาป่า',  color: 'wolf',    text: 'ชนะเมื่อจำนวนชาวบ้านที่เหลือ น้อยกว่าหรือเท่ากับจำนวนหมาป่า' },
  { side: 'คนโง่ (เป็นกลาง)', color: 'fool', text: 'ชนะทันทีถ้าถูกชาวบ้านโหวตขับออก — แต่ถ้าถูกหมาป่าฆ่ากลางคืน ถือว่าแพ้' },
];

const TIPS = [
  'ตายแล้วยังดูเกมต่อได้ และคุยกับคนตายด้วยกันได้ในห้องวิญญาณ — แต่ห้ามใบ้คนเป็นเด็ดขาด (คนเป็นไม่เห็นแชทนั้นอยู่แล้ว)',
  'ผู้หยั่งรู้ที่เปิดตัวเร็วเกินไปมักตายคืนนั้นเลย — จะเปิดตอนไหนคือเกมที่แท้จริงของบทบาทนี้',
  'หมาป่าที่เงียบเกินไปน่าสงสัยพอ ๆ กับหมาป่าที่พูดมากเกินไป',
  'ถ้าเจ้าถูกปิดปาก จะมีสถานะขึ้นบนหน้าจอและพิมพ์อะไรไม่ได้เลยทั้งวัน — ใช้เวลานั้นอ่านคนอื่นแทน',
];

export default function HowToPlayModal({ onClose }) {
  const [tab, setTab] = useState('win');

  // ปิดด้วย Esc — ผู้เล่นที่เปิดมาอ่านเฉย ๆ ไม่ควรต้องหาปุ่มปิด
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="htp-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="วิธีการเล่น">
      <div className="htp-card" onClick={(e) => e.stopPropagation()}>
        <span className="panel-corner panel-corner-tl" aria-hidden="true" />
        <span className="panel-corner panel-corner-br" aria-hidden="true" />

        <header className="htp-head">
          <div>
            <div className="htp-eyebrow">คู่มือผู้มาเยือน</div>
            <h2 className="htp-title">วิธีการเล่น</h2>
          </div>
          <button className="htp-close" onClick={onClose} aria-label="ปิด">✕</button>
        </header>

        <nav className="htp-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`htp-tab ${tab === t.key ? 'is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>

        <div className="htp-body custom-scrollbar">
          {tab === 'win'    && <WinSection />}
          {tab === 'roles'  && <RolesSection />}
          {tab === 'events' && <EventsSection />}
        </div>
      </div>
    </div>
  );
}

function WinSection() {
  return (
    <>
      <p className="htp-lead">
        ชาวบ้านกลุ่มหนึ่งอาศัยอยู่บนเกาะ — และมีหมาป่าปะปนอยู่ในนั้น
        กลางคืนหมาป่าฆ่าทีละคน กลางวันทุกคนช่วยกันหาว่าใครคือหมาป่าแล้วโหวตขับออก
        ไม่มีใครรู้บทบาทของคนอื่น รู้แค่ของตัวเอง
      </p>

      <h3 className="htp-h3">หนึ่งวันในเกมมี 4 ช่วง</h3>
      <ol className="htp-flow">
        {PHASES_FLOW.map(p => (
          <li key={p.name} className="htp-flow-item">
            <span className="htp-flow-icon" aria-hidden="true">{p.icon}</span>
            <div>
              <strong className="htp-flow-name">{p.name}</strong>
              <p className="htp-flow-text">{p.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <h3 className="htp-h3">ชนะได้ยังไง</h3>
      <div className="htp-win-list">
        {WIN_CONDITIONS.map(w => (
          <div key={w.side} className={`htp-win is-${w.color}`}>
            <strong>{w.side}</strong>
            <span>{w.text}</span>
          </div>
        ))}
      </div>

      <h3 className="htp-h3">เคล็ดลับที่ผู้เล่นใหม่มักพลาด</h3>
      <ul className="htp-tips">
        {TIPS.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </>
  );
}

function RolesSection() {
  return (
    <>
      <p className="htp-lead">
        บทบาทถูกสุ่มแจกตอนเริ่มเกม เจ้าจะเห็นเฉพาะบทบาทของตัวเองเท่านั้น
        (เจ้าของห้องเป็นคนตั้งว่าเกมนี้จะมีบทบาทไหนบ้างและกี่คน)
      </p>

      <div className="htp-roles">
        {ROLE_ORDER.map(key => {
          const r = ROLE_INFO[key];
          if (!r) return null;
          return (
            <article key={key} className={`htp-role is-${key}`}>
              <div className="htp-role-head">
                <span className="htp-role-icon" aria-hidden="true">{r.icon}</span>
                <div>
                  <h4 className="htp-role-name">{r.label}</h4>
                  <span className="htp-role-faction">{r.faction}</span>
                </div>
              </div>
              <p className="htp-role-summary">{r.summary}</p>
              <p className="htp-role-detail">{r.detail}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}

function EventsSection() {
  return (
    <>
      <p className="htp-lead">
        ทุกเช้าหลังจบกลางคืน เกาะจะสุ่มเหตุการณ์ขึ้นมา 1 อย่างและประกาศให้ทุกคนรู้พร้อมกัน
        บางเหตุการณ์เปลี่ยนกติกาของคืนถัดไป บางอย่างเปลี่ยนเวลาพูดคุย
        และบางเช้าก็ไม่เกิดอะไรขึ้นเลย
      </p>
      <p className="htp-note">
        ตัวเลขโอกาสด้านล่างเป็นค่าประมาณของเช้าปกติ — ของจริงขยับได้ตามสถานการณ์
        (เหตุการณ์ที่เพิ่งออกจะติดคูลดาวน์ และบางอย่างมีโอกาสสูงขึ้นตามสิ่งที่เกิดเมื่อคืน)
      </p>

      <div className="htp-events">
        {MORNING_EVENT_INFO.map(ev => {
          const chance = morningEventChance(ev);
          return (
            <article key={ev.title} className={`htp-event ${ev.conditional ? 'is-conditional' : ''}`}>
              <div className="htp-event-head">
                <span className="htp-event-icon" aria-hidden="true">{ev.icon}</span>
                <h4 className="htp-event-name">{ev.title}</h4>
                <span className="htp-event-chance">
                  {chance !== null ? `~${chance}%` : 'มีเงื่อนไข'}
                </span>
              </div>
              {chance !== null && (
                <div className="htp-event-bar" aria-hidden="true">
                  {/* แถบยาวตามโอกาส — เทียบกันด้วยตาได้เร็วกว่าอ่านตัวเลข */}
                  <span style={{ width: `${Math.min(100, chance * 4)}%` }} />
                </div>
              )}
              <p className="htp-event-effect">{ev.effect}</p>
              {ev.note && <p className="htp-event-note">{ev.note}</p>}
            </article>
          );
        })}
      </div>
    </>
  );
}
