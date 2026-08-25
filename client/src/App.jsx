import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GameProvider } from './context/Gamecontext.jsx';
import { GameDataProvider } from './context/GameDataContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx'; // เพิ่ม useAuth
import ToastContainer from './components/ToastContainer.jsx';
import { ToastProvider } from './components/ToastContext.jsx';
import { applyPerfModeClass } from './utils/perfMode.js';
import soundManager from './sound/soundManager.js';

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
import AdminPage from '../pages/AdminPage.jsx';
import AdminActivationModal from './components/AdminActivationModal.jsx';
import AdminFloatingWindow from './components/AdminFloatingWindow.jsx';
import MorningEventCard from './components/MorningEventCard.jsx';

export default function App() {
  useEffect(() => { applyPerfModeClass(); }, []);
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { user } = useAuth();
  const [showAdminModal,  setShowAdminModal]  = useState(false);
  const [showAdminWindow, setShowAdminWindow] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === '/') {
        if (user?.isAdmin) {
          e.preventDefault();
          setShowAdminModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  useEffect(() => {
    const openAdmin = () => { if (user?.isAdmin) setShowAdminWindow(true); };
    window.addEventListener('open-admin-panel', openAdmin);
    return () => window.removeEventListener('open-admin-panel', openAdmin);
  }, [user]);

  return (
    <ToastProvider>
      <GameProvider>
        <GameDataProvider>
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
            <filter id="sketch-edge">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" seed="3" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
            </filter>
          </svg>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AmbientBgm />
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
              <Route path="/admin" element={user?.isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
            <MorningEventCard />
            {showAdminModal && <AdminActivationModal onClose={() => setShowAdminModal(false)} />}
            {showAdminWindow && user?.isAdmin && (
              <AdminFloatingWindow onClose={() => setShowAdminWindow(false)}>
                <AdminPage />
              </AdminFloatingWindow>
            )}
          </BrowserRouter>
          <ToastContainer />
        </GameDataProvider>
      </GameProvider>
    </ToastProvider>
  );
}

function AmbientBgm() {
  const { pathname } = useLocation();
  const isGameRoute = pathname.startsWith('/game/');

  useEffect(() => {
    if (isGameRoute) {
      soundManager.stopBgm();
      return undefined;
    }
    soundManager.playBgm('home', '/assets/audio/BGM-lobby.mp3', { loop: true });
    return undefined;
  }, [isGameRoute]);

  return null;
}