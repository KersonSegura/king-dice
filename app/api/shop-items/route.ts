import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[SHOP ITEMS API] Fetching all shop items with game and category data...');

    // Fetch all shop items
    const { data: shopItems, error: shopItemsError } = await supabaseAdmin
      .from('game_shop_items')
      .select('*')
      .order('order', { ascending: true });

    if (shopItemsError) {
      console.error('[SHOP ITEMS API] Error fetching shop items:', shopItemsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch shop items', 
          details: shopItemsError.message 
        },
        { status: 500 }
      );
    }

    if (!shopItems || shopItems.length === 0) {
      return NextResponse.json({ 
        shopItems: [],
        categories: []
      });
    }

    // Get all unique game IDs
    const gameIds = [...new Set(shopItems.map((item: any) => item.gameId ?? item.game_id))];
    console.log('[SHOP ITEMS API] Found shop items from', gameIds.length, 'games. Game IDs:', gameIds.slice(0, 10));

    // Fetch games for these IDs
    const { data: games, error: gamesError } = await supabaseAdmin
      .from('games')
      .select('id, nameEn, nameEs')
      .in('id', gameIds);

    if (gamesError) {
      console.warn('[SHOP ITEMS API] Error fetching games:', gamesError);
    }

    // Create a map of games by ID
    const gamesMap = new Map<number, any>();
    (games || []).forEach((game: any) => {
      gamesMap.set(game.id, {
        id: game.id,
        nameEn: game.nameEn ?? game.name_en,
        nameEs: game.nameEs ?? game.name_es
      });
    });

    // Fetch categories for all games
    // Try both camelCase and snake_case column names
    let gameCategories: any[] = [];
    let categoriesError: any = null;
    
    // Try camelCase first
    const { data: categoriesCamel, error: errorCamel } = await supabaseAdmin
      .from('game_categories')
      .select(`
        *,
        category:categories(*)
      `)
      .in('gameId', gameIds);
    
    if (errorCamel) {
      console.warn('[SHOP ITEMS API] Error fetching categories with camelCase, trying snake_case:', errorCamel);
      // Try snake_case
      const { data: categoriesSnake, error: errorSnake } = await supabaseAdmin
        .from('game_categories')
        .select(`
          *,
          category:categories(*)
        `)
        .in('game_id', gameIds);
      
      if (errorSnake) {
        console.warn('[SHOP ITEMS API] Error fetching categories with snake_case:', errorSnake);
        categoriesError = errorSnake;
      } else {
        gameCategories = categoriesSnake || [];
      }
    } else {
      gameCategories = categoriesCamel || [];
    }

    // Group categories by game ID
    const categoriesByGameId: Record<number, any[]> = {};
    (gameCategories || []).forEach((gc: any) => {
      const gameId = gc.gameId ?? gc.game_id;
      if (!gameId) {
        console.warn('[SHOP ITEMS API] Category entry missing gameId:', gc);
        return;
      }
      if (!categoriesByGameId[gameId]) {
        categoriesByGameId[gameId] = [];
      }
      const cat = Array.isArray(gc.category) ? gc.category[0] : (gc.category || {});
      if (cat && cat.id) {
        categoriesByGameId[gameId].push({
          id: cat.id,
          nameEn: cat.name_en ?? cat.nameEn,
          nameEs: cat.name_es ?? cat.nameEs
        });
      }
    });

    console.log('[SHOP ITEMS API] Categories by game:', Object.keys(categoriesByGameId).length, 'games have categories');

    // Collect all unique categories for the filter list
    const allCategoriesMap = new Map<number, { id: number; nameEn: string; nameEs?: string }>();
    Object.values(categoriesByGameId).forEach((cats: any[]) => {
      cats.forEach((cat: any) => {
        if (!allCategoriesMap.has(cat.id)) {
          allCategoriesMap.set(cat.id, cat);
        }
      });
    });

    // Transform shop items to include game and category information
    const transformedItems = shopItems.map((item: any) => {
      const gameId = item.gameId ?? item.game_id;
      const game = gamesMap.get(gameId) || null;
      
      return {
        id: item.id,
        gameId,
        title: item.title,
        imageUrl: item.imageUrl ?? item.image_url,
        link: item.link,
        order: item.order ?? 999,
        game: game,
        categories: categoriesByGameId[gameId] || []
      };
    });

    const allCategories = Array.from(allCategoriesMap.values()).sort((a, b) => 
      (a.nameEn || '').localeCompare(b.nameEn || '')
    );

    console.log('[SHOP ITEMS API] Successfully fetched', transformedItems.length, 'shop items with', allCategories.length, 'unique categories');
    console.log('[SHOP ITEMS API] Category names:', allCategories.map(c => c.nameEn));

    return NextResponse.json({ 
      shopItems: transformedItems,
      categories: allCategories
    });

  } catch (error: any) {
    console.error('[SHOP ITEMS API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch shop items',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

