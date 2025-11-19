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

    // OPTIMIZED: Query each game individually - avoids OR clause timeouts
    const gamesToFind = topRankedGames.slice(0, limit);
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    
    console.log(`🔍 Fetching ${gamesToFind.length} specific games individually`);
    const queryStartTime = Date.now();
    
    // Query games one at a time to avoid Supabase timeouts
    for (let i = 0; i < gamesToFind.length; i++) {
      const gameInfo = gamesToFind[i];
      const gameName = gameInfo.name;
      const lowerName = gameName.toLowerCase().trim();
      
      try {
        // Query for this specific game name
        const { data: games, error } = await supabaseAdmin
          .from('games')
          .select('id, nameEn, nameEs, name, yearRelease, image, bggRating, bggRanking, bggVotes')
          .or(`nameEn.ilike.${gameName},nameEs.ilike.${gameName},name.ilike.${gameName}`)
          .limit(1);
        
        if (error) {
          console.error(`❌ Error fetching game ${i + 1} "${gameName}":`, error.message);
          missingGames.push(gameName);
          continue;
        }
        
        if (games && games.length > 0) {
          // Check for exact match (case-insensitive)
          const matchedGame = games.find((g: any) => {
            const nameEn = (g.nameEn || '').toLowerCase().trim();
            const nameEs = (g.nameEs || '').toLowerCase().trim();
            const name = (g.name || '').toLowerCase().trim();
            return nameEn === lowerName || nameEs === lowerName || name === lowerName;
          });
          
          if (matchedGame) {
            foundGames.push(matchedGame);
            console.log(`✅ Found game ${i + 1}/${gamesToFind.length}: ${gameName}`);
          } else {
            missingGames.push(gameName);
            console.log(`⚠️ Game ${i + 1}/${gamesToFind.length} "${gameName}" - no exact match found`);
          }
        } else {
          missingGames.push(gameName);
          console.log(`⚠️ Game ${i + 1}/${gamesToFind.length} "${gameName}" - not found in database`);
        }
      } catch (error) {
        console.error(`❌ Exception fetching game ${i + 1} "${gameName}":`, error);
        missingGames.push(gameName);
      }
    }
    
    const queryDuration = Date.now() - queryStartTime;
    console.log(`✅ Finished fetching ${foundGames.length}/${gamesToFind.length} games in ${queryDuration}ms`);
    
    const matchedGames = foundGames;

    // Games are already matched and in correct order from the loop above
    // Just ensure no duplicates
    const uniqueGames: any[] = [];
    const seenIds = new Set<number>();
    foundGames.forEach((game) => {
      if (game.id && !seenIds.has(game.id)) {
        seenIds.add(game.id);
        uniqueGames.push(game);
      }
    });
    
    const foundGamesFinal = uniqueGames;

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
