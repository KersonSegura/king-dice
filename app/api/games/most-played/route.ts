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
    
    // Map to store games by their position in the original list
    const gamesByPosition = new Map<number, any>();

    // Query multiple games at once using OR conditions - much faster
    const queryGamesBatch = async (gameInfos: typeof topRankedGames): Promise<Map<string, any>> => {
      const results = new Map<string, any>();
      if (gameInfos.length === 0) return results;
      
      try {
        // Build OR conditions for this batch
        const orConditions: string[] = [];
        gameInfos.forEach((gameInfo) => {
          // Escape single quotes for SQL
          const escapedName = gameInfo.name.replace(/'/g, "''");
          orConditions.push(`nameEn.ilike.${escapedName}`);
          orConditions.push(`nameEs.ilike.${escapedName}`);
          orConditions.push(`name.ilike.${escapedName}`);
        });

        // Single query for the batch
        const { data: batchGames, error } = await executeSupabaseQuery(
          async () => {
            let query = supabaseAdmin
              .from('games')
              .select('*')
              .or(orConditions.join(','));
            
            // If all games in batch have same year, filter by year
            const years = gameInfos.map(gi => gi.year).filter(Boolean);
            if (years.length > 0 && years.every(y => y === years[0])) {
              query = query.eq('yearRelease', years[0]);
            }
            
            return await query;
          },
          { maxRetries: 1, baseDelay: 200, timeout: 5000 }
        );

        if (error || !batchGames) return results;

        // Match games to their names and years
        batchGames.forEach((game: any) => {
          const nameEn = (game.nameEn || '').toLowerCase().trim();
          const nameEs = (game.nameEs || '').toLowerCase().trim();
          const name = (game.name || '').toLowerCase().trim();
          const year = game.yearRelease;
          
          // Find matching game
          for (const gameInfo of gameInfos) {
            const searchName = gameInfo.name.toLowerCase().trim();
            const matchesName = nameEn === searchName || nameEs === searchName || name === searchName;
            const matchesYear = !gameInfo.year || !year || year === gameInfo.year;
            
            if (matchesName && matchesYear) {
              const key = `${gameInfo.name}_${gameInfo.year || 'any'}`;
              if (!results.has(key)) {
                results.set(key, game);
                break;
              }
            }
          }
        });
      } catch (error) {
        console.error('Error querying batch:', error);
      }
      
      return results;
    };

    // Process all games in batches using OR queries (much faster)
    const BATCH_SIZE = 6; // 6 games = 18 OR conditions (manageable)
    
    for (let i = 0; i < gamesToFind.length; i += BATCH_SIZE) {
      const batch = gamesToFind.slice(i, i + BATCH_SIZE);
      
      // Query this batch with OR conditions
      const batchResults = await queryGamesBatch(batch);
      
      // Map results to positions
      batch.forEach((gameInfo, batchIdx) => {
        const globalIdx = i + batchIdx;
        const key = `${gameInfo.name}_${gameInfo.year || 'any'}`;
        const game = batchResults.get(key);
        if (game && !seenGameIds.has(game.id)) {
          gamesByPosition.set(globalIdx, game);
          seenGameIds.add(game.id);
        } else if (!game) {
          missingGames.push(gameInfo.name);
        }
      });

      // Small delay between batches
      if (i + BATCH_SIZE < gamesToFind.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Build final array in order of the original list
    for (let i = 0; i < gamesToFind.length; i++) {
      const game = gamesByPosition.get(i);
      if (game) {
        foundGames.push(game);
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
