import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './components/ToastContext.jsx';
import './styles/global.css';
import './sound/soundManager.js'; // import เฉยๆ พอ — instance ถูกสร้างและโหลด settings อัตโนมัติตอน import แล้ว

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);