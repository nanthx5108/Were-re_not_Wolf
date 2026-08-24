import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/FortuneCard.css';
import { useGameData } from '../context/GameDataContext.jsx';
import { useSound } from '../context/SoundContext.jsx';

const cardVariants = {
  hidden:  { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.25, ease: 'easeIn' } },
};

export default function FortuneCard({ card }) {
  const sound = useSound();
  const { fortuneCardMap } = useGameData();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!card) return;
    setShowDetails(true);
    sound.playCard?.(card, 0.9);

    const timer = setTimeout(() => setShowDetails(false), 4200);
    return () => clearTimeout(timer);
  }, [card, sound]);

  const cardInfo = card ? fortuneCardMap.get(card.id) : null;

  if (!cardInfo) return null;

  return (
    <AnimatePresence>
      {card && cardInfo && (
        <motion.div
          className={`fc-card sketch-border ${cardInfo.type === 'good' ? 'is-good' : 'is-bad'}`}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          layout
        >
          <div className="fc-header">
            {cardInfo.card_image ? (
              <img src={cardInfo.card_image} alt="" className="fc-icon is-image" />
            ) : (
              <div className="fc-icon is-fallback">{cardInfo.icon || '⭐'}</div>
            )}
            <h3 className="fc-name">{cardInfo.name_th || card.name}</h3>
          </div>
          {showDetails && (
            <>
              <p className="fc-desc">{cardInfo.description_th || card.description}</p>
              <button className="fc-close" type="button" onClick={() => setShowDetails(false)}>ปิด</button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}