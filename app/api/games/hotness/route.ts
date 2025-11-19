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
    const foundGames: any[] = [];
    const missingGames: string[] = [];

    // OPTIMIZED: Batch queries in chunks of 10 to avoid Supabase OR clause limits
    // This is still much faster than individual queries (5 batches vs 50+ queries)
    const BATCH_SIZE = 10;
    const allMatches: any[] = [];
    
    for (let i = 0; i < gamesToFind.length; i += BATCH_SIZE) {
      const batch = gamesToFind.slice(i, i + BATCH_SIZE);
      const orConditions: string[] = [];
      
      batch.forEach((gameName) => {
        // Escape single quotes in game names for SQL
        const escapedName = gameName.replace(/'/g, "''");
        orConditions.push(`nameEn.ilike.${escapedName}`);
        orConditions.push(`nameEs.ilike.${escapedName}`);
        orConditions.push(`name.ilike.${escapedName}`);
      });

      try {
        const { data: batchMatches, error: batchError } = await supabaseAdmin
          .from('games')
          .select('*')
          .or(orConditions.join(','))
          .limit(BATCH_SIZE * 3);

        if (batchError) {
          console.error(`❌ Batch query error for batch ${i / BATCH_SIZE + 1}:`, batchError);
          // Continue with next batch instead of failing completely
          continue;
        }

        if (batchMatches) {
          allMatches.push(...batchMatches);
        }
      } catch (error) {
        console.error(`❌ Error in batch ${i / BATCH_SIZE + 1}:`, error);
        // Continue with next batch
      }
    }

    // Create a map for quick lookup: lowercase name -> game
    const gamesMap = new Map<string, any>();
    allMatches.forEach((game) => {
      const nameEn = game.nameEn?.toLowerCase() || '';
      const nameEs = game.nameEs?.toLowerCase() || '';
      const name = game.name?.toLowerCase() || '';
      
      if (nameEn) gamesMap.set(nameEn, game);
      if (nameEs) gamesMap.set(nameEs, game);
      if (name) gamesMap.set(name, game);
    });

    // Match games in the correct order
    gamesToFind.forEach((gameName) => {
      const lowerName = gameName.toLowerCase();
      
      // Try exact match first
      let matchedGame = gamesMap.get(lowerName);
      
      // If no exact match, try partial match
      if (!matchedGame) {
        for (const [key, game] of gamesMap.entries()) {
          if (key.includes(lowerName) || lowerName.includes(key)) {
            matchedGame = game;
            break;
          }
        }
      }

      if (matchedGame) {
        foundGames.push(matchedGame);
      } else {
        missingGames.push(gameName);
      }
    });

    if (missingGames.length > 0) {
      console.warn(`⚠️ Games not found: ${missingGames.join(', ')}`);
    }

    console.log(`✅ Found ${foundGames.length} out of ${gamesToFind.length} hotness games (using single batch query)`);

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
