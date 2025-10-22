import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log(`🎯 Getting MOST PLAYED GAMES (limit: ${limit})`);

    // Get the most played games from BGG curated list
    const games = await prisma.game.findMany({
      where: {
        category: 'most-played'
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

    console.log(`✅ Found ${games.length} most played games`);

    return NextResponse.json({ 
      games,
      category: 'most-played',
      total: games.length,
      description: 'The most played games this month according to BoardGameGeek',
      source: 'BGG Most Played List'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error getting most played games:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
