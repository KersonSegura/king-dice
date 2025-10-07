import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const withoutRules = searchParams.get('withoutRules') === 'true';
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameEs: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (withoutRules) {
      whereClause.rules = { none: {} };
    }

    // Get total count for pagination
    const totalGames = await prisma.game.count({ where: whereClause });
    
    // Get games with pagination
    const games = await prisma.game.findMany({
      where: whereClause,
      include: {
        gameCategories: {
          include: {
            category: true
          }
        },
        gameMechanics: {
          include: {
            mechanic: true
          }
        },
        descriptions: true,
        rules: true,
        baseGameExpansions: true,
      },
      orderBy: [
        // Prioritize exact matches first
        { nameEn: 'asc' },
        { yearRelease: 'desc' }
      ],
      skip: offset,
      take: limit,
    });

    return NextResponse.json({ 
      games,
      pagination: {
        page,
        limit,
        total: totalGames,
        totalPages: Math.ceil(totalGames / limit),
        hasNext: page < Math.ceil(totalGames / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching board games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch board games' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log what we're receiving (for debugging)
    console.log('Received game data:', {
      nameEn: body.nameEn,
      hasId: 'id' in body,
      id: body.id
    });
    
    // Remove id if it somehow exists in the body (shouldn't happen, but defensive)
    delete body.id;
    
    // Check for duplicate games (case-sensitive for now)
    const existingGame = await prisma.game.findFirst({
      where: {
        OR: [
          { nameEn: { equals: body.nameEn } },
          { nameEs: { equals: body.nameEs } },
          { name: { equals: body.nameEn } }
        ]
      }
    });

    if (existingGame) {
      return NextResponse.json(
        { 
          error: 'Game already exists', 
          message: `A game with the name "${existingGame.nameEn || existingGame.name}" already exists in the database.`,
          existingGame: {
            id: existingGame.id,
            nameEn: existingGame.nameEn,
            nameEs: existingGame.nameEs,
            yearRelease: existingGame.yearRelease
          }
        },
        { status: 409 }
      );
    }
    
    // Create a new game - explicitly define all fields (no spread operator)
    const game = await prisma.game.create({
      data: {
        nameEn: body.nameEn || '',
        nameEs: body.nameEs || '',
        yearRelease: body.yearRelease || null,
        designer: body.designer || null,
        developer: body.developer || null,
        minPlayers: body.minPlayers || null,
        maxPlayers: body.maxPlayers || null,
        durationMinutes: body.durationMinutes || null,
        imageUrl: body.imageUrl || null,
        thumbnailUrl: body.thumbnailUrl || null,
        // Legacy fields
        name: body.nameEn || '',
        year: body.yearRelease || null,
        minPlayTime: body.durationMinutes || null,
        maxPlayTime: body.durationMinutes || null,
        image: body.thumbnailUrl || body.imageUrl || null,
        expansions: 0,
        category: 'ranked',
        userRating: 0,
        userVotes: 0,
      },
    });

    // Add English description if provided
    if (body.fullDescription) {
      await prisma.gameDescription.create({
        data: {
          gameId: game.id,
          language: 'en',
          shortDescription: body.fullDescription.substring(0, 200) + (body.fullDescription.length > 200 ? '...' : ''),
          fullDescription: body.fullDescription,
        },
      });
    }

    // Add Spanish description if provided
    if (body.nameEs && body.fullDescription) {
      await prisma.gameDescription.create({
        data: {
          gameId: game.id,
          language: 'es',
          shortDescription: body.fullDescription.substring(0, 200) + (body.fullDescription.length > 200 ? '...' : ''),
          fullDescription: body.fullDescription,
        },
      });
    }

    // Add rules if provided
    if (body.rulesText) {
      await prisma.gameRule.create({
        data: {
          gameId: game.id,
          language: 'es',
          rulesText: body.rulesText,
          rulesHtml: `<div class="game-rules">${body.rulesText.replace(/\n/g, '<br>')}</div>`,
        },
      });
    }

    return NextResponse.json({ success: true, game });

  } catch (error) {
    console.error('Error creating board game:', error);
    return NextResponse.json(
      { error: 'Failed to create board game', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
