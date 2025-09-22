import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// File path for storing users
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Load users from file
const loadUsers = () => {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return [];
};


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const users = loadUsers();
    const user = users.find((u: any) => u.username === username);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse JSON fields
    const parsedUser = {
      ...user,
      favoriteGames: user.favoriteGames ? JSON.parse(user.favoriteGames) : [],
      profileColors: user.profileColors ? JSON.parse(user.profileColors) : {
        cover: '#fbae17',
        background: '#f5f5f5',
        containers: '#ffffff'
      },
      gamesList: user.gamesList ? JSON.parse(user.gamesList) : []
    };

    return NextResponse.json({
      success: true,
      user: {
        ...parsedUser,
        levelProgress: {
          currentLevel: 1,
          currentLevelName: 'Commoner',
          currentXP: 0,
          xpForNextLevel: 100,
          progressPercentage: 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}
