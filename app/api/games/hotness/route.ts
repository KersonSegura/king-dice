import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// The top 50 hottest games from BGG (hardcoded list)
const hotnessGames = [
  'Covenant',
  'Recall',
  'Deckers',
  'Tax the Rich',
  'Children of the Colossi',
  'Kuldhara',
  'Orloj: The Prague Astronomical Clock',
  'The Hobbit: There and Back Again',
  'SETI: Space Agencies',
  'Feya\'s Swamp',
  'The Lord of the Rings: Duel for Middle-Earth – Allies',
  'SETI: Search for Extraterrestrial Intelligence',
  'Speakeasy',
  'The Old King\'s Crown',
  'The Lord of the Rings: Fate of the Fellowship',
  'Sanctuary',
  'Bohemians',
  'Tag Team',
  'Vantage',
  'Gelati',
  'The Druids of Edora',
  'Take Time',
  'Ayar: Children of the Sun',
  'Ark Nova',
  'Galileo\'s Truth',
  'The Lord of the Rings: Duel for Middle-earth',
  '1ers Contacts',
  'Wispwood',
  'Emberheart',
  'Lost Ruins of Arnak: Twisted Paths',
  'ANTS',
  'Lost Ruins of Arnak',
  'Brass: Birmingham',
  'Coming of Age',
  'Galactic Cruise',
  'Forestry',
  'Federation: Piracy',
  'Nature',
  'Echoes of Time',
  'Arcs',
  'The Elder Scrolls: Betrayal of the Second Era',
  'Bomb Busters',
  'Terraforming Mars',
  'Kingdom Crossing',
  'Castle Combo',
  'Luthier',
  'Slay the Spire: The Board Game',
  'Origin Story',
  'Harmonies',
  'Tainted Grail: The Fall of Avalon'
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log(`🔥 Getting HOTNESS GAMES from hardcoded list (limit: ${limit})`);

    const gamesToFind = hotnessGames.slice(0, limit);
    const foundGamesMap = new Map<number, any>();
    const missingGames: string[] = [];

    // Step 1: Try to fetch all games in parallel using batch queries
    // Build OR conditions for all game names (escape special characters)
    const escapeName = (name: string) => name.replace(/'/g, "''");
    const nameEnConditions = gamesToFind.map(name => `nameEn.eq.${escapeName(name)}`).join(',');
    const nameEsConditions = gamesToFind.map(name => `nameEs.eq.${escapeName(name)}`).join(',');
    const nameConditions = gamesToFind.map(name => `name.eq.${escapeName(name)}`).join(',');

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
      batchSuccess = false;
    }

    // Step 2: Find which games are still missing
    const foundGameNames = new Set(
      Array.from(foundGamesMap.values()).flatMap(game => [
        game.nameEn?.toLowerCase(),
        game.nameEs?.toLowerCase(),
        game.name?.toLowerCase()
      ].filter(Boolean))
    );

    const stillMissing = gamesToFind.filter(gameName => {
      const lowerName = gameName.toLowerCase();
      return !foundGameNames.has(lowerName);
    });

    // Step 3: For missing games, try case-insensitive and partial matches in parallel
    if (stillMissing.length > 0) {
      const missingQueries = stillMissing.map(gameName => 
        Promise.all([
          supabaseAdmin.from('games').select('*').ilike('nameEn', gameName).limit(1),
          supabaseAdmin.from('games').select('*').ilike('nameEs', gameName).limit(1),
          supabaseAdmin.from('games').select('*').ilike('name', gameName).limit(1),
          supabaseAdmin.from('games').select('*').or(`nameEn.ilike.%${gameName}%,nameEs.ilike.%${gameName}%,name.ilike.%${gameName}%`).limit(1)
        ]).then(([r1, r2, r3, r4]) => {
          const results = [r1.data?.[0], r2.data?.[0], r3.data?.[0], r4.data?.[0]].filter(Boolean);
          return { gameName, result: results[0] || null };
        })
      );

      const missingResults = await Promise.all(missingQueries);
      
      missingResults.forEach(({ gameName, result }) => {
        if (result && !foundGamesMap.has(result.id)) {
          foundGamesMap.set(result.id, result);
        } else if (!result) {
          missingGames.push(gameName);
        }
      });
    }

    // Step 4: Build final array in the correct order
    const foundGames: any[] = [];
    for (const gameName of gamesToFind) {
      // Find the game that matches this name
      const matchingGame = Array.from(foundGamesMap.values()).find(game => {
        const lowerName = gameName.toLowerCase();
        return game.nameEn?.toLowerCase() === lowerName ||
               game.nameEs?.toLowerCase() === lowerName ||
               game.name?.toLowerCase() === lowerName;
      });

      if (matchingGame) {
        foundGames.push(matchingGame);
        foundGamesMap.delete(matchingGame.id); // Remove to avoid duplicates
      }
    }

    if (missingGames.length > 0) {
      console.warn(`⚠️ Games not found: ${missingGames.join(', ')}`);
    }

    console.log(`✅ Found ${foundGames.length} out of ${gamesToFind.length} hotness games`);

    return NextResponse.json({ 
      games: foundGames,
      category: 'hotness',
      total: foundGames.length,
      description: 'The hottest games today according to BoardGameGeek',
      source: 'BGG Hotness List'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('❌ Error getting hotness games:', error);
    console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
