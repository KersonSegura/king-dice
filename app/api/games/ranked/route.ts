import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`🏆 Getting TOP ${limit} RANKED GAMES`);

    // Get the best ranked games
    let games = await prisma.game.findMany({
      where: {
        category: 'ranked',
        userRating: {
          not: null
        }
      },
      take: limit,
      orderBy: {
        userRating: 'desc'
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

    // If no ranked games, get any game from ranked category
    if (games.length === 0) {
      games = await prisma.game.findMany({
        where: {
          category: 'ranked'
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
      category: 'ranked',
      total: games.length,
      description: 'The best games according to BoardGameGeek historical ranking'
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