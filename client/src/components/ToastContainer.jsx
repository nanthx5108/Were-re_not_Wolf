import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext.jsx';
import '../../styles/Toast.css';

const toastVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: 50, transition: { duration: 0.25, ease: 'easeIn' } },
};

function Toast({ message, type, onDismiss }) {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  return (
    <motion.div className={`toast-item is-${type}`} variants={toastVariants} initial="initial" animate="animate" exit="exit" layout>
      <span className="toast-icon">{icons[type] || '🔔'}</span>
      <p className="toast-message">{message}</p>
      <button className="toast-close" onClick={onDismiss} aria-label="ปิด">✕</button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}