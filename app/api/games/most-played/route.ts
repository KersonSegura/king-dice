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
    const gameInfoMap = new Map<string, { index: number; gameInfo: typeof topRankedGames[0] }>();

    // Build OR conditions for all games in a single query
    const orConditions: string[] = [];
    gamesToFind.forEach((gameInfo, index) => {
      const key = `${gameInfo.name.toLowerCase()}_${gameInfo.year || 'any'}`;
      gameInfoMap.set(key, { index, gameInfo });
      // Escape single quotes for SQL
      const escapedName = gameInfo.name.replace(/'/g, "''");
      orConditions.push(`nameEn.ilike.${escapedName}`);
      orConditions.push(`nameEs.ilike.${escapedName}`);
      orConditions.push(`name.ilike.${escapedName}`);
    });

    try {
      // Single query to get all matching games
      const { data: allGames, error } = await executeSupabaseQuery(
        async () => {
          return await supabaseAdmin
            .from('games')
            .select('*')
            .or(orConditions.join(','));
        },
        { maxRetries: 2, baseDelay: 300, timeout: 10000 }
      );

      if (error) {
        console.error('❌ Error querying games:', error);
        throw error;
      }

      if (allGames && allGames.length > 0) {
        // Match games to their names and years
        const matchedGames = new Map<number, any>(); // game index -> game data
        
        allGames.forEach((game: any) => {
          const nameEn = (game.nameEn || '').toLowerCase();
          const nameEs = (game.nameEs || '').toLowerCase();
          const name = (game.name || '').toLowerCase();
          const year = game.yearRelease;
          
          // Find matching game
          for (const [key, info] of gameInfoMap.entries()) {
            const [gameName, gameYear] = key.split('_');
            const matchesName = nameEn === gameName || nameEs === gameName || name === gameName;
            const matchesYear = gameYear === 'any' || !info.gameInfo.year || year === info.gameInfo.year;
            
            if (matchesName && matchesYear) {
              // Only add if we haven't matched this game yet
              if (!matchedGames.has(info.index)) {
                matchedGames.set(info.index, game);
                break;
              }
            }
          }
        });

        // Add matched games in order
        for (let i = 0; i < gamesToFind.length; i++) {
          const matchedGame = matchedGames.get(i);
          if (matchedGame && !seenGameIds.has(matchedGame.id)) {
            foundGames.push(matchedGame);
            seenGameIds.add(matchedGame.id);
          } else if (!matchedGame) {
            missingGames.push(gamesToFind[i].name);
          }
        }
      } else {
        // No games found - mark all as missing
        gamesToFind.forEach(gameInfo => missingGames.push(gameInfo.name));
      }
    } catch (error) {
      console.error('❌ Error in batch query:', error);
      // Fallback: mark all as missing
      gamesToFind.forEach(gameInfo => missingGames.push(gameInfo.name));
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
