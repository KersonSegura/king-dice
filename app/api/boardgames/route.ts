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
      id: body.id,
      hasRules: !!body.rulesText,
      hasDescription: !!body.fullDescription
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

    // If game exists, delete it and all related data to overwrite
    if (existingGame) {
      console.log(`🔄 Game already exists (ID: ${existingGame.id}), deleting to overwrite...`);
      
      // Delete all related data first (Prisma should handle this with cascading deletes if configured)
      await prisma.$transaction(async (tx) => {
        // Delete descriptions
        await tx.gameDescription.deleteMany({
          where: { gameId: existingGame.id }
        });
        
        // Delete rules
        await tx.gameRule.deleteMany({
          where: { gameId: existingGame.id }
        });
        
        // Delete category relationships
        await tx.gameCategory.deleteMany({
          where: { gameId: existingGame.id }
        });
        
        // Delete mechanic relationships
        await tx.gameMechanic.deleteMany({
          where: { gameId: existingGame.id }
        });
        
        // Delete expansion relationships (where this game is the base game)
        await tx.expansion.deleteMany({
          where: { baseGameId: existingGame.id }
        });
        
        // Finally, delete the game itself
        await tx.game.delete({
          where: { id: existingGame.id }
        });
      });
      
      console.log(`✅ Existing game deleted, proceeding with new data...`);
    }
    
    // Use a transaction to ensure all operations succeed or all fail
    const result = await prisma.$transaction(async (tx) => {
      // Create a new game - explicitly define all fields (no spread operator)
      const game = await tx.game.create({
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

      console.log(`✅ Game created with ID: ${game.id}`);

      // Add English description if provided
      if (body.fullDescription) {
        await tx.gameDescription.create({
          data: {
            gameId: game.id,
            language: 'en',
            shortDescription: body.fullDescription.substring(0, 200) + (body.fullDescription.length > 200 ? '...' : ''),
            fullDescription: body.fullDescription,
          },
        });
        console.log(`✅ English description created for game ${game.id}`);
      }

      // Add Spanish description if provided (and different from English)
      // Only create Spanish description if nameEs is provided AND we want a separate Spanish description
      // For now, we'll skip creating a duplicate Spanish description with the same content
      // Users can add Spanish descriptions later if needed
      if (body.fullDescriptionEs && body.nameEs) {
        await tx.gameDescription.create({
          data: {
            gameId: game.id,
            language: 'es',
            shortDescription: body.fullDescriptionEs.substring(0, 200) + (body.fullDescriptionEs.length > 200 ? '...' : ''),
            fullDescription: body.fullDescriptionEs,
          },
        });
        console.log(`✅ Spanish description created for game ${game.id}`);
      }

      // Add rules if provided
      if (body.rulesText && body.rulesText.trim()) {
        await tx.gameRule.create({
          data: {
            gameId: game.id,
            language: 'es',
            rulesText: body.rulesText,
            rulesHtml: `<div class="game-rules">${body.rulesText.replace(/\n/g, '<br>')}</div>`,
          },
        });
        console.log(`✅ Rules created for game ${game.id}`);
      } else {
        console.log(`⚠️ No rules provided for game ${game.id}`);
      }

      return game;
    });

    console.log(`✅ Transaction completed successfully for game: ${result.nameEn}`);
    return NextResponse.json({ success: true, game: result });

  } catch (error) {
    console.error('❌ Error creating board game:', error);
    return NextResponse.json(
      { error: 'Failed to create board game', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
