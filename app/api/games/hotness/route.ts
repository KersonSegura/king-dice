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

    // OPTIMIZED: Query each game individually - avoids OR clause timeouts
    const gamesToFind = hotnessGames.slice(0, limit);
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    
    console.log(`🔍 Fetching ${gamesToFind.length} specific games individually`);
    const queryStartTime = Date.now();
    
    // Query games one at a time to avoid Supabase timeouts
    for (let i = 0; i < gamesToFind.length; i++) {
      const gameName = gamesToFind[i];
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
      console.warn(`⚠️ Games not found (${missingGames.length}):`, missingGames.join(', '));
    }

    return NextResponse.json({ 
      games: foundGamesFinal,
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
