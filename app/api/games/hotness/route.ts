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

    // OPTIMIZED: Use PostgreSQL function with VALUES CTE for efficient matching
    const gamesToFind = hotnessGames.slice(0, limit);
    
    console.log(`🔍 Using optimized VALUES CTE query for ${gamesToFind.length} games`);
    const queryStartTime = Date.now();
    
    let foundGames: any[] = [];
    const missingGames: string[] = [];
    
    try {
      // Call the PostgreSQL function that uses VALUES CTE for efficient matching
      const { data: matchedGames, error: rpcError } = await supabaseAdmin
        .rpc('match_games_by_names', {
          game_names: gamesToFind
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
      
      gamesToFind.forEach((gameName) => {
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
        const errorMessage = fetchError.message || String(fetchError);
        
        // Check if it's a Supabase health issue (522 timeout, connection issues)
        if (errorMessage.includes('522') || 
            errorMessage.includes('Connection timed out') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('unhealthy')) {
          console.error(`❌ Supabase health issue detected after ${queryDuration}ms:`, errorMessage);
          // Return empty results gracefully instead of crashing
          return NextResponse.json({ 
            games: [],
            category: 'hotness',
            total: 0,
            description: 'The hottest games today according to BoardGameGeek',
            source: 'BGG Hotness List',
            error: 'Database temporarily unavailable. Please try again later.'
          }, { 
            status: 503, // Service Unavailable
            headers: {
              'Cache-Control': 'no-cache',
              'Retry-After': '60' // Suggest retry after 60 seconds
            }
          });
        }
        
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
      gamesToFind.forEach((gameName) => {
        const lowerName = gameName.toLowerCase().trim();
        let matchedGame = gamesMap.get(lowerName);
        if (!matchedGame) {
          const nameWithoutApostrophe = lowerName.replace(/'/g, '');
          matchedGame = gamesMap.get(nameWithoutApostrophe);
        }
        if (matchedGame && matchedGame.id && !matchedGameIds.has(matchedGame.id)) {
          matchedGameIds.add(matchedGame.id);
          foundGames.push(matchedGame);
        } else {
          missingGames.push(gameName);
        }
      });
    }
    
    const foundGamesFinal = foundGames;

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error getting hotness games:', error);
    console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Error message:', errorMessage);
    
    // Check if it's a Supabase health issue
    if (errorMessage.includes('522') || 
        errorMessage.includes('Connection timed out') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('unhealthy') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503')) {
      return NextResponse.json(
        { 
          games: [],
          category: 'hotness',
          total: 0,
          error: 'Database temporarily unavailable. Please try again later.',
          details: 'Supabase connection issue detected'
        },
        { 
          status: 503, // Service Unavailable
          headers: {
            'Cache-Control': 'no-cache',
            'Retry-After': '60'
          }
        }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
