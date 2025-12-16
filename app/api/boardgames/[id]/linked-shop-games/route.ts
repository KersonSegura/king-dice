import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/boardgames/[id]/linked-shop-games
 * Returns all games that share the same shop list (either linking to this game, or games linking to the same master as this game)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[LINKED-SHOP-GAMES API] Route called');
  try {
    const { id: idString } = await params;
    console.log('[LINKED-SHOP-GAMES API] Game ID:', idString);
    const gameId = parseInt(idString);

    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Fetch the game to check if it has a master
    // Use maybeSingle() instead of single() to handle cases where game might not exist more gracefully
    // Select all columns to avoid issues with column name mismatches
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();

    if (gameError) {
      console.error('[LINKED-SHOP-GAMES API] Error fetching game:', gameError);
      return NextResponse.json(
        { error: 'Failed to fetch game', details: gameError.message },
        { status: 500 }
      );
    }

    if (!game) {
      console.error(`[LINKED-SHOP-GAMES API] Game ${gameId} not found in database`);
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    console.log(`[LINKED-SHOP-GAMES API] Found game ${gameId}, master ID:`, (game as any).shopListMasterGameId ?? (game as any).shop_list_master_game_id);

    const masterGameId = (game as any).shopListMasterGameId ?? (game as any).shop_list_master_game_id;
    
    // Determine the actual master game ID
    // If this game has a master, use that master. Otherwise, this game is the master.
    const actualMasterId = masterGameId || gameId;

    // Find all games that link to this master (including the master itself)
    // Query for games where: id = master (the master itself), OR shopListMasterGameId = master, OR shop_list_master_game_id = master
    // Try camelCase first, then fallback to snake_case if needed
    let linkedGames: any[] | null = null;
    let linkedGamesError: any = null;
    
    // Try querying with camelCase column names
    const { data: camelCaseGames, error: camelCaseError } = await supabaseAdmin
      .from('games')
      .select('id, nameEn, nameEs, shopListMasterGameId')
      .or(`id.eq.${actualMasterId},shopListMasterGameId.eq.${actualMasterId}`);
    
    if (!camelCaseError && camelCaseGames) {
      linkedGames = camelCaseGames;
      console.log('[LINKED-SHOP-GAMES API] Found games using camelCase columns:', linkedGames.length);
    } else {
      // Try snake_case column names as fallback
      console.log('[LINKED-SHOP-GAMES API] CamelCase query failed, trying snake_case:', camelCaseError);
      const { data: snakeCaseGames, error: snakeCaseError } = await supabaseAdmin
        .from('games')
        .select('id, name_en, name_es, shop_list_master_game_id')
        .or(`id.eq.${actualMasterId},shop_list_master_game_id.eq.${actualMasterId}`);
      
      if (!snakeCaseError && snakeCaseGames) {
        linkedGames = snakeCaseGames;
        console.log('[LINKED-SHOP-GAMES API] Found games using snake_case columns:', linkedGames.length);
      } else {
        linkedGamesError = snakeCaseError || camelCaseError;
        console.error('[LINKED-SHOP-GAMES API] Both queries failed:', linkedGamesError);
      }
    }

    if (linkedGamesError) {
      console.error('Error fetching linked games:', linkedGamesError);
      return NextResponse.json(
        { error: 'Failed to fetch linked games' },
        { status: 500 }
      );
    }

    console.log('[LINKED-SHOP-GAMES API] Found linked games:', linkedGames?.length || 0);
    console.log('[LINKED-SHOP-GAMES API] Actual master ID:', actualMasterId);

    // Transform the results to ensure consistent naming (handle both camelCase and snake_case)
    const transformedGames = (linkedGames || []).map((g: any) => ({
      id: g.id,
      nameEn: g.nameEn ?? g.name_en ?? '',
      nameEs: g.nameEs ?? g.name_es ?? null,
      shopListMasterGameId: g.shopListMasterGameId ?? g.shop_list_master_game_id ?? null
    }));

    console.log('[LINKED-SHOP-GAMES API] Transformed games:', transformedGames.length);

    // Sort: master game first, then others by name
    const masterGame = transformedGames.find(g => g.id === actualMasterId);
    const otherGames = transformedGames.filter(g => g.id !== actualMasterId).sort((a, b) => 
      (a.nameEn || '').localeCompare(b.nameEn || '')
    );

    const result = {
      success: true,
      masterGameId: actualMasterId,
      linkedGames: masterGame ? [masterGame, ...otherGames] : otherGames
    };

    console.log('[LINKED-SHOP-GAMES API] Returning result with', result.linkedGames.length, 'games');
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in linked-shop-games endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

