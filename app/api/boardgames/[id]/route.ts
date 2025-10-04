import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = parseInt(params.id);
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Get the game with all related data
    const game = await prisma.game.findUnique({
      where: { id: gameId },
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
      }
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      game
    });

  } catch (error) {
    console.error('Error fetching board game:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch board game', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = parseInt(params.id);
    const body = await request.json();
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Check if game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!existingGame) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check for duplicate names (excluding current game)
    if (body.nameEn || body.nameEs) {
      const duplicateGame = await prisma.game.findFirst({
        where: {
          AND: [
            { id: { not: gameId } }, // Exclude current game
            {
              OR: [
                { nameEn: { equals: body.nameEn } },
                { nameEs: { equals: body.nameEs } },
                { name: { equals: body.nameEn } }
              ]
            }
          ]
        }
      });

      if (duplicateGame) {
        return NextResponse.json(
          { 
            error: 'Duplicate game name', 
            message: `A game with the name "${duplicateGame.nameEn || duplicateGame.name}" already exists.`,
            existingGame: {
              id: duplicateGame.id,
              nameEn: duplicateGame.nameEn,
              nameEs: duplicateGame.nameEs,
              yearRelease: duplicateGame.yearRelease
            }
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    // Only update provided fields
    if (body.nameEn !== undefined) {
      updateData.nameEn = body.nameEn;
      updateData.name = body.nameEn; // Update legacy field
    }
    if (body.nameEs !== undefined) updateData.nameEs = body.nameEs;
    if (body.yearRelease !== undefined) {
      updateData.yearRelease = body.yearRelease;
      updateData.year = body.yearRelease; // Update legacy field
    }
    if (body.designer !== undefined) updateData.designer = body.designer;
    if (body.developer !== undefined) updateData.developer = body.developer;
    if (body.minPlayers !== undefined) updateData.minPlayers = body.minPlayers;
    if (body.maxPlayers !== undefined) updateData.maxPlayers = body.maxPlayers;
    if (body.durationMinutes !== undefined) {
      updateData.durationMinutes = body.durationMinutes;
      updateData.minPlayTime = body.durationMinutes; // Update legacy field
      updateData.maxPlayTime = body.durationMinutes; // Update legacy field
    }
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.thumbnailUrl !== undefined) {
      updateData.thumbnailUrl = body.thumbnailUrl;
      updateData.image = body.thumbnailUrl || body.imageUrl; // Update legacy field
    }

    // Update the game
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: updateData,
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
      }
    });

    // Update description if provided
    if (body.fullDescription !== undefined) {
      // Find existing English description
      const existingEnDescription = updatedGame.descriptions.find(d => d.language === 'en');
      
      if (existingEnDescription) {
        // Update existing description
        await prisma.gameDescription.update({
          where: { id: existingEnDescription.id },
          data: {
            fullDescription: body.fullDescription,
            shortDescription: body.fullDescription.substring(0, 200) + (body.fullDescription.length > 200 ? '...' : '')
          }
        });
      } else {
        // Create new description
        await prisma.gameDescription.create({
          data: {
            gameId: gameId,
            language: 'en',
            fullDescription: body.fullDescription,
            shortDescription: body.fullDescription.substring(0, 200) + (body.fullDescription.length > 200 ? '...' : '')
          }
        });
      }

      // Also update Spanish description if game has Spanish name
      if (updatedGame.nameEs) {
        const existingEsDescription = updatedGame.descriptions.find(d => d.language === 'es');
        
        if (existingEsDescription) {
          await prisma.gameDescription.update({
            where: { id: existingEsDescription.id },
            data: {
              fullDescription: body.fullDescription,
              shortDescription: body.fullDescription.substring(0, 200) + (body.fullDescription.length > 200 ? '...' : '')
            }
          });
        } else {
          await prisma.gameDescription.create({
            data: {
              gameId: gameId,
              language: 'es',
              fullDescription: body.fullDescription,
              shortDescription: body.fullDescription.substring(0, 200) + (body.fullDescription.length > 200 ? '...' : '')
            }
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      game: updatedGame,
      message: 'Game updated successfully'
    });

  } catch (error) {
    console.error('Error updating board game:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update board game', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = parseInt(params.id);
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Check if game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (!existingGame) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Delete the game (this will cascade to related records due to foreign key constraints)
    await prisma.game.delete({
      where: { id: gameId }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Game deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting board game:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete board game', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
