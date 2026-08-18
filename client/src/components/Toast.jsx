import React from 'react';

const Toast = ({ message, type, onClose }) => {
  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-message">{message}</div>
      <button onClick={onClose} className="toast-close-btn">
        &times;
      </button>
    </div>
  );
};

export default Toast;