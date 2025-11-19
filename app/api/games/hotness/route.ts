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
    let allGames: any[] = [];

    // OPTIMIZED: Fetch ALL games once and filter in memory (fastest approach)
    // This avoids hundreds of database queries and timeout issues
    try {
      const { data: fetchedGames, error: fetchError } = await supabaseAdmin
        .from('games')
        .select('*')
        .limit(10000); // Fetch up to 10k games (should cover all games)

      if (fetchError) {
        console.error('❌ Error fetching all games:', fetchError);
        throw fetchError;
      }
      
      allGames = fetchedGames || [];

      // Create a map for fast lookup: lowercase name -> array of games (in case of duplicates)
      const gamesMap = new Map<string, any[]>();
      (allGames || []).forEach((game) => {
        const nameEn = game.nameEn?.toLowerCase()?.trim() || '';
        const nameEs = game.nameEs?.toLowerCase()?.trim() || '';
        const name = game.name?.toLowerCase()?.trim() || '';
        
        // Map all name variations - store arrays to handle duplicates
        if (nameEn) {
          if (!gamesMap.has(nameEn)) gamesMap.set(nameEn, []);
          gamesMap.get(nameEn)!.push(game);
        }
        if (nameEs && nameEs !== nameEn) {
          if (!gamesMap.has(nameEs)) gamesMap.set(nameEs, []);
          gamesMap.get(nameEs)!.push(game);
        }
        if (name && name !== nameEn && name !== nameEs) {
          if (!gamesMap.has(name)) gamesMap.set(name, []);
          gamesMap.get(name)!.push(game);
        }
      });

      // Track which games we've already matched to avoid duplicates
      const matchedGameIds = new Set<number>();
      
      // Match games in the correct order - EXACT MATCHES ONLY
      gamesToFind.forEach((gameName) => {
        const lowerName = gameName.toLowerCase().trim();
        let matchedGame: any = null;
        
        // EXACT MATCH ONLY - check all three name fields
        for (const game of allGames) {
          if (matchedGameIds.has(game.id)) continue; // Skip already matched
          if (!game.id) continue; // Skip games without IDs
          
          const nameEn = (game.nameEn || '').toLowerCase().trim();
          const nameEs = (game.nameEs || '').toLowerCase().trim();
          const name = (game.name || '').toLowerCase().trim();
          
          // EXACT MATCH ONLY - no fuzzy matching, no contains, just exact
          if (nameEn === lowerName || nameEs === lowerName || name === lowerName) {
            matchedGame = game;
            break; // Found exact match, stop searching
          }
        }

        if (matchedGame && matchedGame.id && !matchedGameIds.has(matchedGame.id)) {
          matchedGameIds.add(matchedGame.id);
          foundGames.push(matchedGame);
        } else {
          missingGames.push(gameName);
        }
      });
    } catch (error) {
      console.error('❌ Error in optimized query:', error);
      // Fallback to empty results rather than crashing
    }

    if (missingGames.length > 0) {
      console.warn(`⚠️ Games not found: ${missingGames.join(', ')}`);
    }

    console.log(`✅ Found ${foundGames.length} out of ${gamesToFind.length} hotness games (using single fetch + memory filter)`);
    console.log(`📊 Total games in database:`, allGames?.length || 0);
    console.log(`📊 Games found (first 10):`, foundGames.slice(0, 10).map(g => ({ id: g.id, name: g.nameEn || g.nameEs || g.name })));
    console.log(`📊 All game IDs (${foundGames.length} total):`, foundGames.map(g => g.id));
    console.log(`📊 Games without IDs:`, foundGames.filter(g => !g.id).length);
    console.log(`📊 Missing games (${missingGames.length}):`, missingGames.slice(0, 10));

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
