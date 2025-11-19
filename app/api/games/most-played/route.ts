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

    // OPTIMIZED: Fetch ALL games once and filter in memory (fastest, most reliable)
    const gamesToFind = topRankedGames.slice(0, limit);
    let allGames: any[] = [];
    
    console.log(`🔍 Fetching all games from database (will filter ${gamesToFind.length} games in memory)`);
    const queryStartTime = Date.now();
    
    try {
      const { data: fetchedGames, error: fetchError } = await supabaseAdmin
        .from('games')
        .select('*')
        .limit(10000); // Fetch up to 10k games

      const queryDuration = Date.now() - queryStartTime;
      console.log(`✅ Fetched ${fetchedGames?.length || 0} games in ${queryDuration}ms`);

      if (fetchError) {
        console.error('❌ Error fetching all games:', fetchError);
        throw fetchError;
      }
      
      allGames = fetchedGames || [];
    } catch (error) {
      console.error('❌ Error fetching games:', error);
      throw error;
    }
    
    const matchedGames = allGames;

    // Create a map: lowercase name -> game
    const gamesMap = new Map<string, any>();
    matchedGames.forEach((game) => {
      if (!game.id) return;
      const nameEn = (game.nameEn || '').toLowerCase().trim();
      const nameEs = (game.nameEs || '').toLowerCase().trim();
      const name = (game.name || '').toLowerCase().trim();
      
      if (nameEn) gamesMap.set(nameEn, game);
      if (nameEs) gamesMap.set(nameEs, game);
      if (name) gamesMap.set(name, game);
    });

    // Match games in the correct order from hardcoded list
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    const matchedGameIds = new Set<number>();

    gamesToFind.forEach((gameInfo) => {
      const lowerName = gameInfo.name.toLowerCase().trim();
      const matchedGame = gamesMap.get(lowerName);
      
      // No year filtering - names are unique
      if (matchedGame && matchedGame.id && !matchedGameIds.has(matchedGame.id)) {
        matchedGameIds.add(matchedGame.id);
        foundGames.push(matchedGame);
      } else {
        missingGames.push(gameInfo.name);
        // Debug missing games
        if (missingGames.length <= 3) {
          console.log(`   🔍 Looking for: "${gameInfo.name}" (lowercase: "${lowerName}")`);
          const similarKeys = Array.from(gamesMap.keys()).filter(k => 
            k.includes(lowerName.substring(0, Math.min(5, lowerName.length))) || 
            lowerName.includes(k.substring(0, Math.min(5, k.length)))
          ).slice(0, 3);
          if (similarKeys.length > 0) {
            console.log(`      Similar names found:`, similarKeys);
          }
        }
      }
    });

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
