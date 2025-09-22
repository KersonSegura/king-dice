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
        { nameEn: { contains: search } },
        { nameEs: { contains: search } },
        { name: { contains: search } }
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
        { yearRelease: 'desc' },
        { nameEn: 'asc' }
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
    
    // Create a new game
    const game = await prisma.game.create({
      data: {
        nameEn: body.nameEn,
        nameEs: body.nameEs,
        yearRelease: body.yearRelease,
        designer: body.designer,
        developer: body.developer,
        minPlayers: body.minPlayers,
        maxPlayers: body.maxPlayers,
        durationMinutes: body.durationMinutes,
        imageUrl: body.imageUrl,
        thumbnailUrl: body.thumbnailUrl,
        // Legacy fields
        name: body.nameEn,
        year: body.yearRelease,
        minPlayTime: body.durationMinutes,
        maxPlayTime: body.durationMinutes,
        image: body.thumbnailUrl || body.imageUrl,
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
