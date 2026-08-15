import React, { useEffect, useState } from 'react';
import { useGame } from '../context/Gamecontext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/EarlyInfoToast.css';

const toastVariants = {
  hidden:  { opacity: 0, y: -20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.3, ease: 'easeIn' } },
};

export default function EarlyInfoToast() {
  const { earlyInfo } = useGame();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (earlyInfo !== null) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 6000); // Show for 6 seconds
      return () => clearTimeout(timer);
    }
  }, [earlyInfo]);

  const message = earlyInfo?.someoneDied
    ? 'เมื่อคืนมีคนตาย'
    : 'เมื่อคืนไม่มีใครตาย';

  return (
    <AnimatePresence>
      {visible && earlyInfo !== null && (
        <motion.div
          className="eit-toast sketch-border"
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="status"
          aria-live="polite"
        >
          <div className="eit-header">
            <span className="eit-icon">🤫</span>
            <h3 className="eit-title">รู้ไว้ไม่เสียหาย</h3>
          </div>
          <p className="eit-message">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}