import React from 'react';
import '../../styles/HomePage.css'; // Assuming styles are shared or imported globally

export default function WolfEasterEgg({ visible }) {
  return (
    <span className={`wolf-easter-egg ${visible ? 'is-visible' : ''}`} aria-hidden="true">
      <svg width="40" height="30" viewBox="0 0 40 30">
        <path d="M4 26 L14 6 L20 14 L26 6 L36 26" stroke="currentColor" strokeWidth="2" fill="none"
              strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}