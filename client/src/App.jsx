import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from '../context/GameContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
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

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
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
      </GameProvider>
    </AuthProvider>
  );
}