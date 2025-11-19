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

    // OPTIMIZED: Fetch ALL games once and filter in memory (fastest, most reliable)
    const gamesToFind = hotnessGames.slice(0, limit);
    let allGames: any[] = [];
    
    console.log(`🔍 Fetching all games from database (will filter ${gamesToFind.length} games in memory)`);
    const queryStartTime = Date.now();
    
    try {
      // Select only the columns we need - much faster than SELECT *
      const { data: fetchedGames, error: fetchError } = await supabaseAdmin
        .from('games')
        .select('id, nameEn, nameEs, name, yearRelease, image, bggRating, bggRanking, bggVotes')
        .limit(5000); // Reduced limit - should be enough

      const queryDuration = Date.now() - queryStartTime;
      console.log(`✅ Fetched ${fetchedGames?.length || 0} games in ${queryDuration}ms`);

      if (fetchError) {
        console.error('❌ Error fetching all games:', fetchError);
        console.error('❌ Error details:', JSON.stringify(fetchError, null, 2));
        throw fetchError;
      }
      
      allGames = fetchedGames || [];
    } catch (error) {
      const queryDuration = Date.now() - queryStartTime;
      console.error(`❌ Error fetching games after ${queryDuration}ms:`, error);
      console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
      throw error;
    }
    
    const matchedGames = allGames;

    // Create a map: lowercase name -> game
    const gamesMap = new Map<string, any>();
    (matchedGames || []).forEach((game) => {
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

    gamesToFind.forEach((gameName) => {
      const lowerName = gameName.toLowerCase().trim();
      let matchedGame = gamesMap.get(lowerName);
      
      // If not found, try without apostrophes (handles "Feya's" vs "Feyas")
      if (!matchedGame) {
        const nameWithoutApostrophe = lowerName.replace(/'/g, '');
        matchedGame = gamesMap.get(nameWithoutApostrophe);
      }
      
      if (matchedGame && matchedGame.id && !matchedGameIds.has(matchedGame.id)) {
        matchedGameIds.add(matchedGame.id);
        foundGames.push(matchedGame);
      } else {
        missingGames.push(gameName);
        // Debug missing games
        if (missingGames.length <= 3) {
          console.log(`   🔍 Looking for: "${gameName}" (lowercase: "${lowerName}")`);
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

    console.log(`✅ Found ${foundGames.length} out of ${gamesToFind.length} hotness games`);
    if (missingGames.length > 0) {
      console.log(`⚠️ Missing games (${missingGames.length}):`, missingGames.slice(0, 10));
    }

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
