'use client';

import { useLevelUp } from '@/contexts/LevelUpContext';
import { useCallback } from 'react';

export function useAwardXP() {
  const { showLevelUp } = useLevelUp();

  const awardXP = useCallback(async (
    userId: string,
    username: string,
    action: string,
    relatedId?: string
  ) => {
    try {
      const response = await fetch('/api/reputation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          username,
          action,
          relatedId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Show level up notification if user leveled up
        if (data.leveledUp && data.newLevel) {
          console.log(`🎊 Level up notification triggered for level ${data.newLevel}`);
          showLevelUp(data.newLevel);
        }

        return data;
      } else {
        console.error('Failed to award XP:', response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  }, [showLevelUp]);

  return { awardXP };
}
