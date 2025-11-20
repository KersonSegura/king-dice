import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';

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

    console.log(`🎯 Getting MOST PLAYED GAMES from hardcoded list (limit: ${limit})`);

    const gamesToFind = topRankedGames.slice(0, limit);
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    const seenGameIds = new Set<number>();

    // Process individual queries in small parallel batches (5 at a time)
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < gamesToFind.length; i += BATCH_SIZE) {
      const batch = gamesToFind.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const queryPromises = batch.map(async (gameInfo, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          // Try nameEn first with year filter
          let query = supabaseAdmin
            .from('games')
            .select('*')
            .ilike('nameEn', gameInfo.name)
            .limit(1);
          
          if (gameInfo.year) {
            query = query.eq('yearRelease', gameInfo.year);
          }

          const { data, error } = await executeSupabaseQuery(
            async () => await query.maybeSingle(),
            { maxRetries: 0, baseDelay: 0, timeout: 2000 }
          );

          if (data && !error) {
            return { index: globalIndex, game: data, gameInfo };
          }

          // Try nameEs if nameEn didn't work
          let queryEs = supabaseAdmin
            .from('games')
            .select('*')
            .ilike('nameEs', gameInfo.name)
            .limit(1);
          
          if (gameInfo.year) {
            queryEs = queryEs.eq('yearRelease', gameInfo.year);
          }

          const { data: dataEs, error: errorEs } = await executeSupabaseQuery(
            async () => await queryEs.maybeSingle(),
            { maxRetries: 0, baseDelay: 0, timeout: 2000 }
          );

          if (dataEs && !errorEs) {
            return { index: globalIndex, game: dataEs, gameInfo };
          }

          // Try name field as last resort
          let queryName = supabaseAdmin
            .from('games')
            .select('*')
            .ilike('name', gameInfo.name)
            .limit(1);
          
          if (gameInfo.year) {
            queryName = queryName.eq('yearRelease', gameInfo.year);
          }

          const { data: dataName, error: errorName } = await executeSupabaseQuery(
            async () => await queryName.maybeSingle(),
            { maxRetries: 0, baseDelay: 0, timeout: 2000 }
          );

          if (dataName && !errorName) {
            return { index: globalIndex, game: dataName, gameInfo };
          }

          return { index: globalIndex, game: null, gameInfo };
        } catch (error) {
          return { index: globalIndex, game: null, gameInfo };
        }
      });

      // Wait for this batch to complete
      const batchResults = await Promise.allSettled(queryPromises);
      
      // Process results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const value = result.value as { index: number; game: any; gameInfo: typeof topRankedGames[0] };
          if (value.game && !seenGameIds.has(value.game.id)) {
            foundGames.push(value.game);
            seenGameIds.add(value.game.id);
          } else if (!value.game) {
            missingGames.push(value.gameInfo.name);
          }
        } else {
          // Promise rejected - mark as missing
          const batchIndex = batchResults.indexOf(result);
          if (batchIndex >= 0 && batchIndex < batch.length) {
            missingGames.push(batch[batchIndex].name);
          }
        }
      });

      // Small delay between batches
      if (i + BATCH_SIZE < gamesToFind.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (missingGames.length > 0) {
      console.warn(`⚠️ Games not found: ${missingGames.join(', ')}`);
    }

    console.log(`✅ Found ${foundGames.length} out of ${gamesToFind.length} most played games`);

    return NextResponse.json({ 
      games: foundGames,
      category: 'most-played',
      total: foundGames.length,
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
