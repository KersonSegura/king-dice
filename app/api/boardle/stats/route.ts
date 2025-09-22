import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// File path for storing user statistics
const STATS_FILE = path.join(process.cwd(), 'data', 'boardle-stats.json');

// Default stats structure
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

interface UserStatsData {
  [userId: string]: BoardleStats;
}

// Ensure data directory exists
const ensureDataDirectory = async () => {
  const dataDir = path.dirname(STATS_FILE);
  if (!fsSync.existsSync(dataDir)) {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// Load user statistics data
const loadUserStatsData = async (): Promise<UserStatsData> => {
  try {
    await ensureDataDirectory();
    if (fsSync.existsSync(STATS_FILE)) {
      const data = await fs.readFile(STATS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading user stats data:', error);
  }
  return {};
};

// Save user statistics data
const saveUserStatsData = async (statsData: UserStatsData) => {
  try {
    await ensureDataDirectory();
    await fs.writeFile(STATS_FILE, JSON.stringify(statsData, null, 2));
  } catch (error) {
    console.error('Error saving user stats data:', error);
  }
};

// Create default stats
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

// GET: Retrieve user statistics

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const statsData = await loadUserStatsData();
    const userStats = statsData[userId] || createDefaultStats();

    return NextResponse.json({
      stats: userStats,
      message: 'User statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving user statistics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve user statistics' },
      { status: 500 }
    );
  }
}

// POST: Update user statistics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, gameMode, won, guessCount } = body;

    if (!userId || !gameMode) {
      return NextResponse.json(
        { error: 'User ID and game mode are required' },
        { status: 400 }
      );
    }

    if (!['title', 'image', 'card'].includes(gameMode)) {
      return NextResponse.json(
        { error: 'Invalid game mode' },
        { status: 400 }
      );
    }

    const statsData = await loadUserStatsData();
    let userStats = statsData[userId] || createDefaultStats();

    // Update overall stats
    userStats.gamesPlayed += 1;
    userStats.lastPlayedDate = new Date().toISOString();

    if (won) {
      userStats.gamesWon += 1;
      userStats.currentStreak += 1;
      userStats.maxStreak = Math.max(userStats.maxStreak, userStats.currentStreak);
      
      if (guessCount > 0 && guessCount <= 6) {
        userStats.guessDistribution[guessCount - 1] += 1;
      }
    } else {
      userStats.currentStreak = 0;
    }

    // Update mode-specific stats
    if (!userStats.gamesByMode) {
      userStats.gamesByMode = {
        title: { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] },
        image: { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] },
        card: { gamesPlayed: 0, gamesWon: 0, currentStreak: 0, maxStreak: 0, guessDistribution: [0, 0, 0, 0, 0, 0] }
      };
    }

    const modeStats = userStats.gamesByMode[gameMode as keyof typeof userStats.gamesByMode];
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

    // Save updated stats
    statsData[userId] = userStats;
    await saveUserStatsData(statsData);

    return NextResponse.json({
      stats: userStats,
      message: 'User statistics updated successfully'
    });

  } catch (error) {
    console.error('Error updating user statistics:', error);
    return NextResponse.json(
      { error: 'Failed to update user statistics' },
      { status: 500 }
    );
  }
}

// DELETE: Reset user statistics
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const statsData = await loadUserStatsData();
    statsData[userId] = createDefaultStats();
    await saveUserStatsData(statsData);

    return NextResponse.json({
      stats: statsData[userId],
      message: 'User statistics reset successfully'
    });

  } catch (error) {
    console.error('Error resetting user statistics:', error);
    return NextResponse.json(
      { error: 'Failed to reset user statistics' },
      { status: 500 }
    );
  }
}
