import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const gameId = parseInt(idString);
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Get the game with all related data
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Fetch related data - use camelCase (gameId, baseGameId)
    const [
      { data: categories },
      { data: mechanics },
      { data: descriptions },
      { data: rules },
      { data: expansions },
      { data: shopItems }
    ] = await Promise.all([
      supabaseAdmin.from('game_categories').select('*, category:categories(*)').eq('gameId', gameId),
      supabaseAdmin.from('game_mechanics').select('*, mechanic:mechanics(*)').eq('gameId', gameId),
      supabaseAdmin.from('game_descriptions').select('*').eq('gameId', gameId),
      supabaseAdmin.from('game_rules').select('*').eq('gameId', gameId),
      supabaseAdmin.from('expansions').select('*').eq('baseGameId', gameId),
      supabaseAdmin.from('game_shop_items').select('*').eq('gameId', gameId)
    ]);

    // Transform to match expected format
    const transformedGame = {
      ...game,
      gameCategories: (categories || []).map((gc: any) => ({
        id: gc.id,
        gameId: gc.game_id,
        categoryId: gc.category_id,
        category: Array.isArray(gc.category) ? gc.category[0] : gc.category
      })),
      gameMechanics: (mechanics || []).map((gm: any) => ({
        id: gm.id,
        gameId: gm.game_id,
        mechanicId: gm.mechanic_id,
        mechanic: Array.isArray(gm.mechanic) ? gm.mechanic[0] : gm.mechanic
      })),
      descriptions: descriptions || [],
      rules: rules || [],
      baseGameExpansions: expansions || [],
      shopItems: (shopItems || []).map((item: any) => ({
        id: item.id,
        gameId: item.gameId ?? item.game_id,
        title: item.title,
        imageUrl: item.imageUrl ?? item.image_url,
        link: item.link
      }))
    };

    return NextResponse.json({ 
      success: true, 
      game: transformedGame
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const gameId = parseInt(idString);
    const body = await request.json();
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Check if game exists
    const { data: existingGame, error: existingGameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (existingGameError || !existingGame) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check for duplicate names (excluding current game)
    if (body.nameEn || body.nameEs) {
      let duplicateQuery = supabaseAdmin
        .from('games')
        .select('id, nameEn, name_en, nameEs, name_es, name, yearRelease, year_release')
        .neq('id', gameId);
      
      if (body.nameEn) {
        duplicateQuery = duplicateQuery.or(`nameEn.eq.${body.nameEn},name_en.eq.${body.nameEn},name.eq.${body.nameEn}`);
      }
      if (body.nameEs) {
        duplicateQuery = duplicateQuery.or(`nameEs.eq.${body.nameEs},name_es.eq.${body.nameEs}`);
      }
      
      const { data: duplicateGames } = await duplicateQuery.limit(1);

      if (duplicateGames && duplicateGames.length > 0) {
        const duplicateGame = duplicateGames[0];
        return NextResponse.json(
          { 
            error: 'Duplicate game name', 
            message: `A game with the name "${duplicateGame.nameEn || duplicateGame.name_en || duplicateGame.name}" already exists.`,
            existingGame: {
              id: duplicateGame.id,
              nameEn: duplicateGame.nameEn || duplicateGame.name_en,
              nameEs: duplicateGame.nameEs || duplicateGame.name_es,
              yearRelease: duplicateGame.yearRelease || duplicateGame.year_release
            }
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data - try camelCase first (matches database schema)
    const updateData: any = {};
    
    // Only update provided fields - use camelCase to match database
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
    if (body.amazonUrl !== undefined) updateData.amazonUrl = body.amazonUrl;
    if (body.isExpansion !== undefined) updateData.isExpansion = body.isExpansion;

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
    
    // Note: PDF files should now be uploaded to Supabase Storage first via /api/games/[id]/pdf
    // This endpoint should only receive pdfUrl, not pdfFile (base64)
    // Legacy support: If pdfFile is provided, it will be rejected if too large
    if (updateData.pdfFile) {
      console.warn('⚠️ PDF file (base64) provided directly. This should be uploaded to Supabase Storage first.');
      // Extract the actual file size from base64 data
      const base64Data = updateData.pdfFile.split(',')[1];
      if (base64Data) {
        const actualFileSizeBytes = Math.round((base64Data.length * 3) / 4);
        const actualFileSizeKB = Math.round(actualFileSizeBytes / 1024);
        const actualFileSizeMB = (actualFileSizeKB / 1024).toFixed(2);
        
        // Vercel has a 4.5MB body size limit - reject if too large
        const maxFileSizeKB = 3.3 * 1024; // ~3.3MB in KB
        if (actualFileSizeKB > maxFileSizeKB) {
          return NextResponse.json(
            { error: 'PDF file too large', message: `PDF file is ${actualFileSizeKB} KB (${actualFileSizeMB} MB). Please upload PDFs via the PDF upload button or use a PDF URL.` },
            { status: 400 }
          );
        }
      }
    }

    // Update the game
    console.log('Attempting Supabase update with data:', updateData);
    
    const { data: updatedGame, error: updateError } = await supabaseAdmin
      .from('games')
      .update(updateData)
      .eq('id', gameId)
      .select('*')
      .single();
    
    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw new Error(`Failed to update game: ${updateError.message}`);
    }
    
    console.log('Supabase update successful');
    
    // Fetch related data (categories, mechanics, descriptions, rules, expansions)
    // NOTE: Shop items are fetched AFTER they're updated below
    const [
      { data: categories },
      { data: mechanics },
      { data: descriptions },
      { data: rules },
      { data: expansions }
    ] = await Promise.all([
      supabaseAdmin.from('game_categories').select('*, category:categories(*)').eq('gameId', gameId),
      supabaseAdmin.from('game_mechanics').select('*, mechanic:mechanics(*)').eq('gameId', gameId),
      supabaseAdmin.from('game_descriptions').select('*').eq('gameId', gameId),
      supabaseAdmin.from('game_rules').select('*').eq('gameId', gameId),
      supabaseAdmin.from('expansions').select('*').eq('baseGameId', gameId)
    ]);

    // Update description if provided
    if (body.fullDescription !== undefined) {
      const shortDescription = body.fullDescription.substring(0, 200) + (body.fullDescription.length > 200 ? '...' : '');
      
      // Find existing English description - use camelCase (gameId)
      const { data: existingEnDescriptions } = await supabaseAdmin
        .from('game_descriptions')
        .select('*')
        .eq('gameId', gameId)
        .eq('language', 'en')
        .limit(1);
      
      const existingEnDescription = existingEnDescriptions?.[0];
      
      if (existingEnDescription) {
        // Update existing description - use camelCase
        await supabaseAdmin
          .from('game_descriptions')
          .update({
            fullDescription: body.fullDescription,
            shortDescription: shortDescription
          })
          .eq('id', existingEnDescription.id);
      } else {
        // Create new description - use camelCase (gameId)
        await supabaseAdmin
          .from('game_descriptions')
          .insert({
            gameId: gameId,
            language: 'en',
            fullDescription: body.fullDescription,
            shortDescription: shortDescription
          });
      }

      // Also update Spanish description if game has Spanish name
      const nameEs = updatedGame.name_es || updatedGame.nameEs;
      if (nameEs) {
        const { data: existingEsDescriptions } = await supabaseAdmin
          .from('game_descriptions')
          .select('*')
          .eq('gameId', gameId)
          .eq('language', 'es')
          .limit(1);
        
        const existingEsDescription = existingEsDescriptions?.[0];
        
        if (existingEsDescription) {
          await supabaseAdmin
            .from('game_descriptions')
            .update({
              fullDescription: body.fullDescription,
              shortDescription: shortDescription
            })
            .eq('id', existingEsDescription.id);
        } else {
          await supabaseAdmin
            .from('game_descriptions')
            .insert({
              gameId: gameId,
              language: 'es',
              fullDescription: body.fullDescription,
              shortDescription: shortDescription
            });
        }
      }
    }

    // Update shop items if provided: replace all items for this game
    if (Array.isArray(body.shopItems)) {
      await supabaseAdmin.from('game_shop_items').delete().eq('gameId', gameId);
      const itemsToInsert = body.shopItems
        .filter((item: any) => item && item.title && item.link)
        .map((item: any) => ({
          gameId,
          title: item.title,
          imageUrl: item.imageUrl || null,
          link: item.link
        }));
      if (itemsToInsert.length > 0) {
        const { error: shopInsertError } = await supabaseAdmin
          .from('game_shop_items')
          .insert(itemsToInsert);
        if (shopInsertError) {
          console.error('Error inserting shop items:', shopInsertError);
        }
      }
    }

    // Fetch shop items AFTER they've been updated
    const { data: shopItems } = await supabaseAdmin
      .from('game_shop_items')
      .select('*')
      .eq('gameId', gameId);

    // Transform to match expected format
    const transformedGame = {
      ...updatedGame,
      gameCategories: (categories || []).map((gc: any) => ({
        id: gc.id,
        gameId: gc.game_id,
        categoryId: gc.category_id,
        category: Array.isArray(gc.category) ? gc.category[0] : gc.category
      })),
      gameMechanics: (mechanics || []).map((gm: any) => ({
        id: gm.id,
        gameId: gm.game_id,
        mechanicId: gm.mechanic_id,
        mechanic: Array.isArray(gm.mechanic) ? gm.mechanic[0] : gm.mechanic
      })),
      descriptions: descriptions || [],
      rules: rules || [],
      baseGameExpansions: expansions || [],
      shopItems: (shopItems || []).map((item: any) => ({
        id: item.id,
        gameId: item.gameId ?? item.game_id,
        title: item.title,
        imageUrl: item.imageUrl ?? item.image_url,
        link: item.link
      }))
    };

    return NextResponse.json({ 
      success: true, 
      game: transformedGame,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const gameId = parseInt(idString);
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Check if game exists
    const { data: existingGame, error: existingGameError } = await supabaseAdmin
      .from('games')
      .select('id')
      .eq('id', gameId)
      .single();

    if (existingGameError || !existingGame) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Delete the game (this will cascade to related records due to foreign key constraints)
    const { error: deleteError } = await supabaseAdmin
      .from('games')
      .delete()
      .eq('id', gameId);

    if (deleteError) {
      throw new Error(`Failed to delete game: ${deleteError.message}`);
    }

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
