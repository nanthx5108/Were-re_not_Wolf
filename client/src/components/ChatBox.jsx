import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/Gamecontext.jsx';

const CHANNEL_COLOR = {
  village:  'var(--text-primary)',
  werewolf: '#e57373',
  system:   'var(--gold-bright)',
  dead:     'var(--silver)',
};

const CHANNEL_TAG = {
  werewolf: '🐺 ',
  dead:     '👻 ',
};

export default function ChatBox({ showWerewolfChannel = false }) {
  const {
    room, messages, sendMessage, sendTyping, sendStopTyping, myRole, silencedNote,
    isDead, loadDeadHistory, censorNote, clearCensorNote,
  } = useGame();
  const [input,   setInput]   = useState('');
  const [channel, setChannel] = useState('village');
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // เพิ่งตาย — ย้ายเข้าห้องวิญญาณ แล้วดึงแชทที่คนตายก่อนหน้าคุยกันไว้มาอ่าน
  useEffect(() => {
    if (!isDead) return;
    setChannel('dead');
    loadDeadHistory();
  }, [isDead, loadDeadHistory]);

  // ข้อความเตือนเรื่องคำหยาบขึ้นสักพักแล้วหายเอง ไม่ต้องให้ผู้เล่นกดปิด
  useEffect(() => {
    if (!censorNote) return;
    const t = setTimeout(clearCensorNote, 4000);
    return () => clearTimeout(t);
  }, [censorNote, clearCensorNote]);

  // คนตายไม่โดนผลของ Silencer แล้ว — ปิดปากมีผลกับคนเป็นเท่านั้น
  const isSilenced  = Boolean(silencedNote) && !isDead;
  const canWerewolf = showWerewolfChannel && myRole === 'werewolf' && !isDead;

  // กลางคืน (รวมคืนที่ 0) หมู่บ้านหลับใหล — คนเป็นพิมพ์ไม่ได้ (ยังอ่านได้) คนตายคุยห้องวิญญาณต่อได้
  const isNightClosed = (room?.phase === 'night' || room?.phase === 'night_zero') && !isDead;
  const blocked = isSilenced || isNightClosed;

  // หยุดสถานะ "กำลังพิมพ์" ทันที (ส่งข้อความ / ล้างช่อง / ออกจากหน้า)
  function stopTyping() {
    if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; }
    if (isTypingRef.current) { isTypingRef.current = false; sendStopTyping(); }
  }

  // แจ้ง server ว่ากำลังพิมพ์ แล้วตั้ง auto-stop 2 วิ ถ้าหยุดพิมพ์ (debounce)
  // คนตายอยู่ห้องวิญญาณแยก ไม่ต้องประกาศ typing เข้า sidebar หมู่บ้าน
  function handleInputChange(e) {
    setInput(e.target.value);
    if (blocked || isDead) return;

    if (!e.target.value.trim()) { stopTyping(); return; }
    if (!isTypingRef.current) { isTypingRef.current = true; sendTyping(); }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  }

  // เลิก mount / โดนปิดแชท → เคลียร์สถานะพิมพ์ ไม่ให้ค้างใน sidebar คนอื่น
  useEffect(() => stopTyping, []);
  useEffect(() => { if (blocked) stopTyping(); }, [blocked]);

  function handleSend(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || blocked) return;
    sendMessage(trimmed, isDead ? 'dead' : channel);
    setInput('');
    stopTyping();
  }

  return (
    <div className="gpc gp-panel">
      <div className="gpc-head">
        <h3 className="gpc-title">{isDead ? 'ห้องวิญญาณ' : 'วงสนทนา'}</h3>
        {isDead
          ? <span className="gpc-headtag">👻 คุยได้เฉพาะกับคนตายด้วยกัน</span>
          : isNightClosed && <span className="gpc-headtag">🌙 หมู่บ้านหลับใหล</span>}
      </div>

      <div className="gpc-messages custom-scrollbar">
        {messages.length === 0 && (
          <p className="gpc-empty">หมู่บ้านยังเงียบอยู่…</p>
        )}
        {messages.map((msg) => {
          const isSystem = msg.channel === 'system';
          return (
            <div key={msg.id} className={`gpc-msg${msg.channel === 'dead' ? ' is-dead' : ''}${isSystem ? ' is-system' : ''}`}>
              {!isSystem && (
                <span className="gpc-sender" style={{ color: CHANNEL_COLOR[msg.channel] || 'var(--text-primary)' }}>
                  {CHANNEL_TAG[msg.channel] || ''}{msg.nickname}
                </span>
              )}
              <span className="gpc-body">{msg.content}</span>
              {!isSystem && (
                <span className="gpc-time">
                  {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isSilenced   && <p className="gpc-note is-silence">{silencedNote}</p>}
      {censorNote   && <p className="gpc-note is-censor">{censorNote}</p>}

      {isNightClosed ? (
        <p className="gpc-note is-night">🌙 กลางคืน — หมู่บ้านหลับใหล พูดคุยไม่ได้จนกว่าฟ้าจะสาง</p>
      ) : (
        <form onSubmit={handleSend} className="gpc-form">
          {canWerewolf && !blocked && (
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="gpc-select">
              <option value="village">หมู่บ้าน</option>
              <option value="werewolf">หมาป่า</option>
            </select>
          )}
          <input
            type="text" value={input} onChange={handleInputChange}
            disabled={blocked}
            placeholder={
              blocked ? 'วันนี้เจ้าพูดไม่ได้…'
                : isDead ? 'กระซิบกับวิญญาณตนอื่น…'
                : 'พิมพ์อะไรสักหน่อย…'
            }
            maxLength={300}
            className="gpc-input"
          />
          <button type="submit" disabled={!input.trim() || blocked} className="gpc-send">ส่ง</button>
        </form>
      )}
    </div>
  );
}
