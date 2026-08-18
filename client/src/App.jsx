import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/Gamecontext.jsx';
import { GameDataProvider } from './context/GameDataContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx'; // เพิ่ม useAuth
import ToastContainer from './components/ToastContainer.jsx'; // เพิ่ม import ToastContainer

import HomePage     from '../pages/HomePage.jsx';
import LoginPage    from '../pages/LoginPage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import Lobby        from '../pages/Lobby.jsx';
import Game         from '../pages/Game.jsx';
import CustomizePage from '../pages/CustomizePage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';
import NewsPage from '../pages/NewsPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import ViewProfilePage from '../pages/ViewProfilePage.jsx';
import AdminActivationModal from './components/AdminActivationModal.jsx';
import MorningEventCard from './components/MorningEventCard.jsx';

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { user } = useAuth();
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 't') {
        if (user?.isAdmin) {
          e.preventDefault();
          setShowAdminModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  return (
    <GameProvider>
      <GameDataProvider>
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <filter id="sketch-edge">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" seed="3" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
          </filter>
        </svg>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/"              element={<HomePage />} />
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/register"      element={<RegisterPage />} />
            <Route path="/lobby/:roomId" element={<Lobby />} />
            <Route path="/game/:roomId"  element={<Game />} />
            <Route path="/customize"    element={<CustomizePage />} />
            <Route path="/settings"     element={<SettingsPage />} />
            <Route path="/news"         element={<NewsPage />} />
            <Route path="/profile"      element={<ProfilePage />} />
            <Route path="/profile/view" element={<ViewProfilePage />} />
            <Route path="/profile/settings" element={<Navigate to="/profile" replace />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <MorningEventCard />
        {showAdminModal && <AdminActivationModal onClose={() => setShowAdminModal(false)} />}
        <ToastContainer /> {/* เพิ่ม ToastContainer ที่นี่ */}
      </GameDataProvider>
    </GameProvider>
  );
  useEffect(() => {
  const openAdmin = () => { if (user?.isAdmin) setShowAdminModal(true); };
  window.addEventListener('open-admin-panel', openAdmin);
  return () => window.removeEventListener('open-admin-panel', openAdmin);
}, [user]);
}