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

    // Helper function to query a single game
    const queryGame = async (gameName: string): Promise<any> => {
      try {
        // Try nameEn first (most common field)
        const { data, error } = await executeSupabaseQuery(
          async () => {
            return await supabaseAdmin
              .from('games')
              .select('*')
              .ilike('nameEn', gameName)
              .limit(1)
              .maybeSingle();
          },
          { maxRetries: 0, baseDelay: 0, timeout: 3000 }
        );

        if (data && !error) return data;

        // Try nameEs
        const { data: dataEs, error: errorEs } = await executeSupabaseQuery(
          async () => {
            return await supabaseAdmin
              .from('games')
              .select('*')
              .ilike('nameEs', gameName)
              .limit(1)
              .maybeSingle();
          },
          { maxRetries: 0, baseDelay: 0, timeout: 3000 }
        );

        if (dataEs && !errorEs) return dataEs;

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
          { maxRetries: 0, baseDelay: 0, timeout: 3000 }
        );

        if (dataName && !errorName) return dataName;
        return null;
      } catch (error) {
        return null;
      }
    };

    // Load first 10 games immediately (prioritize these)
    const first10Games = gamesToFind.slice(0, 10);
    const first10Promises = first10Games.map(async (gameName) => {
      const game = await queryGame(gameName);
      return { gameName, game };
    });

    const first10Results = await Promise.allSettled(first10Promises);
    first10Results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.game && !seenGameIds.has(result.value.game.id)) {
        foundGames.push(result.value.game);
        seenGameIds.add(result.value.game.id);
      } else if (result.status === 'fulfilled' && !result.value.game) {
        missingGames.push(first10Games[idx]);
      }
    });

    // Continue loading the rest in background (games 11+)
    if (gamesToFind.length > 10) {
      const remainingGames = gamesToFind.slice(10);
      // Process remaining games in small batches
      const BATCH_SIZE = 5;
      for (let i = 0; i < remainingGames.length; i += BATCH_SIZE) {
        const batch = remainingGames.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (gameName) => {
          const game = await queryGame(gameName);
          return { gameName, game };
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, batchIdx) => {
          if (result.status === 'fulfilled' && result.value.game && !seenGameIds.has(result.value.game.id)) {
            foundGames.push(result.value.game);
            seenGameIds.add(result.value.game.id);
          } else if (result.status === 'fulfilled' && !result.value.game) {
            missingGames.push(batch[batchIdx]);
          }
        });

        // Small delay between batches
        if (i + BATCH_SIZE < remainingGames.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
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
