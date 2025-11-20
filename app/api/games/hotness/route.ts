import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';

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
    
    // Use a single query to fetch all games at once using ILIKE with OR conditions
    // Build a single query that searches all game names efficiently
    const nameConditions = gamesToFind.map(name => {
      // Escape single quotes in game names
      const escapedName = name.replace(/'/g, "''");
      return `nameEn.ilike.*${escapedName}*,nameEs.ilike.*${escapedName}*,name.ilike.*${escapedName}*`;
    }).join(',');

    const { data: allGames, error: queryError } = await executeSupabaseQuery(
      async () => {
        return await supabaseAdmin
          .from('games')
          .select('*')
          .or(nameConditions)
          .limit(limit * 2); // Get more than needed in case of duplicates
      },
      { maxRetries: 2, baseDelay: 400, timeout: 10000 }
    );

    if (queryError) {
      console.error('❌ Error querying games:', queryError);
      // Return empty array instead of failing completely
      return NextResponse.json({ 
        games: [],
        category: 'hotness',
        total: 0,
        description: 'The hottest games today according to BoardGameGeek',
        source: 'BGG Hotness List'
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

    // Match games in the requested order
    gamesToFind.forEach((gameName) => {
      const normalizedName = gameName.toLowerCase();
      const matchedGame = gamesMap.get(normalizedName);
      
      if (matchedGame) {
        // Check if we already added this game
        if (!foundGames.find(g => g.id === matchedGame.id)) {
          foundGames.push(matchedGame);
        }
      } else {
        missingGames.push(gameName);
      }
    });

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
    
    // Return empty array instead of error to prevent page crashes
    return NextResponse.json({ 
      games: [],
      category: 'hotness',
      total: 0,
      description: 'The hottest games today according to BoardGameGeek',
      source: 'BGG Hotness List'
    });
  }
}
