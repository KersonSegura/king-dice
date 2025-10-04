import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');


    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Find user in database (simplified query first)
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate level progress
    const levelNames = {
      1: 'Commoner', 2: 'Squire', 3: 'Knight', 4: 'Champion', 5: 'Baron/Baroness',
      6: 'Lord/Lady', 7: 'Archmage', 8: 'Duke/Duchess', 9: 'Lord/Lady', 10: 'King/Queen'
    };

    const currentLevel = user.level || 1;
    const currentXP = user.xp || 0;
    const xpForNextLevel = currentLevel < 10 ? (currentLevel * 100) - currentXP : 0;
    const progressPercentage = currentLevel < 10 ? (currentXP / (currentLevel * 100)) * 100 : 100;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio || '',
        favoriteGames: user.favoriteGames ? JSON.parse(user.favoriteGames) : [],
        profileColors: user.profileColors ? JSON.parse(user.profileColors) : {
          cover: '#fbae17',
          background: '#f5f5f5',
          containers: '#ffffff'
        },
        gamesList: user.gamesList ? JSON.parse(user.gamesList) : [],
        isAdmin: user.isAdmin,
        levelProgress: {
          currentLevel,
          currentLevelName: levelNames[currentLevel as keyof typeof levelNames],
          currentXP,
          xpForNextLevel,
          progressPercentage
        },
        posts: [],
        galleryImages: []
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}
