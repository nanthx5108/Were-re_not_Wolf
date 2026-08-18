import React, { useMemo } from 'react';
import '../../styles/HomePage.css'; // Assuming styles are shared or imported globally

export default function StarsLayer() {
  const stars = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 62,
      size: Math.random() < 0.82 ? 1.5 : 2.5,
      delay: Math.random() * 6,
      dur: 3 + Math.random() * 5,
      bright: Math.random() < 0.25,
    })), []);
  return (
    <div className="home-stars" aria-hidden="true">
      {stars.map(s => (
        <span key={s.id} className={`star ${s.bright ? 'is-bright' : ''}`}
          style={{
            left: `${s.left}%`, top: `${s.top}%`,
            width: s.size, height: s.size,
            animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`,
          }} />
      ))}
    </div>
  );
}