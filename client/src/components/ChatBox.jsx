import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/Gamecontext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ChatMessage from './ChatMessage.jsx';

export default function ChatBox({ showWerewolfChannel = false, showHead = true, clientEffect }) {
  const {
    room, messages, sendMessage, sendTyping, sendStopTyping, myRole, silencedNote, nickname, players, playerId,
    isDead, loadDeadHistory, censorNote, clearCensorNote,
  } = useGame();
  const { user } = useAuth();
  const [input,   setInput]   = useState('');
  const [channel, setChannel] = useState('village');
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  const alivePlayers = players.filter(p => p.isAlive && p.id !== playerId);

  const [isNoCooldownActive, setIsNoCooldownActive] = useState(false);
  const [highlightNext,      setHighlightNext]      = useState(false);
  const [isChatCooldown,     setChatCooldown]       = useState(false);
  const [whisperTargetId,    setWhisperTargetId]    = useState('');
  const [whisperUsedThisRound, setWhisperUsedThisRound] = useState(false);

  useEffect(() => {
    if (clientEffect?.type === 'CHAT_NO_COOLDOWN') {
      setIsNoCooldownActive(true);
      const timer = setTimeout(() => setIsNoCooldownActive(false), clientEffect.duration || 30000);
      return () => clearTimeout(timer);
    }
    setIsNoCooldownActive(false);
  }, [clientEffect]);

  useEffect(() => {
    if (clientEffect?.type === 'HIGHLIGHT_NEXT_MESSAGE') {
      setHighlightNext(true);
    }
  }, [clientEffect]);

  useEffect(() => {
    if (clientEffect?.type !== 'ALLOW_WHISPER') {
      setWhisperTargetId('');
      setWhisperUsedThisRound(false);
    }
  }, [clientEffect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isDead) return;
    setChannel('dead');
    loadDeadHistory();
  }, [isDead, loadDeadHistory]);

  useEffect(() => {
    if (!censorNote) return;
    const t = setTimeout(clearCensorNote, 4000);
    return () => clearTimeout(t);
  }, [censorNote, clearCensorNote]);

  const isSilenced  = Boolean(silencedNote) && !isDead;
  const canWerewolf = showWerewolfChannel && myRole === 'werewolf' && !isDead;

  const isNightClosed = (room?.phase === 'night' || room?.phase === 'night_zero') && !isDead;
  const isWhisperActive = clientEffect?.type === 'ALLOW_WHISPER' && !whisperUsedThisRound;

  const blocked = isSilenced || isNightClosed || (isChatCooldown && !isNoCooldownActive);

  function stopTyping() {
    if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; }
    if (isTypingRef.current) { isTypingRef.current = false; sendStopTyping(); }
  }

  function handleInputChange(e) {
    let newValue = e.target.value;
    const isReverseEffect = clientEffect?.type === 'REVERSE_TYPING';
    const isObservantEffect = clientEffect?.type === 'REALTIME_TYPING_INDICATOR';

    if (isReverseEffect && newValue.length > input.length && Math.random() < (clientEffect.chance || 0.25)) {
      newValue = newValue.split('').reverse().join('');
    }

    setInput(newValue);
    if (blocked || isDead) return;

    if (!newValue.trim()) {
      stopTyping();
      return;
    }

    if (isObservantEffect) {
      sendTyping();
    } else if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping();
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  }

  useEffect(() => stopTyping, []);
  useEffect(() => { if (blocked) stopTyping(); }, [blocked]);

  function handleSend(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || blocked) return;

    if (trimmed.toLowerCase() === '/adminbar') {
      setInput('');
      stopTyping();
      if (user?.isAdmin) window.dispatchEvent(new CustomEvent('open-admin-panel'));
      return;
    }

    const options = {};
    if (highlightNext) {
      options.isHighlighted = true;
      setHighlightNext(false);
    }

    if (isWhisperActive && whisperTargetId) {
      sendMessage(trimmed, 'village', options, whisperTargetId);
      setWhisperUsedThisRound(true);
    } else {
      sendMessage(trimmed, isDead ? 'dead' : channel, options);
    }

    setInput('');
    stopTyping();

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