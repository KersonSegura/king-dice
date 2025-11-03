import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log(`🎯 Getting MOST PLAYED GAMES (limit: ${limit})`);

    // Get the most played games from BGG curated list - use select('*') to handle both naming conventions
    let { data: games, error } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('category', 'most-played')
      .order('hotnessRank', { ascending: true })
      .limit(limit);

    // If no most-played games found, get any games with images as fallback
    if (!games || games.length === 0) {
      console.log('No most-played games found, using fallback games with images');
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
      console.error('Error getting most played games (Supabase):', error);
      return NextResponse.json(
        { error: 'Database query error', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${games.length} most played games`);

    return NextResponse.json({ 
      games: games || [],
      category: 'most-played',
      total: games?.length || 0,
      description: 'The most played games this month according to BoardGameGeek',
      source: 'BGG Most Played List'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error getting most played games:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
