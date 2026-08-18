import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/Gamecontext.jsx';
import '../styles/MorningEventCard.css';

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.8, y: -50, transition: { duration: 0.4, ease: 'easeIn' } },
};

export default function MorningEventCard() {
  const { morningEvent } = useGame();
  const [currentEvent, setCurrentEvent] = useState(null);

  useEffect(() => {
    // Only show a new event, and not the "quiet morning" one.
    if (morningEvent && morningEvent.id !== 'quiet_morning') {
      setCurrentEvent(morningEvent);
    } else {
      // If a new event is 'quiet_morning' or null, clear the card.
      setCurrentEvent(null);
    }
  }, [morningEvent]); // Dependency on the event object from context

  const handleClose = () => {
    setCurrentEvent(null);
  };

  return (
    <AnimatePresence>
      {currentEvent && (
        <motion.div
          className="mec-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="mec-card sketch-border"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the card itself
          >
            {currentEvent.card_image && (
              <img src={currentEvent.card_image} alt="" className="mec-image" />
            )}
            <div className="mec-content">
              <div className="mec-eyebrow">เหตุการณ์ประจำเช้า</div>
              <h2 className="mec-title">{currentEvent.title}</h2>
              <p className="mec-narrator">"{currentEvent.narrator}"</p>
              <div className="mec-divider" />
              <p className="mec-effect-label">ผลกระทบ:</p>
              <p className="mec-effect">{currentEvent.effect}</p>
              {currentEvent.announcement && (
                 <p className="mec-announcement">{currentEvent.announcement}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}