import React, { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket/socket.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_OPTIONS = ['villager', 'werewolf', 'seer', 'bodyguard', 'silencer', 'fool'];

// แผงควบคุมแอดมินภายในหน้าเล่นเกม — เห็นเฉพาะบัญชีที่ user.isAdmin เท่านั้น
// สิทธิ์จริงถูกตรวจซ้ำฝั่ง server เสมอ (ฝั่ง client แค่ซ่อน UI ไม่ใช่ตัวป้องกันจริง)
export default function AdminGameBar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [adminRoom, setAdminRoom] = useState(null);

  const send = useCallback((type, payload = {}) => {
    socket.emit('admin:action', { type, payload });
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    const onState = (state) => setAdminRoom(state);
    socket.on('admin:room_state', onState);
    if (open) send('get_state');
    return () => socket.off('admin:room_state', onState);
  }, [user?.isAdmin, open, send]);

  if (!user?.isAdmin) return null;

  return (
    <div className="admin-bar">
      <button className="admin-bar-toggle" onClick={() => setOpen(o => !o)}>
        🛠️ แผงแอดมิน {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="admin-bar-panel">
          <div className="admin-bar-row admin-bar-globals">
            <button onClick={() => send('advance_phase')}>ข้ามเฟส ▶</button>
            <button onClick={() => send('add_time', { ms: 30000 })}>+30 วิ</button>
            <button onClick={() => send('add_time', { ms: 60000 })}>+60 วิ</button>
            <select
              onChange={(e) => { if (e.target.value) { send('end_game', { winner: e.target.value }); e.target.value = ''; } }}
              defaultValue=""
            >
              <option value="" disabled>จบเกม — ประกาศผู้ชนะ…</option>
              <option value="village">หมู่บ้านชนะ</option>
              <option value="werewolf">หมาป่าชนะ</option>
              <option value="draw">เสมอ</option>
            </select>
          </div>

          <div className="admin-bar-players">
            {(adminRoom?.players || []).map(p => (
              <div key={p.id} className="admin-bar-player">
                <span className="admin-bar-player-name">
                  {p.nickname} {!p.isAlive && '💀'} {p.isMutedByAdmin && '🤐'}
                </span>

                <select
                  value={p.role || ''}
                  onChange={(e) => send('set_role', { targetPlayerId: p.id, role: e.target.value })}
                >
                  <option value="" disabled>บทบาท…</option>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                {p.isAlive
                  ? <button onClick={() => send('kill', { targetPlayerId: p.id })}>ฆ่า</button>
                  : <button onClick={() => send('revive', { targetPlayerId: p.id })}>ชุบชีวิต</button>}

                {p.isMutedByAdmin
                  ? <button onClick={() => send('unmute', { targetPlayerId: p.id })}>เลิกปิดปาก</button>
                  : <button onClick={() => send('mute', { targetPlayerId: p.id })}>ปิดปาก</button>}

                <button onClick={() => send('kick', { targetPlayerId: p.id })}>เตะออก</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}