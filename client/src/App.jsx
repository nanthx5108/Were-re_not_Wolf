import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from '../context/GameContext.jsx';
import HomePage from '../pages/HomePage.jsx';
import Lobby    from '../pages/Lobby.jsx';
import Game     from '../pages/Game.jsx';

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"              element={<HomePage />} />
          <Route path="/lobby/:roomId" element={<Lobby />} />
          <Route path="/game/:roomId"  element={<Game />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}