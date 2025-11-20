import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';
import { normalizeGameName } from '@/utils/normalizeGameName';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Top Ranked Games (Most Played) list from BGG (hardcoded list)
const topRankedGames = [
  { name: 'Flip 7', year: 2024 },
  { name: 'Ark Nova', year: 2021 },
  { name: 'Harmonies', year: 2024 },
  { name: 'Castle Combo', year: 2024 },
  { name: 'Bomb Busters', year: 2024 },
  { name: 'Forest Shuffle', year: 2023 },
  { name: 'Sea Salt & Paper', year: 2022 },
  { name: 'Terraforming Mars', year: 2016 },
  { name: 'Azul', year: 2017 },
  { name: 'Wingspan', year: 2019 },
  { name: 'The Lord of the Rings: Fate of the Fellowship', year: 2025 },
  { name: 'Faraway', year: 2023 },
  { name: 'Sky Team', year: 2023 },
  { name: 'Cascadia', year: 2021 },
  { name: 'Lost Ruins of Arnak', year: 2020 },
  { name: 'Heat: Pedal to the Metal', year: 2022 },
  { name: 'Vantage', year: 2025 },
  { name: 'SETI: Search for Extraterrestrial Intelligence', year: 2024 },
  { name: 'The White Castle', year: 2023 },
  { name: 'SCOUT', year: 2019 },
  { name: '7 Wonders Duel', year: 2015 },
  { name: 'Carcassonne', year: 2000 },
  { name: 'The Gang', year: 2024 },
  { name: 'The Lord of the Rings: The Fellowship of the Ring – Trick-Taking Game', year: 2024 },
  { name: 'Splendor', year: 2014 }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log(`🎯 Getting MOST PLAYED GAMES (limit: ${limit})`);

    // Strategy 1: Try precomputed table (fastest, most reliable)
    let allGames: any[] | null = null;
    let error: any = null;

    const { data: precomputedGames, error: precomputedError } = await executeSupabaseQuery(
      async () => {
        return await supabaseAdmin
          .rpc('get_most_played_games_card_fields', { limit_count: limit });
      },
      { maxRetries: 1, baseDelay: 200, timeout: 5000 } // Fast timeout for precomputed
    );

    if (!precomputedError && precomputedGames && precomputedGames.length > 0) {
      // Precomputed table worked! Use it directly
      console.log(`✅ Using precomputed table: ${precomputedGames.length} games`);
      allGames = precomputedGames;
    } else {
      // Strategy 2: Fallback to optimized RPC with card fields only
      console.log('⚠️ Precomputed table empty, using optimized RPC fallback');
      
      const gamesToFind = topRankedGames.slice(0, limit);
      const normalizedNameValues = gamesToFind.map(gameInfo => normalizeGameName(gameInfo.name));
      
      const result = await executeSupabaseQuery(
        async () => {
          return await supabaseAdmin
            .rpc('get_games_card_fields_by_names', {
              _names: normalizedNameValues
            });
        },
        { maxRetries: 2, baseDelay: 200, timeout: 15000 } // Longer timeout for fallback
      );

      allGames = result.data;
      error = result.error;
    }

    // Map results to expected format
    const foundGames = (allGames || []).map((game: any) => ({
      ...game,
      name: game.name || game.nameEn || 'Unknown Game',
      year: game.yearRelease || game.year,
      minPlayTime: game.durationMinutes,
      maxPlayTime: game.durationMinutes,
      image: game.image || game.imageUrl || game.thumbnailUrl,
      averageRating: game.userRating,
      numVotes: game.userVotes,
      rank: game.rank || undefined
    }));

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
