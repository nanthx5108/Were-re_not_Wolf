import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGame } from './Gamecontext.jsx';

const GameDataContext = createContext(null);

export function useGameData() {
  const context = useContext(GameDataContext);
  if (!context) {
    throw new Error('useGameData must be used within a GameDataProvider');
  }
  return context;
}

export function GameDataProvider({ children }) {
  const { room } = useGame();
  const [roles, setRoles] = useState([]);
  const fortuneCardBack = '/cards/back.png';
  const [fortuneCards, setFortuneCards] = useState([]);
  const [morningEvents, setMorningEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (room) {
      if (Array.isArray(room.activeRoles)) setRoles(room.activeRoles);
      if (Array.isArray(room.activeFortuneCards)) setFortuneCards(room.activeFortuneCards);
      if (Array.isArray(room.morningEvents)) setMorningEvents(room.morningEvents);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [room]);

  const value = {
    loading,
    roles,
    fortuneCards,
    fortuneCardBack,
    morningEvents,
    roleMap: new Map(roles.map(r => [String(r.name_en).toLowerCase(), r])),
    fortuneCardMap: new Map(fortuneCards.map(c => [c.id, c])),
    morningEventMap: new Map(morningEvents.map(e => [e.id, e])),
  };

  return (
    <GameDataContext.Provider value={value}>
      {children}
    </GameDataContext.Provider>
  );
}