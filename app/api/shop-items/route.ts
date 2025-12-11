import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[SHOP ITEMS API] Fetching all shop items...');

    // Fetch all shop items directly from the database, ordered by order field
    const { data: shopItems, error } = await supabaseAdmin
      .from('game_shop_items')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('[SHOP ITEMS API] Error fetching shop items:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch shop items', 
          details: error.message 
        },
        { status: 500 }
      );
    }

    // Transform to match expected format
    const transformedItems = (shopItems || []).map((item: any) => ({
      id: item.id,
      gameId: item.gameId ?? item.game_id,
      title: item.title,
      imageUrl: item.imageUrl ?? item.image_url,
      link: item.link,
      order: item.order ?? 999
    }));

    console.log('[SHOP ITEMS API] Successfully fetched', transformedItems.length, 'shop items');

    return NextResponse.json({ 
      shopItems: transformedItems
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

