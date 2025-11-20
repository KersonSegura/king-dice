import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const GAME_FIELDS = `
  id,
  bggId,
  name,
  nameEn,
  nameEs,
  yearRelease,
  minPlayers,
  maxPlayers,
  durationMinutes,
  imageUrl,
  thumbnailUrl,
  image,
  userRating,
  userVotes,
  isExpansion,
  bggRanking,
  bggRating,
  bggVotes
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log(`🎯 Getting MOST PLAYED GAMES (limit: ${limit})`);

    const { data, error } = await executeSupabaseQuery(
      async () => {
        return await supabaseAdmin
          .from('most_played_game_list')
          .select(`
            rank,
            game:games (${GAME_FIELDS})
          `)
          .order('rank', { ascending: true })
          .limit(limit);
      },
      { maxRetries: 1, baseDelay: 200, timeout: 8000 }
    );

    const foundGames = (data || [])
      .map((entry: any) => {
        const game = entry?.game;
        if (!game) return null;
        return {
          ...game,
          name: game.name || game.nameEn || 'Unknown Game',
          year: game.yearRelease || game.year,
          minPlayTime: game.durationMinutes,
          maxPlayTime: game.durationMinutes,
          image: game.image || game.imageUrl || game.thumbnailUrl,
          averageRating: game.userRating,
          numVotes: game.userVotes,
          rank: entry.rank
        };
      })
      .filter(Boolean);

    if (error) {
      console.error('❌ Error querying games:', error);
    }

    console.log(`✅ Found ${foundGames.length} most played games`);

    return NextResponse.json({ 
      games: foundGames,
      category: 'most-played',
      total: foundGames.length,
      description: 'The most played games this month according to BoardGameGeek',
      source: 'BGG Most Played List'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60', // Edge cache with stale-while-revalidate
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('❌ Error getting most played games:', error);
    
    // Return empty array instead of error to prevent page crashes
    return NextResponse.json({ 
      games: [],
      category: 'most-played',
      total: 0,
      description: 'The most played games this month according to BoardGameGeek',
      source: 'BGG Most Played List'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' // Shorter cache on error
      }
    });
  }
}
