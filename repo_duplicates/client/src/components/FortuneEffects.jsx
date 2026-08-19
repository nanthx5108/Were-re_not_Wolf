import { useEffect, useRef } from 'react';
import '../styles/FortuneEffects.css';

const BLUR_INTENSITY = {
  low: '2px',
  medium: '4px',
  high: '8px',
};

function usePeriodicEffect(effect, effectType, callback) {
  useEffect(() => {
    if (effect?.type !== effectType) {
      callback(false);
      return;
    }

    const { interval = 20000, duration = 3000 } = effect;

    const timer = setInterval(() => {
      callback(true);
      setTimeout(() => callback(false), duration);
    }, interval);

    return () => {
      clearInterval(timer);
      callback(false);
    };
  }, [effect, effectType, callback]);
}

export default function FortuneEffects({ card, messages = [] }) {
  const effect = card?.clientEffect;
  const prevMsgCount = useRef(messages.length);

  usePeriodicEffect(effect, 'UI_BLUR', (isActive) => {
    const intensity = BLUR_INTENSITY[effect?.intensity] || BLUR_INTENSITY.medium;
    document.body.style.setProperty('--effect-blur-amount', isActive ? intensity : '0px');
    document.body.classList.toggle('effect-blur', isActive);
  });

  useEffect(() => {
    let timer;
    const isPanicCard = effect?.type === 'SCREEN_SHAKE_ON_MESSAGE';

    if (isPanicCard && messages.length > prevMsgCount.current) {
      document.body.classList.add('effect-shake');
      timer = setTimeout(() => {
        document.body.classList.remove('effect-shake');
      }, 300);
    }

    prevMsgCount.current = messages.length;

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('effect-shake');
    };
  }, [messages.length, effect]);

  useEffect(() => {
    if (effect?.type !== 'MOUSE_JITTER') return;

    document.body.classList.add('effect-hide-cursor');
    const intensity = effect.intensity === 'low' ? 4 : 8;

    const handleMouseMove = (e) => {
      const jitterX = (Math.random() - 0.5) * 2 * intensity;
      const jitterY = (Math.random() - 0.5) * 2 * intensity;
      document.body.style.setProperty('--cursor-x', `${e.clientX + jitterX}px`);
      document.body.style.setProperty('--cursor-y', `${e.clientY + jitterY}px`);
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.body.classList.remove('effect-hide-cursor');
    };
  }, [effect]);

  useEffect(() => {
    if (effect?.type !== 'UI_FLICKER') return;
    document.body.classList.add('effect-flicker');
    return () => document.body.classList.remove('effect-flicker');
  }, [effect]);

  useEffect(() => {
    if (effect?.type !== 'UI_DARKEN') return;
    document.body.classList.add('effect-darken');
    const speedClass = `speed-${effect.speed || 'slow'}`;
    document.body.classList.add(speedClass);

    return () => {
      document.body.classList.remove('effect-darken', speedClass);
    };
  }, [effect]);

  usePeriodicEffect(effect, 'SHUFFLE_UI_ELEMENTS', (isActive) => {
    document.body.classList.toggle('effect-shuffling', isActive);
  });

  return null;
}