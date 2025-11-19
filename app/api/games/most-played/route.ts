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

    // OPTIMIZED: Fetch all games in a SINGLE batch query instead of 25+ individual queries
    // Build a single OR condition for all game names
    const orConditions: string[] = [];
    gamesToFind.forEach((gameInfo) => {
      // Escape single quotes in game names for SQL
      const escapedName = gameInfo.name.replace(/'/g, "''");
      orConditions.push(`nameEn.ilike.${escapedName}`);
      orConditions.push(`nameEs.ilike.${escapedName}`);
      orConditions.push(`name.ilike.${escapedName}`);
    });

    // Single query to get all matching games at once
    const { data: allMatches, error: batchError } = await supabaseAdmin
      .from('games')
      .select('*')
      .or(orConditions.join(','))
      .limit(limit * 3); // Get more than needed in case of duplicates

    if (batchError) {
      console.error('❌ Batch query error:', batchError);
      throw batchError;
    }

    // Create a map for quick lookup: lowercase name -> game
    const gamesMap = new Map<string, any>();
    (allMatches || []).forEach((game) => {
      const nameEn = game.nameEn?.toLowerCase() || '';
      const nameEs = game.nameEs?.toLowerCase() || '';
      const name = game.name?.toLowerCase() || '';
      
      if (nameEn) gamesMap.set(nameEn, game);
      if (nameEs) gamesMap.set(nameEs, game);
      if (name) gamesMap.set(name, game);
    });

    // Match games in the correct order, respecting year if provided
    gamesToFind.forEach((gameInfo) => {
      const lowerName = gameInfo.name.toLowerCase();
      
      // Try exact match first
      let matchedGame = gamesMap.get(lowerName);
      
      // If exact match found, verify year if provided
      if (matchedGame && gameInfo.year && matchedGame.yearRelease !== gameInfo.year) {
        matchedGame = null; // Year doesn't match, try partial match
      }
      
      // If no exact match, try partial match
      if (!matchedGame) {
        for (const [key, game] of gamesMap.entries()) {
          if ((key.includes(lowerName) || lowerName.includes(key))) {
            // If year is provided, verify it matches
            if (gameInfo.year && game.yearRelease !== gameInfo.year) {
              continue; // Year doesn't match, try next
            }
            matchedGame = game;
            break;
          }
        }
      }

      if (matchedGame) {
        foundGames.push(matchedGame);
      } else {
        missingGames.push(gameInfo.name);
      }
    });

    if (missingGames.length > 0) {
      console.warn(`⚠️ Games not found: ${missingGames.join(', ')}`);
    }

    console.log(`✅ Found ${foundGames.length} out of ${gamesToFind.length} most played games (using single batch query)`);

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
