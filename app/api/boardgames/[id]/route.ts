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
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl;
    if (body.pdfFile !== undefined) updateData.pdfFile = body.pdfFile;
    if (body.officialWebsite !== undefined) updateData.officialWebsite = body.officialWebsite;

    // Debug: Log the update data
    console.log('Updating game with data:', updateData);
    
    // Validate each field individually
    for (const [key, value] of Object.entries(updateData)) {
      console.log(`Field ${key}:`, typeof value, value);
      
      // Check for problematic values
      if (value === null && key !== 'yearRelease' && key !== 'minPlayers' && key !== 'maxPlayers' && key !== 'durationMinutes') {
        console.warn(`Field ${key} has null value`);
      }
      
      if (typeof value === 'string' && value.length > 10000) {
        console.warn(`Field ${key} is very long: ${value.length} characters`);
      }
      
      // Special validation for nameEn field
      if (key === 'nameEn' && typeof value === 'string') {
        console.log(`nameEn field received: "${value}" (length: ${value.length})`);
        if (value.trim().length === 0) {
          console.error(`Field ${key} is empty`);
          return NextResponse.json(
            { error: 'Empty name', message: 'Game name cannot be empty', field: key },
            { status: 400 }
          );
        }
      }
      
    // Check for invalid characters in strings
    if (typeof value === 'string' && /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
      console.error(`Field ${key} contains invalid characters`);
      console.error(`Field ${key} value:`, JSON.stringify(value));
      console.error(`Field ${key} char codes:`, Array.from(value).map(c => c.charCodeAt(0)));
      return NextResponse.json(
        { error: 'Invalid characters', message: `Field ${key} contains invalid characters`, field: key },
        { status: 400 }
      );
    }
    }
    
    // Check PDF file size if present
    if (updateData.pdfFile) {
      const pdfSizeKB = Math.round(updateData.pdfFile.length / 1024);
      console.log(`PDF file size in API: ${pdfSizeKB} KB`);
      
      if (pdfSizeKB > 11264) { // 11MB limit
        return NextResponse.json(
          { error: 'PDF file too large', message: `PDF file is ${pdfSizeKB} KB, maximum allowed is 11MB` },
          { status: 400 }
        );
      }
    }

    // Update the game
    console.log('Attempting Prisma update with data:', updateData);
    
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
    
    console.log('Prisma update successful');

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
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'No message');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Check if it's a Prisma validation error
    if (error instanceof Error && error.message.includes('Invalid')) {
      console.error('Prisma validation error details:', error.message);
      console.error('Full error object:', error);
      
      // Try to extract the specific field causing the issue
      let specificField = 'unknown';
      if (error.message.includes('nameEn')) specificField = 'nameEn';
      else if (error.message.includes('nameEs')) specificField = 'nameEs';
      else if (error.message.includes('designer')) specificField = 'designer';
      else if (error.message.includes('developer')) specificField = 'developer';
      else if (error.message.includes('pdfFile')) specificField = 'pdfFile';
      else if (error.message.includes('pdfUrl')) specificField = 'pdfUrl';
      else if (error.message.includes('videoUrl')) specificField = 'videoUrl';
      else if (error.message.includes('imageUrl')) specificField = 'imageUrl';
      else if (error.message.includes('thumbnailUrl')) specificField = 'thumbnailUrl';
      
      return NextResponse.json(
        { 
          error: 'Invalid data format', 
          message: `The field "${specificField}" contains invalid values. Please check the console for details.`,
          details: error.message,
          field: specificField,
          fullError: error.toString()
        },
        { status: 400 }
      );
    }
    
    // Check for database connection errors
    if (error instanceof Error && error.message.includes('connect')) {
      return NextResponse.json(
        { 
          error: 'Database connection error', 
          message: 'Unable to connect to database. Please try again.',
          details: error.message
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update board game', 
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No details available'
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
