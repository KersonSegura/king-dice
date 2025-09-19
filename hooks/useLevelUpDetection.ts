'use client';

import { useLevelUp } from '@/contexts/LevelUpContext';
import { useState, useCallback, useEffect } from 'react';

export function useLevelUpDetection() {
  const { showLevelUp } = useLevelUp();
  const [lastKnownLevel, setLastKnownLevel] = useState(1);
  const [lastShownLevel, setLastShownLevel] = useState(1);

  // Load the last shown level from localStorage on mount
  useEffect(() => {
    const savedLastShownLevel = localStorage.getItem('lastShownLevel');
    if (savedLastShownLevel) {
      setLastShownLevel(parseInt(savedLastShownLevel, 10));
    }
  }, []);

  const checkForLevelUp = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/reputation?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        const currentLevel = data.user?.level || 1;
        
        // Only show level up notification if current level is higher than last known level
        // This means the user actually leveled up since we last checked
        if (currentLevel > lastKnownLevel) {
          console.log(`🎊 Level up detected! From ${lastKnownLevel} to ${currentLevel}`);
          showLevelUp(currentLevel);
          setLastKnownLevel(currentLevel);
          setLastShownLevel(currentLevel);
          // Save the last shown level to localStorage
          localStorage.setItem('lastShownLevel', currentLevel.toString());
          return true; // Level up occurred
        }
      }
    } catch (error) {
      console.error('Error checking for level up:', error);
    }
    return false; // No level up
  }, [lastKnownLevel, showLevelUp]);

  const initializeLevel = useCallback((level: number) => {
    setLastKnownLevel(level);
    // If this is the first time loading, set lastShownLevel to current level
    // so we don't show a notification for the current level
    if (lastShownLevel === 1) {
      setLastShownLevel(level);
      localStorage.setItem('lastShownLevel', level.toString());
    }
  }, [lastShownLevel]);

  return {
    checkForLevelUp,
    initializeLevel,
    lastKnownLevel,
    lastShownLevel
  };
}
