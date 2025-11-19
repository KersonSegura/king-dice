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

    // OPTIMIZED: Fetch all games once and filter in memory (single query, fast)
    const gamesToFind = topRankedGames.slice(0, limit);
    
    console.log(`🔍 Fetching all games from database (will filter ${gamesToFind.length} games in memory)`);
    const queryStartTime = Date.now();
    
    let allGames: any[] = [];
    try {
      // Single query - fetch all games with only needed columns
      const { data: fetchedGames, error: fetchError } = await supabaseAdmin
        .from('games')
        .select('id, nameEn, nameEs, name, yearRelease, image, bggRating, bggRanking, bggVotes')
        .limit(10000); // Reasonable limit

      const queryDuration = Date.now() - queryStartTime;
      console.log(`✅ Fetched ${fetchedGames?.length || 0} games in ${queryDuration}ms`);

      if (fetchError) {
        console.error('❌ Error fetching games:', fetchError);
        throw fetchError;
      }
      
      allGames = fetchedGames || [];
    } catch (error) {
      const queryDuration = Date.now() - queryStartTime;
      console.error(`❌ Error fetching games after ${queryDuration}ms:`, error);
      throw error;
    }

    // Create a map for fast lookup: lowercase name -> game
    const gamesMap = new Map<string, any>();
    allGames.forEach((game) => {
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
      let matchedGame = gamesMap.get(lowerName);
      
      // If not found, try without apostrophes
      if (!matchedGame) {
        const nameWithoutApostrophe = lowerName.replace(/'/g, '');
        matchedGame = gamesMap.get(nameWithoutApostrophe);
      }
      
      if (matchedGame && matchedGame.id && !matchedGameIds.has(matchedGame.id)) {
        matchedGameIds.add(matchedGame.id);
        foundGames.push(matchedGame);
      } else {
        missingGames.push(gameInfo.name);
      }
    });
    
    const foundGamesFinal = foundGames;

    if (missingGames.length > 0) {
      console.warn(`⚠️ Games not found (${missingGames.length}):`, missingGames.join(', '));
    }

    return NextResponse.json({ 
      games: foundGamesFinal,
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
