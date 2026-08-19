import React, { useState, useEffect } from 'react';
import '../styles/AdminActivationModal.css';

export default function AdminActivationModal({ onClose }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.toLowerCase() === 'adminbar') {
      window.dispatchEvent(new CustomEvent('open-admin-panel'));
      onClose();
    } else {
      setError(true);
      setTimeout(() => {
        setError(false);
        onClose();
      }, 500);
    }
  };

  return (
    <div className="admin-activation-overlay" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <input
          type="password"
          className={`admin-activation-input ${error ? 'is-error' : ''}`}
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
          placeholder="Admin Activation"
        />
      </form>
    </div>
  );
}