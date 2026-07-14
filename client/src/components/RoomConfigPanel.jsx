import React from 'react';
import { CONFIGURABLE_ROLES, DURATION_LIMITS, validateRoleConfig } from '../constants/game.js';
import '../styles/RoomConfig.css';

/**
 * แผงตั้งค่าห้อง — บทบาทและเวลาแต่ละช่วง
 * host แก้ได้ (editable) คนอื่นเห็นอย่างเดียว
 * ไม่มี state ของตัวเอง: ค่าที่แสดงมาจาก room ที่ server ส่งมา เปลี่ยนแล้วยิงกลับไปที่ server เลย
 * จึงไม่มีทางที่หน้าจอ host กับผู้เล่นคนอื่นจะไม่ตรงกัน
 */
export default function RoomConfigPanel({
  roleConfig, phaseDurations, revealRoleOnDeath = false, maxPlayers, playerCount, editable, onChange,
}) {
  if (!roleConfig || !phaseDurations) return null;

  // ทุก onChange ต้องแนบ config ครบทุก field ไม่งั้นค่าที่ไม่ได้แตะจะถูก server เซ็ตกลับเป็น default
  function emit(patch) {
    onChange({ roleConfig, phaseDurations, revealRoleOnDeath, ...patch });
  }

  const specialTotal = CONFIGURABLE_ROLES.reduce((sum, r) => sum + (roleConfig[r.key] || 0), 0);
  const villagerSeats = Math.max(0, maxPlayers - specialTotal);
  const configError = validateRoleConfig(roleConfig, maxPlayers);

  // config ตั้งตามขนาดห้อง แต่คนเข้าจริงอาจน้อยกว่า — server จะบล็อกตอนกดเริ่ม
  const notEnoughPlayers = specialTotal > playerCount;

  function adjustRole(key, delta) {
    const next = Math.max(0, Math.min(maxPlayers, (roleConfig[key] || 0) + delta));
    emit({ roleConfig: { ...roleConfig, [key]: next } });
  }

  function setDuration(phase, value) {
    emit({ phaseDurations: { ...phaseDurations, [phase]: value } });
  }

  return (
    <div className="roomcfg">
      <div className="roomcfg-section">
        <div className="roomcfg-head">
          <span className="roomcfg-title">บทบาท</span>
          <span className={`roomcfg-tally ${configError ? 'is-bad' : ''}`}>
            พิเศษ {specialTotal} · ชาวบ้าน {villagerSeats} / {maxPlayers}
          </span>
        </div>

        {CONFIGURABLE_ROLES.map(role => {
          const count = roleConfig[role.key] || 0;
          if (!editable && count === 0) return null;

          return (
            <div key={role.key} className="roomcfg-role">
              <span className="roomcfg-role-icon" aria-hidden="true">{role.icon}</span>
              <span className="roomcfg-role-meta">
                <span className="roomcfg-role-name">{role.label}</span>
                <span className="roomcfg-role-hint">{role.hint}</span>
              </span>

              {editable ? (
                <span className="roomcfg-stepper">
                  <button type="button" onClick={() => adjustRole(role.key, -1)}
                    disabled={count <= 0} aria-label={`ลด ${role.label}`}>−</button>
                  <span className="roomcfg-count">{count}</span>
                  <button type="button" onClick={() => adjustRole(role.key, 1)}
                    disabled={specialTotal >= maxPlayers} aria-label={`เพิ่ม ${role.label}`}>+</button>
                </span>
              ) : (
                <span className="roomcfg-count">×{count}</span>
              )}
            </div>
          );
        })}

        <p className="roomcfg-filler">
          ที่นั่งที่เหลือจะเป็น Villager อัตโนมัติ ({villagerSeats} คน)
        </p>

        {configError && <p className="roomcfg-warning">{configError}</p>}
        {!configError && notEnoughPlayers && (
          <p className="roomcfg-warning">
            ตั้งบทบาทพิเศษไว้ {specialTotal} คน แต่ตอนนี้มีผู้เล่นแค่ {playerCount} คน
            เริ่มเกมไม่ได้จนกว่าจะมีคนเพิ่มหรือลดบทบาทลง
          </p>
        )}
      </div>

      <div className="roomcfg-section">
        <div className="roomcfg-head">
          <span className="roomcfg-title">เวลาแต่ละช่วง (วินาที)</span>
        </div>

        <div className="roomcfg-durations">
          {Object.entries(DURATION_LIMITS).map(([phase, limit]) => (
            <div key={phase} className="roomcfg-duration">
              <label htmlFor={`dur-${phase}`} className="roomcfg-duration-label">
                {limit.label}
              </label>
              {editable ? (
                <>
                  <input id={`dur-${phase}`} type="number" className="roomcfg-duration-input"
                    min={limit.min} max={limit.max} value={phaseDurations[phase]}
                    onChange={e => setDuration(phase, Number(e.target.value))} />
                  <span className="roomcfg-duration-range">{limit.min}–{limit.max}</span>
                </>
              ) : (
                <span className="roomcfg-duration-value">{phaseDurations[phase]} วิ</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="roomcfg-section">
        <div className="roomcfg-toggle">
          <span className="roomcfg-role-meta">
            <span className="roomcfg-role-name">เปิดเผยบทบาทเมื่อผู้เล่นตาย</span>
            <span className="roomcfg-role-hint">ตายแล้วจะเห็นบทบาทจริงในรายชื่อ — ปิดไว้เพื่อเพิ่มความลับ</span>
          </span>
          {editable ? (
            <button
              type="button"
              className={`roomcfg-switch ${revealRoleOnDeath ? 'is-on' : ''}`}
              role="switch"
              aria-checked={revealRoleOnDeath}
              onClick={() => emit({ revealRoleOnDeath: !revealRoleOnDeath })}
            >
              <span className="roomcfg-switch-knob" />
            </button>
          ) : (
            <span className="roomcfg-count">{revealRoleOnDeath ? 'เปิด' : 'ปิด'}</span>
          )}
        </div>
      </div>
    </div>
  );
}
