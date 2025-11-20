import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';
import { normalizeGameName } from '@/utils/normalizeGameName';

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

    console.log(`🔥 Getting HOTNESS GAMES (limit: ${limit})`);

    // Simple approach: Fetch games and filter in memory (like /api/games does)
    const gamesToFind = hotnessGames.slice(0, limit);
    const normalizedNameValues = new Set(gamesToFind.map(name => normalizeGameName(name)));
    
    // Simple query like /api/games - just get games, we'll filter in memory
    const { data: allGames, error } = await executeSupabaseQuery(
      async () => {
        return await supabaseAdmin
          .from('games')
          .select('id, bggId, best_name_norm, name, nameEn, nameEs, yearRelease, minPlayers, maxPlayers, durationMinutes, imageUrl, thumbnailUrl, image, userRating, userVotes, isExpansion, ranking, bggRanking, bggRating, bggVotes')
          .limit(1000); // Get a reasonable number, filter in memory
      },
      { maxRetries: 1, baseDelay: 100, timeout: 8000 }
    );

    // Filter in memory - match by best_name_norm
    const gamesMap = new Map<string, any>();
    (allGames || []).forEach((game: any) => {
      const normName = game.best_name_norm || normalizeGameName(game.nameEn || game.nameEs || game.name || '');
      if (normalizedNameValues.has(normName)) {
        gamesMap.set(normName, game);
      }
    });

    // Build array in original order
    const foundGames: any[] = [];
    gamesToFind.forEach((name, index) => {
      const normName = normalizeGameName(name);
      const game = gamesMap.get(normName);
      if (game) {
        foundGames.push({
          ...game,
          name: game.name || game.nameEn || 'Unknown Game',
          year: game.yearRelease || game.year,
          minPlayTime: game.durationMinutes,
          maxPlayTime: game.durationMinutes,
          image: game.image || game.imageUrl || game.thumbnailUrl,
          averageRating: game.userRating,
          numVotes: game.userVotes,
          rank: index + 1
        });
      }
    });

    if (error) {
      console.error('❌ Error querying games:', error);
    }

    console.log(`✅ Found ${foundGames.length} hotness games`);

    return NextResponse.json({ 
      games: foundGames,
      category: 'hotness',
      total: foundGames.length,
      description: 'The hottest games today according to BoardGameGeek',
      source: 'BGG Hotness List'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60', // Edge cache with stale-while-revalidate
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('❌ Error getting hotness games:', error);
    
    // Return empty array instead of error to prevent page crashes
    return NextResponse.json({ 
      games: [],
      category: 'hotness',
      total: 0,
      description: 'The hottest games today according to BoardGameGeek',
      source: 'BGG Hotness List'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' // Shorter cache on error
      }
    });
  }
}
