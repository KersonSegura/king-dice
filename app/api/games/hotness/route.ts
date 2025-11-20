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
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    const seenGameIds = new Set<number>();

    // Query games individually with very short timeouts - return quickly
    // Use Promise.allSettled to not wait for slow queries
    const queryPromises = gamesToFind.map(async (gameName, index) => {
      try {
        // Try exact match on nameEn first (simplest query)
        const { data, error } = await executeSupabaseQuery(
          async () => {
            return await supabaseAdmin
              .from('games')
              .select('*')
              .ilike('nameEn', gameName)
              .limit(1)
              .maybeSingle();
          },
          { maxRetries: 0, baseDelay: 100, timeout: 2000 } // Very short timeout, no retries
        );

        if (data && !error) {
          return { index, game: data, name: gameName };
        }

        // Try nameEs if nameEn didn't work
        const { data: dataEs, error: errorEs } = await executeSupabaseQuery(
          async () => {
            return await supabaseAdmin
              .from('games')
              .select('*')
              .ilike('nameEs', gameName)
              .limit(1)
              .maybeSingle();
          },
          { maxRetries: 0, baseDelay: 100, timeout: 2000 }
        );

        if (dataEs && !errorEs) {
          return { index, game: dataEs, name: gameName };
        }

        // Try name field
        const { data: dataName, error: errorName } = await executeSupabaseQuery(
          async () => {
            return await supabaseAdmin
              .from('games')
              .select('*')
              .ilike('name', gameName)
              .limit(1)
              .maybeSingle();
          },
          { maxRetries: 0, baseDelay: 100, timeout: 2000 }
        );

        if (dataName && !errorName) {
          return { index, game: dataName, name: gameName };
        }

        return { index, game: null, name: gameName };
      } catch (error) {
        // Silently fail - just return null
        return { index, game: null, name: gameName };
      }
    });

    // Wait for all queries with a timeout - return whatever we have
    const results = await Promise.allSettled(queryPromises);
    
    // Process results in order
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.game && !seenGameIds.has(result.value.game.id)) {
        foundGames.push(result.value.game);
        seenGameIds.add(result.value.game.id);
      } else if (result.status === 'fulfilled' && !result.value.game) {
        missingGames.push(gamesToFind[idx]);
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
