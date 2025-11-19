import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

    // Query games in batches to avoid connection exhaustion
    // Based on Supabase connection management best practices
    // Process in batches of 10 to prevent overwhelming PostgREST
    const BATCH_SIZE = 10;
    const results: Array<{ gameInfo: typeof topRankedGames[0]; game: any }> = [];
    
    for (let i = 0; i < gamesToFind.length; i += BATCH_SIZE) {
      const batch = gamesToFind.slice(i, i + BATCH_SIZE);
      
      const batchQueries = batch.map(async (gameInfo) => {
        try {
          // Try exact match first (case-insensitive)
          let query = supabaseAdmin
            .from('games')
            .select('*')
            .or(`nameEn.ilike.${gameInfo.name},nameEs.ilike.${gameInfo.name},name.ilike.${gameInfo.name}`);

          // If year is provided, also filter by year
          if (gameInfo.year) {
            query = query.eq('yearRelease', gameInfo.year);
          }

          const { data: exactMatch, error: exactError } = await query.limit(1).maybeSingle();

          if (exactMatch && !exactError) {
            // Verify it's an exact match (case-insensitive)
            const lowerName = gameInfo.name.toLowerCase();
            if (exactMatch.nameEn?.toLowerCase() === lowerName ||
                exactMatch.nameEs?.toLowerCase() === lowerName ||
                exactMatch.name?.toLowerCase() === lowerName) {
              return { gameInfo, game: exactMatch };
            }
          }

          // If no exact match, try partial match (without year filter first)
          const { data: partialMatch, error: partialError } = await supabaseAdmin
            .from('games')
            .select('*')
            .or(`nameEn.ilike.%${gameInfo.name}%,nameEs.ilike.%${gameInfo.name}%,name.ilike.%${gameInfo.name}%`)
            .limit(1)
            .maybeSingle();

          if (partialMatch && !partialError) {
            return { gameInfo, game: partialMatch };
          }
          
          return { gameInfo, game: null };
        } catch (error) {
          console.error(`Error fetching game "${gameInfo.name}":`, error);
          return { gameInfo, game: null };
        }
      });

      // Wait for batch to complete before starting next batch
      const batchResults = await Promise.all(batchQueries);
      results.push(...batchResults);
      
      // Small delay between batches to prevent connection exhaustion
      if (i + BATCH_SIZE < gamesToFind.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Build results array in the correct order
    for (const { gameInfo, game } of results) {
      if (game) {
        foundGames.push(game);
      } else {
        missingGames.push(gameInfo.name);
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
