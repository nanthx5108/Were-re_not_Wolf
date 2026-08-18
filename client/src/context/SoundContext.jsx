import React, { createContext, useContext } from 'react';
import { soundManager } from '../sound/soundManager';

const SoundContext = createContext(soundManager);

export function SoundProvider({ children }) {
  return (
    <SoundContext.Provider value={soundManager}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext);
}