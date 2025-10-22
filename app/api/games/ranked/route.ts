import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`🏆 Getting TOP ${limit} RANKED GAMES`);

    // Get the top ranked games from BGG
    let games = await prisma.game.findMany({
      where: {
        category: 'top-ranked'
      },
      take: limit,
      orderBy: {
        id: 'asc' // Order by ID to maintain BGG ranking order
      },
      select: {
        id: true,
        bggId: true,
        name: true,
        year: true,
        minPlayers: true,
        maxPlayers: true,
        minPlayTime: true,
        maxPlayTime: true,
        image: true,
        userRating: true,
        userVotes: true,
        expansions: true,
        category: true
      }
    });

    // If no top-ranked games, get any game from top-ranked category
    if (games.length === 0) {
      games = await prisma.game.findMany({
        where: {
          category: 'top-ranked'
        },
        take: limit,
        select: {
          id: true,
          bggId: true,
          name: true,
          year: true,
          minPlayers: true,
          maxPlayers: true,
          minPlayTime: true,
          maxPlayTime: true,
          image: true,
          userRating: true,
          userVotes: true,
          expansions: true,
          category: true
        }
      });
    }

    console.log(`✅ Found ${games.length} ranked games`);

    return NextResponse.json({ 
      games,
      category: 'top-ranked',
      total: games.length,
      description: 'The top ranked games from BoardGameGeek'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error getting ranked games:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 