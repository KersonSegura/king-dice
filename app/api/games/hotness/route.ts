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

    // Process queries in smaller batches to avoid overwhelming the database
    // 15 games at a time = manageable parallel load
    const BATCH_SIZE = 15;
    
    for (let i = 0; i < gamesToFind.length; i += BATCH_SIZE) {
      const batch = gamesToFind.slice(i, i + BATCH_SIZE);
      
      const queryPromises = batch.map(async (gameName, batchIndex) => {
        const globalIndex = i + batchIndex;
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
            { maxRetries: 1, baseDelay: 200, timeout: 3000 }
          );

          if (data && !error) {
            return { index: globalIndex, game: data, name: gameName };
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
            { maxRetries: 1, baseDelay: 200, timeout: 3000 }
          );

          if (dataEs && !errorEs) {
            return { index: globalIndex, game: dataEs, name: gameName };
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
            { maxRetries: 1, baseDelay: 200, timeout: 3000 }
          );

          if (dataName && !errorName) {
            return { index: globalIndex, game: dataName, name: gameName };
          }

          return { index: globalIndex, game: null, name: gameName };
        } catch (error) {
          return { index: globalIndex, game: null, name: gameName };
        }
      });

      // Wait for this batch to complete
      const batchResults = await Promise.allSettled(queryPromises);
      
      // Process batch results
      batchResults.forEach((result, batchIdx) => {
        if (result.status === 'fulfilled') {
          const value = result.value as { index: number; game: any; name: string };
          if (value.game && !seenGameIds.has(value.game.id)) {
            foundGames.push(value.game);
            seenGameIds.add(value.game.id);
          } else if (!value.game) {
            missingGames.push(value.name);
          }
        }
      });

      // Small delay between batches to prevent overwhelming the database
      if (i + BATCH_SIZE < gamesToFind.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
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
