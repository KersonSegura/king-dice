import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface BoardleStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
  lastPlayedDate?: string;
  gamesByMode?: {
    title: {
      gamesPlayed: number;
      gamesWon: number;
      currentStreak: number;
      maxStreak: number;
      guessDistribution: number[];
    };
    image: {
      gamesPlayed: number;
      gamesWon: number;
      currentStreak: number;
      maxStreak: number;
      guessDistribution: number[];
    };
    card: {
      gamesPlayed: number;
      gamesWon: number;
      currentStreak: number;
      maxStreak: number;
      guessDistribution: number[];
    };
  };
}

type GameMode = 'title' | 'image' | 'card';

const createDefaultStats = (): BoardleStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
  gamesByMode: {
    title: {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: [0, 0, 0, 0, 0, 0]
    },
    image: {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: [0, 0, 0, 0, 0, 0]
    },
    card: {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: [0, 0, 0, 0, 0, 0]
    }
  }
});

export function useBoardleStats() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<BoardleStats>(createDefaultStats());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load stats when component mounts or user changes
  useEffect(() => {
    loadStats();
  }, [user, isAuthenticated]);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticated && user) {
        // Load stats from server for authenticated users
        const response = await fetch(`/api/boardle/stats?userId=${user.id}`);
        
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        } else {
          throw new Error('Failed to load user statistics');
        }
      } else {
        // Load stats from localStorage for guests
        const savedStats = localStorage.getItem('boardle-stats');
        if (savedStats) {
          const parsedStats = JSON.parse(savedStats);
          // Ensure the stats have the new structure
          const migratedStats = {
            ...createDefaultStats(),
            ...parsedStats
          };
          setStats(migratedStats);
        } else {
          setStats(createDefaultStats());
        }
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
      // Fallback to localStorage or default stats
      const savedStats = localStorage.getItem('boardle-stats');
      if (savedStats) {
        try {
          const parsedStats = JSON.parse(savedStats);
          const migratedStats = {
            ...createDefaultStats(),
            ...parsedStats
          };
          setStats(migratedStats);
        } catch {
          setStats(createDefaultStats());
        }
      } else {
        setStats(createDefaultStats());
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateStats = async (gameMode: GameMode, won: boolean, guessCount: number) => {
    setError(null);

    // Calculate new stats locally first for immediate UI update
    const newStats = { ...stats };
    newStats.gamesPlayed += 1;
    newStats.lastPlayedDate = new Date().toISOString();

    if (won) {
      newStats.gamesWon += 1;
      newStats.currentStreak += 1;
      newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
      
      if (guessCount > 0 && guessCount <= 6) {
        newStats.guessDistribution[guessCount - 1] += 1;
      }
    } else {
      newStats.currentStreak = 0;
    }

    // Update mode-specific stats
    if (!newStats.gamesByMode) {
      newStats.gamesByMode = {
        title: { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] },
        image: { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] },
        card: { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] }
      };
    }

    const modeStats = newStats.gamesByMode[gameMode];
    modeStats.gamesPlayed += 1;

    if (won) {
      modeStats.gamesWon += 1;
      modeStats.currentStreak += 1;
      modeStats.maxStreak = Math.max(modeStats.maxStreak, modeStats.currentStreak);
      
      if (guessCount > 0 && guessCount <= 6) {
        modeStats.guessDistribution[guessCount - 1] += 1;
      }
    } else {
      modeStats.currentStreak = 0;
    }

    // Update state immediately for responsive UI
    setStats(newStats);

    try {
      if (isAuthenticated && user) {
        // Save to server for authenticated users
        const response = await fetch('/api/boardle/stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            gameMode,
            won,
            guessCount
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update user statistics');
        }

        const data = await response.json();
        setStats(data.stats); // Update with server response to ensure consistency
      } else {
        // Save to localStorage for guests
        localStorage.setItem('boardle-stats', JSON.stringify(newStats));
      }
    } catch (err) {
      console.error('Error updating stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to update statistics');
      
      // Always save to localStorage as backup
      localStorage.setItem('boardle-stats', JSON.stringify(newStats));
    }
  };

  const resetStats = async () => {
    setError(null);

    try {
      if (isAuthenticated && user) {
        // Reset on server for authenticated users
        const response = await fetch(`/api/boardle/stats?userId=${user.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to reset user statistics');
        }

        const data = await response.json();
        setStats(data.stats);
      } else {
        // Reset localStorage for guests
        const defaultStats = createDefaultStats();
        localStorage.setItem('boardle-stats', JSON.stringify(defaultStats));
        setStats(defaultStats);
      }
    } catch (err) {
      console.error('Error resetting stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset statistics');
    }
  };

  const getStatsForMode = (gameMode: GameMode) => {
    if (!stats.gamesByMode) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        guessDistribution: [0, 0, 0, 0, 0, 0]
      };
    }
    return stats.gamesByMode[gameMode];
  };

  const migrateFromLocalStorage = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const savedStats = localStorage.getItem('boardle-stats');
      if (savedStats) {
        const localStats = JSON.parse(savedStats);
        
        // Check if we need to migrate (server has default stats and localStorage has data)
        if (stats.gamesPlayed === 0 && localStats.gamesPlayed > 0) {
          // Migrate local stats to server
          const migratedStats = {
            ...createDefaultStats(),
            ...localStats
          };

          const response = await fetch('/api/boardle/stats', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              stats: migratedStats
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setStats(data.stats);
            console.log('Successfully migrated local stats to user account');
          }
        }
      }
    } catch (err) {
      console.error('Error migrating stats:', err);
    }
  };

  return {
    stats,
    isLoading,
    error,
    updateStats,
    resetStats,
    getStatsForMode,
    migrateFromLocalStorage,
    reload: loadStats
  };
}
