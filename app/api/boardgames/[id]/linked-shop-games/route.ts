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
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('id, shopListMasterGameId, shop_list_master_game_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const masterGameId = (game as any).shopListMasterGameId ?? (game as any).shop_list_master_game_id;
    
    // Determine the actual master game ID
    // If this game has a master, use that master. Otherwise, this game is the master.
    const actualMasterId = masterGameId || gameId;

    // Find all games that link to this master (including the master itself)
    // Use a more robust query that handles both camelCase and snake_case column names
    const { data: linkedGames, error: linkedGamesError } = await supabaseAdmin
      .from('games')
      .select('id, nameEn, nameEs, name_en, name_es, shopListMasterGameId, shop_list_master_game_id')
      .or(`id.eq.${actualMasterId},shopListMasterGameId.eq.${actualMasterId},shop_list_master_game_id.eq.${actualMasterId}`);

    if (linkedGamesError) {
      console.error('Error fetching linked games:', linkedGamesError);
      return NextResponse.json(
        { error: 'Failed to fetch linked games' },
        { status: 500 }
      );
    }

    // Transform the results to ensure consistent naming
    const transformedGames = (linkedGames || []).map((g: any) => ({
      id: g.id,
      nameEn: g.nameEn ?? g.name_en,
      nameEs: g.nameEs ?? g.name_es,
      shopListMasterGameId: g.shopListMasterGameId ?? g.shop_list_master_game_id ?? null
    }));

    // Sort: master game first, then others by name
    const masterGame = transformedGames.find(g => g.id === actualMasterId);
    const otherGames = transformedGames.filter(g => g.id !== actualMasterId).sort((a, b) => 
      (a.nameEn || '').localeCompare(b.nameEn || '')
    );

    return NextResponse.json({
      success: true,
      masterGameId: actualMasterId,
      linkedGames: masterGame ? [masterGame, ...otherGames] : otherGames
    });

  } catch (error) {
    console.error('Error in linked-shop-games endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

