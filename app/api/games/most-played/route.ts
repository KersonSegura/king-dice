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

    // OPTIMIZED: Use PostgreSQL function with VALUES CTE for efficient matching
    const gamesToFind = topRankedGames.slice(0, limit);
    const gameNames = gamesToFind.map(g => g.name);
    
    console.log(`🔍 Using optimized VALUES CTE query for ${gameNames.length} games`);
    const queryStartTime = Date.now();
    
    let foundGames: any[] = [];
    const missingGames: string[] = [];
    
    try {
      // Call the PostgreSQL function that uses VALUES CTE for efficient matching
      const { data: matchedGames, error: rpcError } = await supabaseAdmin
        .rpc('match_games_by_names', {
          game_names: gameNames
        });

      const queryDuration = Date.now() - queryStartTime;
      console.log(`✅ Matched ${matchedGames?.length || 0} games in ${queryDuration}ms`);

      if (rpcError) {
        // Fallback to old method if function doesn't exist yet
        console.warn('⚠️ RPC function not available, falling back to memory filter:', rpcError.message);
        throw rpcError;
      }
      
      // Sort by match_order to preserve input order, remove match_order from results
      foundGames = (matchedGames || [])
        .sort((a: any, b: any) => (a.match_order || 0) - (b.match_order || 0))
        .map(({ match_order, ...game }: any) => game);
      
      // Track which games were found
      const foundGameNames = new Set(
        foundGames.map((g: any) => {
          const nameEn = (g.nameEn || '').toLowerCase().trim();
          const nameEs = (g.nameEs || '').toLowerCase().trim();
          const name = (g.name || '').toLowerCase().trim();
          return nameEn || nameEs || name;
        })
      );
      
      gameNames.forEach((gameName) => {
        const lowerName = gameName.toLowerCase().trim();
        const nameWithoutApostrophe = lowerName.replace(/'/g, '');
        if (!foundGameNames.has(lowerName) && !foundGameNames.has(nameWithoutApostrophe)) {
          missingGames.push(gameName);
        }
      });
      
    } catch (error) {
      // Fallback to memory-based filtering if RPC fails
      console.warn('⚠️ Falling back to memory-based filtering');
      const queryStartTimeFallback = Date.now();
      
      const { data: fetchedGames, error: fetchError } = await supabaseAdmin
        .from('games')
        .select('id, nameEn, nameEs, name, yearRelease, image, bggRating, bggRanking, bggVotes')
        .limit(10000);

      if (fetchError) {
        const queryDuration = Date.now() - queryStartTimeFallback;
        console.error(`❌ Error fetching games after ${queryDuration}ms:`, fetchError);
        throw fetchError;
      }

      const allGames = fetchedGames || [];
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

      const matchedGameIds = new Set<number>();
      gamesToFind.forEach((gameInfo) => {
        const lowerName = gameInfo.name.toLowerCase().trim();
        let matchedGame = gamesMap.get(lowerName);
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
    }
    
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
