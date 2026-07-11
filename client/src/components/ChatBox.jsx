import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/Gamecontext.jsx';

const CHANNEL_COLOR = {
  village:  'var(--color-text)',
  werewolf: '#e57373',
  system:   'var(--color-accent)',
};

export default function ChatBox({ showWerewolfChannel = false }) {
  const { messages, sendMessage, myRole, silencedNote } = useGame();
  const [input,   setInput]   = useState('');
  const [channel, setChannel] = useState('village');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isSilenced = Boolean(silencedNote);

  function handleSend(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSilenced) return;
    sendMessage(trimmed, channel);
    setInput('');
  }

  const canWerewolf = showWerewolfChannel && myRole === 'werewolf';

  return (
    <div style={s.container}>
      <h3 style={s.heading}>Chat</h3>

      <div style={s.messages}>
        {messages.length === 0 && (
          <p style={s.empty}>The village is quiet for now…</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={s.message}>
            <span style={{ ...s.sender, color: CHANNEL_COLOR[msg.channel] || 'var(--color-text)' }}>
              {msg.channel === 'system' ? 'SYSTEM' : msg.nickname}
            </span>
            <span style={s.content}>{msg.content}</span>
            <span style={s.time}>
              {new Date(msg.sentAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {isSilenced && <p style={s.silenced}>{silencedNote}</p>}

      <form onSubmit={handleSend} style={s.form}>
        {canWerewolf && !isSilenced && (
          <select value={channel} onChange={e => setChannel(e.target.value)} style={s.select}>
            <option value="village">Village</option>
            <option value="werewolf">Werewolf</option>
          </select>
        )}
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          disabled={isSilenced}
          placeholder={isSilenced ? 'วันนี้เจ้าพูดไม่ได้…' : 'Say something…'}
          maxLength={300}
          style={{ ...s.input, ...(isSilenced ? s.inputDisabled : {}) }}
        />
        <button type="submit" disabled={!input.trim() || isSilenced}
          style={{ ...s.sendBtn, ...(isSilenced ? s.sendBtnDisabled : {}) }}>Send</button>
      </form>
    </div>
  );
}

const s = {
  container: { background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-lg)', padding:'16px', display:'flex', flexDirection:'column', gap:'10px', height:'100%', minHeight:'300px' },
  heading:   { fontFamily:'var(--font-display)', fontSize:'1.1rem', color:'var(--color-accent)' },
  messages:  { flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'4px', paddingRight:'4px', minHeight:'200px', maxHeight:'380px' },
  empty:     { color:'var(--color-text-muted)', fontSize:'13px', fontStyle:'italic', textAlign:'center', marginTop:'24px' },
  message:   { display:'flex', gap:'6px', alignItems:'baseline', flexWrap:'wrap', fontSize:'13px', lineHeight:1.4, padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,.03)' },
  sender:    { fontWeight:700, flexShrink:0, maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  content:   { flex:1, color:'var(--color-text)', wordBreak:'break-word' },
  time:      { fontSize:'11px', color:'var(--color-text-muted)', flexShrink:0 },
  form:      { display:'flex', gap:'6px' },
  select:    { background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', color:'var(--color-text)', fontSize:'13px', padding:'6px 8px', cursor:'pointer', outline:'none' },
  input:     { flex:1, background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', color:'var(--color-text)', fontFamily:'var(--font-body)', fontSize:'14px', padding:'8px 12px', outline:'none' },
  sendBtn:   { background:'var(--color-accent)', border:'none', borderRadius:'var(--radius-md)', color:'#0d1117', fontWeight:700, fontSize:'16px', padding:'8px 14px', cursor:'pointer', lineHeight:1 },
  silenced:  { background:'rgba(139,32,32,.15)', border:'1px solid rgba(229,115,115,.35)', borderRadius:'var(--radius-md)', color:'#e57373', fontSize:'12.5px', padding:'7px 10px', textAlign:'center' },
  inputDisabled: { opacity:.5, cursor:'not-allowed' },
  sendBtnDisabled: { opacity:.4, cursor:'not-allowed' },
};