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

    // Query games in batches to avoid connection exhaustion
    // Based on Supabase connection management best practices
    // Process in batches of 10 to prevent overwhelming PostgREST
    const BATCH_SIZE = 10;
    const results: Array<{ gameName: string; game: any }> = [];
    
    for (let i = 0; i < gamesToFind.length; i += BATCH_SIZE) {
      const batch = gamesToFind.slice(i, i + BATCH_SIZE);
      
      const batchQueries = batch.map(async (gameName) => {
        try {
          // Try exact match first (case-insensitive) with retry logic
          const exactResult = await executeSupabaseQuery(
            async () => {
              return await supabaseAdmin
                .from('games')
                .select('*')
                .or(`nameEn.ilike.${gameName},nameEs.ilike.${gameName},name.ilike.${gameName}`)
                .limit(1)
                .maybeSingle();
            },
            { maxRetries: 2, baseDelay: 300, timeout: 5000 }
          );

          const { data: exactMatch, error: exactError } = exactResult;

          if (exactMatch && !exactError) {
            // Verify it's an exact match (case-insensitive)
            const lowerName = gameName.toLowerCase();
            if ((exactMatch as any).nameEn?.toLowerCase() === lowerName ||
                (exactMatch as any).nameEs?.toLowerCase() === lowerName ||
                (exactMatch as any).name?.toLowerCase() === lowerName) {
              return { gameName, game: exactMatch };
            }
          }

          // If no exact match, try partial match with retry logic
          const partialResult = await executeSupabaseQuery(
            async () => {
              return await supabaseAdmin
                .from('games')
                .select('*')
                .or(`nameEn.ilike.%${gameName}%,nameEs.ilike.%${gameName}%,name.ilike.%${gameName}%`)
                .limit(1)
                .maybeSingle();
            },
            { maxRetries: 2, baseDelay: 300, timeout: 5000 }
          );

          const { data: partialMatch, error: partialError } = partialResult;

          if (partialMatch && !partialError) {
            return { gameName, game: partialMatch };
          }
          
          return { gameName, game: null };
        } catch (error) {
          console.error(`Error fetching game "${gameName}":`, error);
          return { gameName, game: null };
        }
      });

      // Wait for batch to complete before starting next batch
      const batchResults = await Promise.all(batchQueries);
      results.push(...batchResults);
      
      // Small delay between batches to prevent connection exhaustion
      if (i + BATCH_SIZE < gamesToFind.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Build results array in the correct order
    for (const { gameName, game } of results) {
      if (game) {
        foundGames.push(game);
      } else {
        missingGames.push(gameName);
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
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
