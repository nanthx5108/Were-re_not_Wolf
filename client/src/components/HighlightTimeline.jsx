import React from 'react';
import { motion } from 'framer-motion';
import defaultAvatar from '../assets/ui/default_avatar.png';
import '../styles/HighlightTimeline.css';

const timelineVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

function getPlayerById(players, id) {
  return players.find(p => p.id === id);
}

function HighlightItem({ highlight, players }) {
  const involved = (highlight.playersInvolved || [])
    .map(id => getPlayerById(players, id))
    .filter(Boolean);

  return (
    <motion.div className="ht-item" variants={itemVariants}>
      <div className="ht-icon" aria-hidden="true">{highlight.icon}</div>
      <div className="ht-content">
        <div className="ht-header">
          <h4 className="ht-title">{highlight.title}</h4>
          <span className="ht-round">วันที่ {highlight.round}</span>
        </div>
        <p className="ht-desc">{highlight.description}</p>
        {involved.length > 0 && (
          <div className="ht-players">
            {involved.map(p => (
              <img
                key={p.id}
                src={p.avatarUrl || defaultAvatar}
                alt={p.nickname}
                title={p.nickname}
                className="ht-avatar"
                onError={e => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultAvatar;
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function HighlightTimeline({ highlights, players }) {
  if (!highlights || highlights.length === 0) {
    return (
      <div className="ht-empty">
        <p>ไม่มีเหตุการณ์สำคัญที่น่าจดจำในรอบนี้... น่าเบื่อจริง</p>
      </div>
    );
  }

  return (
    <motion.div
      className="ht-timeline"
      variants={timelineVariants}
      initial="hidden"
      animate="visible"
    >
      <h3 className="ht-main-title">สรุปเหตุการณ์สำคัญ</h3>
      <div className="ht-list">
        {highlights.map(h => (
          <HighlightItem key={h.id} highlight={h} players={players} />
        ))}
      </div>
    </motion.div>
  );
}