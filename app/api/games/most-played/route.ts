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
    const foundGamesMap = new Map<number, any>();
    const missingGames: string[] = [];

    // Step 1: Try to fetch all games in parallel using batch queries
    // Build OR conditions for all game names (escape special characters)
    const escapeName = (name: string) => name.replace(/'/g, "''");
    const nameEnConditions = gamesToFind.map(g => `nameEn.eq.${escapeName(g.name)}`).join(',');
    const nameEsConditions = gamesToFind.map(g => `nameEs.eq.${escapeName(g.name)}`).join(',');
    const nameConditions = gamesToFind.map(g => `name.eq.${escapeName(g.name)}`).join(',');

    // Execute batch queries in parallel (with error handling)
    try {
      const [nameEnResults, nameEsResults, nameResults] = await Promise.all([
        supabaseAdmin.from('games').select('*').or(nameEnConditions),
        supabaseAdmin.from('games').select('*').or(nameEsConditions),
        supabaseAdmin.from('games').select('*').or(nameConditions)
      ]);

      // Combine results and deduplicate by ID
      [nameEnResults.data, nameEsResults.data, nameResults.data].forEach((games: any[]) => {
        if (games) {
          games.forEach((game: any) => {
            if (!foundGamesMap.has(game.id)) {
              foundGamesMap.set(game.id, game);
            }
          });
        }
      });
    } catch (error) {
      console.warn('Batch query failed, will use individual queries:', error);
    }

    // Step 2: Find which games are still missing
    const foundGameNames = new Set(
      Array.from(foundGamesMap.values()).flatMap(game => [
        game.nameEn?.toLowerCase(),
        game.nameEs?.toLowerCase(),
        game.name?.toLowerCase()
      ].filter(Boolean))
    );

    const stillMissing = gamesToFind.filter(gameInfo => {
      const lowerName = gameInfo.name.toLowerCase();
      return !foundGameNames.has(lowerName);
    });

    // Step 3: For missing games, try case-insensitive and partial matches in parallel
    if (stillMissing.length > 0) {
      const missingQueries = stillMissing.map(gameInfo => 
        Promise.all([
          supabaseAdmin.from('games').select('*').ilike('nameEn', gameInfo.name).limit(1),
          supabaseAdmin.from('games').select('*').ilike('nameEs', gameInfo.name).limit(1),
          supabaseAdmin.from('games').select('*').ilike('name', gameInfo.name).limit(1),
          (() => {
            let query = supabaseAdmin.from('games').select('*').or(`nameEn.ilike.%${gameInfo.name}%,nameEs.ilike.%${gameInfo.name}%,name.ilike.%${gameInfo.name}%`);
            if (gameInfo.year) {
              query = query.eq('yearRelease', gameInfo.year);
            }
            return query.limit(1);
          })()
        ]).then(([r1, r2, r3, r4]) => {
          const results = [r1.data?.[0], r2.data?.[0], r3.data?.[0], r4.data?.[0]].filter(Boolean);
          return { gameInfo, result: results[0] || null };
        })
      );

      const missingResults = await Promise.all(missingQueries);
      
      missingResults.forEach(({ gameInfo, result }) => {
        if (result && !foundGamesMap.has(result.id)) {
          foundGamesMap.set(result.id, result);
        } else if (!result) {
          missingGames.push(gameInfo.name);
        }
      });
    }

    // Step 4: Verify year matches and find correct games
    const foundGames: any[] = [];
    for (const gameInfo of gamesToFind) {
      // Find the game that matches this name
      let matchingGame = Array.from(foundGamesMap.values()).find(game => {
        const lowerName = gameInfo.name.toLowerCase();
        return game.nameEn?.toLowerCase() === lowerName ||
               game.nameEs?.toLowerCase() === lowerName ||
               game.name?.toLowerCase() === lowerName;
      });

      // If year is provided, prefer a game with matching year
      if (matchingGame && gameInfo.year) {
        if (matchingGame.yearRelease !== gameInfo.year && matchingGame.year !== gameInfo.year) {
          // Year doesn't match, try to find another match with the correct year
          const yearMatched = Array.from(foundGamesMap.values()).find(game => {
            const lowerName = gameInfo.name.toLowerCase();
            const nameMatches = game.nameEn?.toLowerCase() === lowerName ||
                               game.nameEs?.toLowerCase() === lowerName ||
                               game.name?.toLowerCase() === lowerName;
            const yearMatches = game.yearRelease === gameInfo.year || game.year === gameInfo.year;
            return nameMatches && yearMatches;
          });
          
          if (yearMatched) {
            matchingGame = yearMatched;
          }
        }
      }

      if (matchingGame) {
        foundGames.push(matchingGame);
        foundGamesMap.delete(matchingGame.id); // Remove to avoid duplicates
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
