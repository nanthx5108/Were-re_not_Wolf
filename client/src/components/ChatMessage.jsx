import React from 'react';

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

function garbleText(text, chance) {
  if (text.length < 10 || Math.random() > chance) return text;
  const words = text.split(' ');
  if (words.length < 2) return '...';
  const garbledWords = words.map(word => (word.length > 2 && Math.random() < 0.5) ? '...' : word);
  if (garbledWords.every(w => w === '...')) return words.length > 2 ? `${words[0]} ... ${words[words.length - 1]}` : '...';
  return garbledWords.join(' ');
}

function ChatMessage({ msg, clientEffect, myNickname }) {
  const isSystem = msg.channel === 'system';
  const isGarbleEffect = clientEffect?.type === 'GARBLE_CHAT';
  const isSuspiciousEffect = clientEffect?.type === 'SUSPICIOUS_NAME_COLOR';
  const isHighlighted = msg.isHighlighted;
  const isWhisper = msg.isWhisper;
  const isMyWhisper = isWhisper && msg.playerId === myNickname; // Assuming playerId is unique like nickname

  const shouldGarble = isGarbleEffect && msg.nickname !== myNickname && !isSystem;
  const content = shouldGarble ? garbleText(msg.content, clientEffect.chance) : msg.content;

  const isMySuspiciousMsg = isSuspiciousEffect && msg.nickname === myNickname && !isSystem;
  const senderStyle = { color: CHANNEL_COLOR[msg.channel] || 'var(--text-primary)' };
  if (isMySuspiciousMsg) senderStyle.color = CHANNEL_COLOR.werewolf;

  return (
    <div className={`gpc-msg${msg.channel === 'dead' ? ' is-dead' : ''}${isSystem ? ' is-system' : ''}${isHighlighted ? ' is-highlighted' : ''}${isWhisper ? ' is-whisper' : ''}`}>
      {!isSystem && (
        <span className="gpc-sender" style={senderStyle}>
          {CHANNEL_TAG[msg.channel] || ''}
          {isMyWhisper
            ? `กระซิบถึง ${msg.whisperTargetNickname}`
            : isWhisper ? `กระซิบจาก ${msg.nickname}` : msg.nickname
          }
        </span>
      )}
      <span className="gpc-body">{content}</span>
      {!isSystem && (
        <span className="gpc-time">
          {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}

// Memoize the component to prevent re-rendering of old messages
export default React.memo(ChatMessage);