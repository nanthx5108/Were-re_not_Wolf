import React, { useState, useEffect } from 'react';
import { PHASE_DURATIONS_SEC, PHASE_CONFIG } from '../constants/game.js';

export default function PhaseTimer({ phase, phaseEndsAt, phaseDurationMs, round }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!phaseEndsAt) { setRemaining(0); return; }

    const tick = () => {
      const r = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setRemaining(r);
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  const cfg = PHASE_CONFIG[phase] || PHASE_CONFIG.lobby;

  // ความยาว phase มาจาก server — host ตั้งเวลาเองได้ และเหตุการณ์ประจำเช้าปรับเวลาได้อีก
  // ค่า fallback ใช้เฉพาะตอนยังไม่ได้รับ event แรก
  const totalMs = phaseDurationMs || (PHASE_DURATIONS_SEC[phase] || 30) * 1000;
  const pct = phaseEndsAt
    ? Math.max(0, Math.min(1, (phaseEndsAt - Date.now()) / totalMs))
    : 0;

  const isUrgent = remaining <= 10 && remaining > 0;
  const barColor = isUrgent ? 'var(--color-danger)' : cfg.color;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <span style={{ ...s.phaseLabel, color: cfg.color }}>
          {cfg.label}
        </span>
        {round > 0 && (
          <span style={s.roundBadge}>Round {round}</span>
        )}
      </div>

      <div style={s.timerRow}>
        <span style={{ ...s.countdown, color: isUrgent ? 'var(--color-danger)' : 'var(--color-text)' }}>
          {remaining}s
        </span>
        <div style={s.barTrack}>
          <div style={{
            ...s.barFill,
            width:      `${pct * 100}%`,
            background: barColor,
            transition: 'width 0.5s linear, background 0.3s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

const s = {
  container: {
    background:    'var(--color-surface)',
    border:        '1px solid var(--color-border)',
    borderRadius:  'var(--radius-lg)',
    padding:       '14px 16px',
    display:       'flex',
    flexDirection: 'column',
    gap:           '10px',
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  phaseLabel: {
    fontFamily: 'var(--font-display)',
    fontSize:   '1.3rem',
    lineHeight:  1,
  },
  roundBadge: {
    fontSize:     '12px',
    color:        'var(--color-text-muted)',
    background:   'var(--color-surface-2)',
    border:       '1px solid var(--color-border)',
    borderRadius: '999px',
    padding:      '2px 10px',
    fontWeight:   700,
  },
  timerRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
  },
  countdown: {
    fontFamily: 'monospace',
    fontSize:   '1.5rem',
    fontWeight: 700,
    minWidth:   '44px',
    transition: 'color 0.3s',
  },
  barTrack: {
    flex:         1,
    height:       '8px',
    background:   'var(--color-surface-2)',
    borderRadius: '4px',
    overflow:     'hidden',
    border:       '1px solid var(--color-border)',
  },
  barFill: {
    height:       '100%',
    borderRadius: '4px',
  },
};