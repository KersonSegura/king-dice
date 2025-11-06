import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const minPlayers = searchParams.get('minPlayers');
    const maxPlayers = searchParams.get('maxPlayers');
    const minPlayTime = searchParams.get('minPlayTime');
    const maxPlayTime = searchParams.get('maxPlayTime');
    const minYear = searchParams.get('minYear');
    const maxYear = searchParams.get('maxYear');
    
    const offset = (page - 1) * limit;

    console.log('[GAMES API] Request params:', { page, limit, search, sortBy, offset });

    // Build query
    let query = supabaseAdmin.from('games').select('*', { count: 'exact' });

    // Apply search filter - try camelCase first, then snake_case as fallback
    if (search) {
      console.log('[GAMES API] Applying search filter:', search);
      query = query.ilike('nameEn', `%${search}%`);
    }

    // Apply filters - try camelCase first, then snake_case as fallback
    if (minPlayers) {
      query = query.gte('minPlayers', parseInt(minPlayers));
    }
    if (maxPlayers) {
      query = query.lte('maxPlayers', parseInt(maxPlayers));
    }
    if (minPlayTime) {
      query = query.gte('durationMinutes', parseInt(minPlayTime));
    }
    if (maxPlayTime) {
      query = query.lte('durationMinutes', parseInt(maxPlayTime));
    }
    if (minYear) {
      query = query.gte('yearRelease', parseInt(minYear));
    }
    if (maxYear) {
      query = query.lte('yearRelease', parseInt(maxYear));
    }

    // Apply sorting - try camelCase first
    if (sortBy === 'name') {
      query = query.order('nameEn', { ascending: true });
    } else if (sortBy === 'year') {
      query = query.order('yearRelease', { ascending: false });
    } else if (sortBy === 'players') {
      query = query.order('minPlayers', { ascending: true });
    } else if (sortBy === 'time') {
      query = query.order('durationMinutes', { ascending: true });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: gamesData, error, count } = await query;

    if (error) {
      console.error('[GAMES API] Error querying games:', error);
      return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
    }

    // Normalize the data for consistent frontend usage
    const normalizedGames = (gamesData || []).map((game: any) => ({
      id: game.id,
      bggId: game.bggId ?? game.bgg_id,
      name: game.nameEn ?? game.name_en ?? game.name,
      nameEn: game.nameEn ?? game.name_en,
      nameEs: game.nameEs ?? game.name_es,
      year: game.yearRelease ?? game.year_release ?? game.year,
      image: game.imageUrl ?? game.image_url ?? game.image,
      thumbnailUrl: game.thumbnailUrl ?? game.thumbnail_url,
      minPlayers: game.minPlayers ?? game.min_players,
      maxPlayers: game.maxPlayers ?? game.max_players,
      minPlayTime: game.minPlayTime ?? game.min_play_time,
      maxPlayTime: game.maxPlayTime ?? game.max_play_time,
      durationMinutes: game.durationMinutes ?? game.duration_minutes,
      ranking: game.bggRanking ?? game.bgg_ranking,
      averageRating: game.bggRating ?? game.bgg_rating,
      numVotes: game.bggVotes ?? game.bgg_votes,
      userRating: game.userRating ?? game.user_rating,
      userVotes: game.userVotes ?? game.user_votes,
      expansions: game.expansions ?? 0
    }));

    const total = count || 0;

    console.log('[GAMES API] Returning', normalizedGames.length, 'games (total:', total, ')');

    return NextResponse.json({
      games: normalizedGames,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('[GAMES API] Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}