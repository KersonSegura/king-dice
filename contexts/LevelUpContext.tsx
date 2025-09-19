'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import LevelUpNotification from '@/components/LevelUpNotification';

interface LevelUpContextType {
  showLevelUp: (level: number) => void;
  hideLevelUp: () => void;
}

const LevelUpContext = createContext<LevelUpContextType | undefined>(undefined);

export function useLevelUp() {
  const context = useContext(LevelUpContext);
  if (context === undefined) {
    throw new Error('useLevelUp must be used within a LevelUpProvider');
  }
  return context;
}

interface LevelUpProviderProps {
  children: ReactNode;
}

export function LevelUpProvider({ children }: LevelUpProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);

  const showLevelUp = (level: number) => {
    setCurrentLevel(level);
    setIsVisible(true);
  };

  const hideLevelUp = () => {
    setIsVisible(false);
  };

  const value = {
    showLevelUp,
    hideLevelUp
  };

  return (
    <LevelUpContext.Provider value={value}>
      {children}
      <LevelUpNotification 
        isVisible={isVisible}
        level={currentLevel}
        onClose={hideLevelUp}
      />
    </LevelUpContext.Provider>
  );
}
