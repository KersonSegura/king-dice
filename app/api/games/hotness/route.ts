import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`🔥 Getting HOTNESS GAMES (limit: ${limit})`);

    // Get the hotness games from BGG curated list - use select('*') to handle both naming conventions
    let { data: games, error } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('category', 'hotness')
      .order('hotnessRank', { ascending: true })
      .limit(limit);

    // If no hotness games found, get any games with images as fallback
    if (!games || games.length === 0) {
      console.log('No hotness games found, using fallback games with images');
      const fallbackResult = await supabaseAdmin
        .from('games')
        .select('*')
        .or('image.not.is.null,imageUrl.not.is.null')
        .order('userRating', { ascending: false })
        .limit(limit);
      
      games = fallbackResult.data || [];
      error = fallbackResult.error || error;
    }

    if (error) {
      console.error('❌ Supabase query error:', error);
      return NextResponse.json(
        { error: 'Database query error', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${games?.length || 0} hotness games`);

    return NextResponse.json({ 
      games: games || [],
      category: 'hotness',
      total: games?.length || 0,
      description: 'The hottest games today according to BoardGameGeek',
      source: 'BGG Hotness List'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('❌ Error getting hotness games:', error);
    console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
