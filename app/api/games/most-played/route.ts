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

    // Batch queries into smaller chunks to avoid timeouts
    const gamesToFind = topRankedGames.slice(0, limit);
    const normalizedNameValues = gamesToFind.map(gameInfo => normalizeGameName(gameInfo.name));
    
    // Query in batches of 5 to avoid timeouts
    const BATCH_SIZE = 5;
    const allGames: any[] = [];
    let lastError: any = null;
    
    for (let i = 0; i < normalizedNameValues.length; i += BATCH_SIZE) {
      const batch = normalizedNameValues.slice(i, i + BATCH_SIZE);
      
      const { data: batchGames, error: batchError } = await executeSupabaseQuery(
        async () => {
          return await supabaseAdmin
            .from('games')
            .select('id, bggId, best_name_norm, name, nameEn, nameEs, yearRelease, minPlayers, maxPlayers, durationMinutes, imageUrl, thumbnailUrl, image, userRating, userVotes, isExpansion, ranking, bggRanking, bggRating, bggVotes')
            .in('best_name_norm', batch);
        },
        { maxRetries: 1, baseDelay: 100, timeout: 5000 } // Shorter timeout per batch
      );
      
      if (batchGames) {
        allGames.push(...batchGames);
      }
      if (batchError) {
        lastError = batchError;
        console.warn(`⚠️ Batch ${i / BATCH_SIZE + 1} failed:`, batchError);
      }
      
      // Small delay between batches to avoid overwhelming the connection pool
      if (i + BATCH_SIZE < normalizedNameValues.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const error = lastError;

    // Map results to expected format and preserve order
    const gamesMap = new Map<string, any>();
    (allGames || []).forEach((game: any) => {
      const normName = game.best_name_norm || normalizeGameName(game.nameEn || game.nameEs || game.name || '');
      gamesMap.set(normName, game);
    });

    // Build array in original order
    const foundGames: any[] = [];
    normalizedNameValues.forEach((normName, index) => {
      const game = gamesMap.get(normName);
      if (game) {
        foundGames.push({
          ...game,
          name: game.name || game.nameEn || 'Unknown Game',
          year: game.yearRelease || game.year,
          minPlayTime: game.durationMinutes,
          maxPlayTime: game.durationMinutes,
          image: game.image || game.imageUrl || game.thumbnailUrl,
          averageRating: game.userRating,
          numVotes: game.userVotes,
          rank: index + 1
        });
      }
    });

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
