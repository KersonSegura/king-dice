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
      orderBy: {
        hotnessRank: 'asc'
      },
      select: {
        id: true,
        bggId: true,
        nameEn: true,
        nameEs: true,
        name: true,
        hotnessRank: true,
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
        bggRanking: true,
        bggRating: true,
        bggVotes: true,
        expansions: true,
        isExpansion: true,
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
          bggRanking: true,
          bggRating: true,
          bggVotes: true,
          expansions: true,
          isExpansion: true,
          category: true,
          designer: true,
          developer: true,
          officialWebsite: true,
          hotnessRank: true
        }
      });
    }

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
    console.error('❌ Error getting hotness games:', error);
    console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    
    // Check if it's a Prisma connection issue
    if (error instanceof Error && (error.message.includes('Prisma') || error.message.includes('Query Engine'))) {
      return NextResponse.json(
        { 
          error: 'Database connection error', 
          details: 'Prisma engine not available. Please check deployment configuration.',
          message: error.message
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
