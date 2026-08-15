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
      callback(false); // Cleanup on unmount/card change
    };
  }, [effect, effectType, callback]);
}

export default function FortuneEffects({ card, messages = [] }) {
  const effect = card?.clientEffect;
  const prevMsgCount = useRef(messages.length);

  // --- UI_BLUR Effect ('blurry_vision' card) ---
  usePeriodicEffect(effect, 'UI_BLUR', (isActive) => {
    const intensity = BLUR_INTENSITY[effect?.intensity] || BLUR_INTENSITY.medium;
    document.body.style.setProperty('--effect-blur-amount', isActive ? intensity : '0px');
    document.body.classList.toggle('effect-blur', isActive);
  });

  // --- SCREEN_SHAKE_ON_MESSAGE Effect ('panic' card) ---
  useEffect(() => {
    let timer;
    const isPanicCard = effect?.type === 'SCREEN_SHAKE_ON_MESSAGE';

    if (isPanicCard && messages.length > prevMsgCount.current) {
      document.body.classList.add('effect-shake');
      // The class is removed by the animation's end state, but we'll also
      // set a timeout as a fallback to ensure it's removed.
      timer = setTimeout(() => {
        document.body.classList.remove('effect-shake');
      }, 300); // Match animation duration
    }

    prevMsgCount.current = messages.length;

    // Cleanup timer and class on unmount or card change
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('effect-shake');
    };
  }, [messages.length, effect]);

  // --- MOUSE_JITTER Effect ('wobbly_walk' card) ---
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

  // --- UI_FLICKER Effect ('forgot_refuel' card) ---
  useEffect(() => {
    if (effect?.type !== 'UI_FLICKER') return;
    document.body.classList.add('effect-flicker');
    return () => document.body.classList.remove('effect-flicker');
  }, [effect]);

  // --- UI_DARKEN Effect ('sleepless' card) ---
  useEffect(() => {
    if (effect?.type !== 'UI_DARKEN') return;
    document.body.classList.add('effect-darken');
    // The speed can be used to select different animation durations
    const speedClass = `speed-${effect.speed || 'slow'}`;
    document.body.classList.add(speedClass);

    return () => {
      document.body.classList.remove('effect-darken', speedClass);
    };
  }, [effect]);

  // --- SHUFFLE_UI_ELEMENTS Effect ('insane' card) ---
  usePeriodicEffect(effect, 'SHUFFLE_UI_ELEMENTS', (isActive) => {
    // This effect is very disruptive, so we'll just apply a class and let CSS handle it.
    // The 'elements' from the card definition can be used to target specific components.
    document.body.classList.toggle('effect-shuffling', isActive);
  });

  return null; // This is a side-effect component, it doesn't render anything.
}