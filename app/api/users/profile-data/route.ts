import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('Profile data request for userId:', userId);

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user profile data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        bio: true,
        favoriteGames: true,
        profileColors: true,
        isAdmin: true
      }
    });

    console.log('Found user in database:', user);

    if (!user) {
      console.log('User not found, returning defaults');
      // Return default data if user doesn't exist yet
      return NextResponse.json({
        success: true,
        profile: {
          bio: '',
          favoriteGames: [],
          isAdmin: false
        }
      });
    }

    // Parse favorite games if it's a JSON string
    let favoriteGames = [];
    if (user.favoriteGames) {
      try {
        favoriteGames = JSON.parse(user.favoriteGames);
        console.log('Parsed favorite games:', favoriteGames);
      } catch (error) {
        console.error('Error parsing favorite games:', error);
        favoriteGames = [];
      }
    }

    const response = {
      success: true,
      profile: {
        bio: user.bio || '',
        favoriteGames: favoriteGames,
        isAdmin: user.isAdmin || false
      }
    };

    console.log('Returning profile data:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching profile data:', error);
    return NextResponse.json(
      { message: `Failed to fetch profile data: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
