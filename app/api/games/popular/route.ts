import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CacheService } from '@/lib/redis';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category') || 'hot'; // 'hot' or 'ranked'

    console.log(`🔍 Getting popular games - Category: ${category}, Limit: ${limit}`);

    // Check cache first
    const cacheKey = `popular:${category}:${limit}`;
    const cachedGames = await CacheService.getCachedPopularGames(cacheKey);
    
    if (cachedGames) {
      console.log(`✅ Cache hit for popular games - Category: ${category}`);
      return NextResponse.json({ 
        games: cachedGames,
        category: category,
        total: cachedGames.length,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'CDN-Cache-Control': 'public, max-age=300'
        }
      });
    }

    console.log(`❌ Cache miss for popular games - Category: ${category}, fetching from database`);

    // Get games according to the specified category
    let games = await prisma.game.findMany({
      where: {
        category: category,
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

    // If no games with userRating in the specified category, get any game from that category
    if (games.length === 0) {
      games = await prisma.game.findMany({
        where: {
          category: category
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

    console.log(`✅ Found ${games.length} games from category "${category}"`);

    // Cache the results for 30 minutes
    await CacheService.cachePopularGames(cacheKey, games, 1800);

    return NextResponse.json({ 
      games,
      category: category,
      total: games.length,
      cached: false
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error getting popular games:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 