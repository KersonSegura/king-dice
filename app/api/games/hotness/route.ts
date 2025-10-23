import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`🔥 Getting HOTNESS GAMES (limit: ${limit})`);

    // Get the hotness games from BGG curated list
    let games = await prisma.game.findMany({
      where: {
        category: 'hotness'
      },
      take: limit,
      select: {
        id: true,
        bggId: true,
        nameEn: true,
        nameEs: true,
        name: true,
        yearRelease: true,
        year: true,
        minPlayers: true,
        maxPlayers: true,
        durationMinutes: true,
        minPlayTime: true,
        maxPlayTime: true,
        imageUrl: true,
        image: true,
        thumbnailUrl: true,
        userRating: true,
        userVotes: true,
        expansions: true,
        category: true,
        designer: true,
        developer: true,
        officialWebsite: true
      }
    });

    // If no hotness games found, get any games with images as fallback
    if (games.length === 0) {
      console.log('No hotness games found, using fallback games with images');
      games = await prisma.game.findMany({
        where: {
          OR: [
            { image: { not: null } },
            { imageUrl: { not: null } }
          ]
        },
        take: limit,
        orderBy: {
          userRating: 'desc'
        },
        select: {
          id: true,
          bggId: true,
          nameEn: true,
          nameEs: true,
          name: true,
          yearRelease: true,
          year: true,
          minPlayers: true,
          maxPlayers: true,
          durationMinutes: true,
          minPlayTime: true,
          maxPlayTime: true,
          imageUrl: true,
          image: true,
          thumbnailUrl: true,
          userRating: true,
          userVotes: true,
          expansions: true,
          category: true,
          designer: true,
          developer: true,
          officialWebsite: true
        }
      });
    }

    // Fetch BGG hotness data to get proper ranking order
    const bggResponse = await fetch('https://boardgamegeek.com/xmlapi2/hot?type=boardgame');
    const bggXml = await bggResponse.text();
    
    // Extract BGG rankings
    const itemRegex = /<item id="(\d+)" rank="(\d+)">/g;
    const bggRankMap = new Map();
    let match;
    
    while ((match = itemRegex.exec(bggXml)) !== null) {
      bggRankMap.set(parseInt(match[1]), parseInt(match[2]));
    }

    // Sort games by BGG ranking
    games.sort((a, b) => {
      const rankA = bggRankMap.get(a.bggId) || 999;
      const rankB = bggRankMap.get(b.bggId) || 999;
      return rankA - rankB;
    });

    console.log(`✅ Found ${games.length} hotness games`);

    return NextResponse.json({ 
      games,
      category: 'hotness',
      total: games.length,
      description: 'The hottest games today according to BoardGameGeek',
      source: 'BGG Hotness List'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error getting hotness games:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
