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
      supabaseAdmin.from('game_shop_items').select('*').eq('gameId', gameId).order('order', { ascending: true })
    ]);

    // Transform to match expected format
    const transformedGame = {
      ...game,
      shopListMasterGameId: (game as any).shopListMasterGameId ?? (game as any).shop_list_master_game_id ?? null,
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
        link: item.link,
        order: item.order ?? 999
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
      console.error(`[PUT /api/boardgames/${gameId}] Game not found. Error:`, existingGameError);
      return NextResponse.json(
        { 
          error: 'Game not found',
          message: `Game with ID ${gameId} does not exist in the database. This may happen if the game was recently created and the games list hasn't refreshed yet, or if the game was deleted.`,
          gameId: gameId
        },
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
    if (body.shopListMasterGameId !== undefined) {
      // Validate that the master game ID is not the same as the current game
      if (body.shopListMasterGameId === gameId) {
        return NextResponse.json(
          { error: 'Invalid shop list master', message: 'A game cannot link to its own shop list' },
          { status: 400 }
        );
      }
      // If setting a master, validate it exists
      if (body.shopListMasterGameId !== null) {
        const { data: masterGame, error: masterGameError } = await supabaseAdmin
          .from('games')
          .select('id')
          .eq('id', body.shopListMasterGameId)
          .single();
        
        if (masterGameError || !masterGame) {
          return NextResponse.json(
            { error: 'Invalid shop list master', message: 'Master game not found' },
            { status: 404 }
          );
        }
      }
      updateData.shopListMasterGameId = body.shopListMasterGameId;
    }

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
      .maybeSingle();
    
    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw new Error(`Failed to update game: ${updateError.message}`);
    }
    
    if (!updatedGame) {
      throw new Error('Game not found or update returned no data');
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

    // Update categories if provided: replace all categories for this game
    if (Array.isArray(body.categories)) {
      console.log(`[PUT /api/boardgames/${gameId}] Updating categories:`, body.categories);
      
      // Delete existing game categories
      const { error: deleteError } = await supabaseAdmin
        .from('game_categories')
        .delete()
        .eq('gameId', gameId);
      
      if (deleteError) {
        console.error('Error deleting game categories:', deleteError);
      } else {
        console.log(`[PUT /api/boardgames/${gameId}] Deleted existing game categories`);
      }
      
      // Process each category name
      for (const categoryName of body.categories) {
        if (!categoryName || typeof categoryName !== 'string' || categoryName.trim().length === 0) {
          continue;
        }
        
        const trimmedName = categoryName.trim();
        
        // Find or create category (case-insensitive)
        let { data: existingCategories, error: findError } = await supabaseAdmin
          .from('categories')
          .select('*')
          .or(`nameEn.ilike.${trimmedName},nameEs.ilike.${trimmedName}`)
          .limit(1);
        
        const existingCategory = existingCategories && existingCategories.length > 0 ? existingCategories[0] : null;
        
        if (findError && findError.code !== 'PGRST116') {
          console.warn(`Error finding category "${trimmedName}":`, findError);
        }
        
        let categoryId: number;
        
        if (!existingCategory) {
          // Create new category
          const { data: newCategory, error: createError } = await supabaseAdmin
            .from('categories')
            .insert({
              nameEn: trimmedName,
              nameEs: trimmedName
            })
            .select()
            .single();
          
          if (createError) {
            console.error(`Error creating category "${trimmedName}":`, createError);
            continue;
          }
          
          categoryId = newCategory.id;
        } else {
          categoryId = existingCategory.id;
        }
        
        // Link category to game
        const { error: linkError } = await supabaseAdmin
          .from('game_categories')
          .insert({
            gameId: gameId,
            categoryId: categoryId
          });
        
        if (linkError) {
          console.error(`Error linking category "${trimmedName}" to game:`, linkError);
        } else {
          console.log(`[PUT /api/boardgames/${gameId}] Linked category: ${trimmedName}`);
        }
      }
    }

    // Update shop items if provided: replace all items for this game
    if (Array.isArray(body.shopItems)) {
      console.log(`[PUT /api/boardgames/${gameId}] Updating shop items:`, body.shopItems);
      
      // Delete existing shop items
      const { error: deleteError } = await supabaseAdmin
        .from('game_shop_items')
        .delete()
        .eq('gameId', gameId);
      
      if (deleteError) {
        console.error('Error deleting shop items:', deleteError);
      } else {
        console.log(`[PUT /api/boardgames/${gameId}] Deleted existing shop items`);
      }
      
      // Insert new shop items
      const itemsToInsert = body.shopItems
        .filter((item: any) => item && item.title && item.link)
        .map((item: any) => ({
          gameId,
          title: item.title,
          imageUrl: item.imageUrl || null,
          link: item.link,
          order: item.order ?? 999
        }));
      
      if (itemsToInsert.length > 0) {
        console.log(`[PUT /api/boardgames/${gameId}] Inserting ${itemsToInsert.length} shop items:`, itemsToInsert);
        const { data: insertedItems, error: shopInsertError } = await supabaseAdmin
          .from('game_shop_items')
          .insert(itemsToInsert)
          .select('*');
        
        if (shopInsertError) {
          console.error('Error inserting shop items:', shopInsertError);
          // Don't throw - return error in response so frontend can handle it
          return NextResponse.json(
            { 
              error: 'Failed to insert shop items', 
              message: shopInsertError.message,
              details: shopInsertError
            },
            { status: 500 }
          );
        } else {
          console.log(`[PUT /api/boardgames/${gameId}] Successfully inserted shop items:`, insertedItems);
        }
      } else {
        console.log(`[PUT /api/boardgames/${gameId}] No shop items to insert (all filtered out)`);
      }
    }

    // Fetch shop items AFTER they've been updated, sorted by order
    const { data: shopItems, error: shopItemsFetchError } = await supabaseAdmin
      .from('game_shop_items')
      .select('*')
      .eq('gameId', gameId)
      .order('order', { ascending: true });
    
    if (shopItemsFetchError) {
      console.error('Error fetching shop items after update:', shopItemsFetchError);
    } else {
      console.log(`[PUT /api/boardgames/${gameId}] Fetched ${shopItems?.length || 0} shop items after update:`, shopItems);
    }

    // Transform to match expected format
    const transformedGame = {
      ...updatedGame,
      shopListMasterGameId: (updatedGame as any).shopListMasterGameId ?? (updatedGame as any).shop_list_master_game_id ?? null,
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
        link: item.link,
        order: item.order ?? 999
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
