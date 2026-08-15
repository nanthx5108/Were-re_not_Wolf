import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/Gamecontext.jsx';
import ChatMessage from './ChatMessage.jsx';

// showHead = false ใช้ตอนที่กล่องแม่มีหัวข้ออยู่แล้ว (เช่นแท็บ "ช่องแชท" ในหน้า Lobby)
export default function ChatBox({ showWerewolfChannel = false, showHead = true, clientEffect }) {
  const {
    room, messages, sendMessage, sendTyping, sendStopTyping, myRole, silencedNote, nickname, players, playerId,
    isDead, loadDeadHistory, censorNote, clearCensorNote,
  } = useGame();
  const [input,   setInput]   = useState('');
  const [channel, setChannel] = useState('village');
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  const alivePlayers = players.filter(p => p.isAlive && p.id !== playerId);

  // --- Fortune Card Effects States ---
  const [isNoCooldownActive, setIsNoCooldownActive] = useState(false);
  const [highlightNext,      setHighlightNext]      = useState(false);
  const [isChatCooldown,     setChatCooldown]       = useState(false);
  const [whisperTargetId,    setWhisperTargetId]    = useState('');
  const [whisperUsedThisRound, setWhisperUsedThisRound] = useState(false);

  // Effect: CHAT_NO_COOLDOWN ('talkative' card)
  useEffect(() => {
    if (clientEffect?.type === 'CHAT_NO_COOLDOWN') {
      setIsNoCooldownActive(true);
      const timer = setTimeout(() => setIsNoCooldownActive(false), clientEffect.duration || 30000);
      return () => clearTimeout(timer);
    }
    setIsNoCooldownActive(false);
  }, [clientEffect]);

  // Effect: HIGHLIGHT_NEXT_MESSAGE ('heavenly_voice' card)
  useEffect(() => {
    if (clientEffect?.type === 'HIGHLIGHT_NEXT_MESSAGE') {
      setHighlightNext(true);
    }
  }, [clientEffect]);

  // Effect: ALLOW_WHISPER ('whisper' card)
  useEffect(() => {
    // Reset whisper state when card changes (new round)
    if (clientEffect?.type !== 'ALLOW_WHISPER') {
      setWhisperTargetId('');
      setWhisperUsedThisRound(false);
    }
  }, [clientEffect]);

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
  const isWhisperActive = clientEffect?.type === 'ALLOW_WHISPER' && !whisperUsedThisRound;

  // Blocked if silenced, night, or chat cooldown (unless no cooldown card is active)
  const blocked = isSilenced || isNightClosed || (isChatCooldown && !isNoCooldownActive);

  // หยุดสถานะ "กำลังพิมพ์" ทันที (ส่งข้อความ / ล้างช่อง / ออกจากหน้า)
  function stopTyping() {
    if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; }
    if (isTypingRef.current) { isTypingRef.current = false; sendStopTyping(); }
  }

  // แจ้ง server ว่ากำลังพิมพ์ แล้วตั้ง auto-stop 2 วิ ถ้าหยุดพิมพ์ (debounce)
  // คนตายอยู่ห้องวิญญาณแยก ไม่ต้องประกาศ typing เข้า sidebar หมู่บ้าน
  function handleInputChange(e) {
    let newValue = e.target.value;
    const isReverseEffect = clientEffect?.type === 'REVERSE_TYPING';
    const isObservantEffect = clientEffect?.type === 'REALTIME_TYPING_INDICATOR';

    // Effect: REVERSE_TYPING ('brain_drain' card)
    // Only trigger when adding text, not deleting, to be less frustrating.
    if (isReverseEffect && newValue.length > input.length && Math.random() < (clientEffect.chance || 0.25)) {
      newValue = newValue.split('').reverse().join('');
    }

    setInput(newValue);
    if (blocked || isDead) return;

    if (!newValue.trim()) {
      stopTyping();
      return;
    }

    // Effect: REALTIME_TYPING_INDICATOR ('observant' card)
    // Your typing status is sent more frequently, making you more 'observable'.
    if (isObservantEffect) {
      sendTyping();
    } else if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping();
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000); // Always set a stop timer
  }

  // เลิก mount / โดนปิดแชท → เคลียร์สถานะพิมพ์ ไม่ให้ค้างใน sidebar คนอื่น
  useEffect(() => stopTyping, []);
  useEffect(() => { if (blocked) stopTyping(); }, [blocked]);

  function handleSend(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || blocked) return;

    const options = {};
    if (highlightNext) {
      options.isHighlighted = true;
      setHighlightNext(false); // Use it once
    }

    if (isWhisperActive && whisperTargetId) {
      sendMessage(trimmed, 'village', options, whisperTargetId); // Whispers are always in village channel
      setWhisperUsedThisRound(true);
    } else {
      sendMessage(trimmed, isDead ? 'dead' : channel, options);
    }

    setInput('');
    stopTyping();

    // Set a 1.5s cooldown to prevent spam, unless the 'talkative' card is active
    if (!isNoCooldownActive) {
      setChatCooldown(true);
      setTimeout(() => setChatCooldown(false), 1500);
    }
  }

  return (
    <div className="gpc gp-panel">
      {showHead && (
        <div className="gpc-head">
          <h3 className="gpc-title">{isDead ? 'ห้องวิญญาณ' : 'วงสนทนา'}</h3>
          {isDead
            ? <span className="gpc-headtag">👻 คุยได้เฉพาะกับคนตายด้วยกัน</span>
            : isNightClosed && <span className="gpc-headtag">🌙 หมู่บ้านหลับใหล</span>}
        </div>
      )}

      <div className="gpc-messages custom-scrollbar">
        {messages.length === 0 && (
          <p className="gpc-empty">หมู่บ้านยังเงียบอยู่…</p>
        )}
        {messages.map((msg) => <ChatMessage key={msg.id} msg={msg} clientEffect={clientEffect} myNickname={nickname} />)}
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
          {isWhisperActive && (
            <select
              value={whisperTargetId}
              onChange={(e) => setWhisperTargetId(e.target.value)}
              className="gpc-select"
              disabled={blocked || whisperUsedThisRound}
            >
              <option value="">กระซิบถึงใคร?</option>
              {alivePlayers.map(p => (
                <option key={p.id} value={p.id}>{p.nickname}</option>
              ))}
            </select>
          )}
          <input
            type="text" value={input} onChange={handleInputChange}
            disabled={blocked}
            placeholder={
              isSilenced ? 'วันนี้เจ้าพูดไม่ได้…'
                : isChatCooldown ? 'ช้าก่อน... รอสักครู่'
                : isDead ? 'กระซิบกับวิญญาณตนอื่น…'
                : 'พิมพ์อะไรสักหน่อย…'
            }
            maxLength={300}
            className="gpc-input"
          />
          <button type="submit" disabled={!input.trim() || blocked || (isWhisperActive && !whisperTargetId)} className="gpc-send">ส่ง</button>
        </form>
      )}
    </div>
  );
}
