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
    
    // Use a single query to fetch all games at once
    // Build OR conditions for each game name across all name fields
    const orConditions: string[] = [];
    gamesToFind.forEach(gameInfo => {
      // Escape single quotes and wrap in wildcards for ILIKE
      const escapedName = gameInfo.name.replace(/'/g, "''");
      // Add conditions for each name field
      orConditions.push(`nameEn.ilike.*${escapedName}*`);
      orConditions.push(`nameEs.ilike.*${escapedName}*`);
      orConditions.push(`name.ilike.*${escapedName}*`);
    });

    const { data: allGames, error: queryError } = await executeSupabaseQuery(
      async () => {
        return await supabaseAdmin
          .from('games')
          .select('*')
          .or(orConditions.join(','))
          .limit(limit * 3); // Get more than needed in case of duplicates
      },
      { maxRetries: 2, baseDelay: 400, timeout: 10000 }
    );

    if (queryError) {
      console.error('❌ Error querying games:', queryError);
      // Return empty array instead of failing completely
      return NextResponse.json({ 
        games: [],
        category: 'most-played',
        total: 0,
        description: 'The most played games this month according to BoardGameGeek',
        source: 'BGG Most Played List'
      });
    }

    // Match games to the requested order
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    const gamesMap = new Map<string, any>();

    // Create a map of found games by normalized name
    (allGames || []).forEach((game: any) => {
      const nameEn = (game.nameEn || '').toLowerCase();
      const nameEs = (game.nameEs || '').toLowerCase();
      const name = (game.name || '').toLowerCase();
      
      // Store by all possible name variations
      if (nameEn) gamesMap.set(nameEn, game);
      if (nameEs) gamesMap.set(nameEs, game);
      if (name) gamesMap.set(name, game);
    });

    // Match games in the requested order, prefer year match if available
    gamesToFind.forEach((gameInfo) => {
      const normalizedName = gameInfo.name.toLowerCase();
      const matchedGame = gamesMap.get(normalizedName);
      
      if (matchedGame) {
        // If year is specified, prefer games that match the year
        if (gameInfo.year && matchedGame.yearRelease === gameInfo.year) {
          // Check if we already added this game
          if (!foundGames.find(g => g.id === matchedGame.id)) {
            foundGames.push(matchedGame);
          }
        } else if (!gameInfo.year) {
          // No year specified, add any match
          if (!foundGames.find(g => g.id === matchedGame.id)) {
            foundGames.push(matchedGame);
          }
        } else {
          // Year doesn't match, but we'll still add it if no better match exists
          if (!foundGames.find(g => g.id === matchedGame.id)) {
            foundGames.push(matchedGame);
          }
        }
      } else {
        missingGames.push(gameInfo.name);
      }
    });

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
