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

    // OPTIMIZED: Fetch ALL games once and filter in memory (fastest approach)
    // This avoids hundreds of database queries and timeout issues
    try {
      const { data: allGames, error: fetchError } = await supabaseAdmin
        .from('games')
        .select('*')
        .limit(10000); // Fetch up to 10k games (should cover all games)

      if (fetchError) {
        console.error('❌ Error fetching all games:', fetchError);
        throw fetchError;
      }

      // Create a map for fast lookup: lowercase name -> array of games (in case of duplicates)
      const gamesMap = new Map<string, any[]>();
      (allGames || []).forEach((game) => {
        const nameEn = game.nameEn?.toLowerCase()?.trim() || '';
        const nameEs = game.nameEs?.toLowerCase()?.trim() || '';
        const name = game.name?.toLowerCase()?.trim() || '';
        
        // Map all name variations - store arrays to handle duplicates
        if (nameEn) {
          if (!gamesMap.has(nameEn)) gamesMap.set(nameEn, []);
          gamesMap.get(nameEn)!.push(game);
        }
        if (nameEs && nameEs !== nameEn) {
          if (!gamesMap.has(nameEs)) gamesMap.set(nameEs, []);
          gamesMap.get(nameEs)!.push(game);
        }
        if (name && name !== nameEn && name !== nameEs) {
          if (!gamesMap.has(name)) gamesMap.set(name, []);
          gamesMap.get(name)!.push(game);
        }
      });

      // Track which games we've already matched to avoid duplicates
      const matchedGameIds = new Set<number>();
      
      // Match games in the correct order, respecting year if provided
      gamesToFind.forEach((gameInfo) => {
        const lowerName = gameInfo.name.toLowerCase().trim();
        let matchedGame: any = null;
        
        // Strategy 1: Try exact match first (case-insensitive)
        matchedGame = gamesMap.get(lowerName)?.find((g: any) => {
          if (matchedGameIds.has(g.id)) return false;
          if (gameInfo.year && g.yearRelease !== gameInfo.year) return false;
          return true;
        });
        
        // Strategy 2: If no exact match, search through all games for best match
        if (!matchedGame) {
          let bestMatch: any = null;
          let bestScore = 0;
          
          for (const game of (allGames || [])) {
            if (matchedGameIds.has(game.id)) continue; // Skip already matched
            if (gameInfo.year && game.yearRelease !== gameInfo.year) continue; // Year must match
            
            const nameEn = (game.nameEn || '').toLowerCase().trim();
            const nameEs = (game.nameEs || '').toLowerCase().trim();
            const name = (game.name || '').toLowerCase().trim();
            
            // Calculate similarity score
            let score = 0;
            
            // Exact match = highest score
            if (nameEn === lowerName || nameEs === lowerName || name === lowerName) {
              score = 1000;
            }
            // Contains full search term = high score (be more lenient)
            else if (nameEn.includes(lowerName) || nameEs.includes(lowerName) || name.includes(lowerName)) {
              // Prefer matches where the length is similar, but accept up to 50 char difference
              const lengthDiff = Math.abs((nameEn.length || nameEs.length || name.length) - lowerName.length);
              score = Math.max(1, 100 - lengthDiff); // Minimum score of 1
            }
            // Search term contains game name (handles "The X" vs "X")
            else if (lowerName.includes(nameEn) || lowerName.includes(nameEs) || lowerName.includes(name)) {
              const lengthDiff = Math.abs((nameEn.length || nameEs.length || name.length) - lowerName.length);
              score = Math.max(1, 50 - lengthDiff); // Minimum score of 1
            }
            // Also try fuzzy matching - check if names share significant words
            else {
              const searchWords = lowerName.split(/\s+/).filter(w => w.length > 2); // Words longer than 2 chars
              const dbWords = (nameEn || nameEs || name).split(/\s+/).filter(w => w.length > 2);
              
              if (searchWords.length > 0 && dbWords.length > 0) {
                const matchingWords = searchWords.filter(sw => dbWords.some(dw => dw.includes(sw) || sw.includes(dw)));
                if (matchingWords.length >= Math.min(2, searchWords.length)) {
                  // If at least 2 words match (or all words if fewer than 2), give it a low score
                  score = 10;
                }
              }
            }
            
            if (score > bestScore && score > 0) {
              bestScore = score;
              bestMatch = game;
            }
          }
          
          matchedGame = bestMatch;
        }

        if (matchedGame && matchedGame.id && !matchedGameIds.has(matchedGame.id)) {
          matchedGameIds.add(matchedGame.id);
          foundGames.push(matchedGame);
        } else {
          missingGames.push(gameInfo.name);
        }
      });
    } catch (error) {
      console.error('❌ Error in optimized query:', error);
      // Fallback to empty results rather than crashing
    }

    if (missingGames.length > 0) {
      console.warn(`⚠️ Games not found: ${missingGames.join(', ')}`);
    }

    console.log(`✅ Found ${foundGames.length} out of ${gamesToFind.length} most played games (using single fetch + memory filter)`);

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
