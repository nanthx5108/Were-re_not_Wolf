import React, { useMemo } from 'react';
import '../../styles/HomePage.css'; // Assuming styles are shared or imported globally

export default function FirefliesLayer() {
  const flies = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      left: 8 + Math.random() * 84,
      top: 18 + Math.random() * 56,
      dur: 4 + Math.random() * 3,
      delay: Math.random() * 5,
      dx: (Math.random() * 2 - 1) * 26,
      dy: -14 - Math.random() * 22,
    })), []);
  return (
    <div className="home-fireflies" aria-hidden="true">
      {flies.map(f => (
        <span key={f.id} className="firefly" style={{
          left: `${f.left}%`, top: `${f.top}%`,
          '--ff-dur': `${f.dur}s`, '--ff-delay': `${f.delay}s`,
          '--ff-dx': `${f.dx}px`, '--ff-dy': `${f.dy}px`,
        }} />
      ))}
    </div>
  );
}