import React from 'react';
import { motion } from 'framer-motion';
import { IconArrow } from '../ui/Icons.jsx';
import '../../styles/HomePage.css';

const menuItemVariants = {
  hidden:  { opacity: 0, x: -18, y: 10, scale: 0.96 },
  visible: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.46, ease: [0.34, 1.4, 0.5, 1] } }, // EASE_POP
};

export default function MenuBtn({ title, sub, hint, onClick, primary = false, icon, onHover }) {
  return (
    <motion.button type="button" onClick={onClick} disabled={!onClick}
      onMouseEnter={onHover}
      variants={menuItemVariants}
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`menu-btn sketch-border ${primary ? 'is-primary' : ''}`}>
      <div className="menu-icon">{icon}</div>
      <div className="menu-text">
        <div className="menu-title">{title}</div>
        {sub && <div className="menu-sub">{sub}</div>}
        {hint && <span className="menu-hint">{hint}</span>}
      </div>
      <span className="menu-arrow"><IconArrow /></span>
    </motion.button>
  );
}