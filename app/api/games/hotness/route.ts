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

    console.log(`🔥 Getting HOTNESS GAMES from hardcoded list (limit: ${limit})`);

    const gamesToFind = hotnessGames.slice(0, limit);
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    const seenGameIds = new Set<number>();

    // Normalize all game names for consistent matching
    const normalizedNames = gamesToFind.map((name, index) => ({
      original: name,
      normalized: normalizeGameName(name),
      index: index
    }));

    // Map to store games by their position in the original list
    const gamesByPosition = new Map<number, any>();
    
    // Create a map of normalized names to their original indices (for fast lookup)
    const normalizedToIndex = new Map<string, number[]>();
    normalizedNames.forEach(nameInfo => {
      if (!normalizedToIndex.has(nameInfo.normalized)) {
        normalizedToIndex.set(nameInfo.normalized, []);
      }
      normalizedToIndex.get(nameInfo.normalized)!.push(nameInfo.index);
    });

    // Query in smaller batches to avoid timeout (process 20 games at a time)
    const BATCH_SIZE = 20;
    const normalizedNameValues = normalizedNames.map(n => n.normalized);
    
    for (let i = 0; i < normalizedNameValues.length; i += BATCH_SIZE) {
      const batch = normalizedNameValues.slice(i, i + BATCH_SIZE);
      
      const { data: batchGames, error } = await executeSupabaseQuery(
        async () => {
          return await supabaseAdmin
            .from('games')
            .select('*')
            .in('best_name_norm', batch);
        },
        { maxRetries: 1, baseDelay: 200, timeout: 8000 }
      );

      if (error) {
        console.error(`❌ Error querying batch ${i / BATCH_SIZE + 1}:`, error);
        // Continue with next batch instead of failing completely
        continue;
      }

      // Match found games back to their original positions
      if (batchGames && batchGames.length > 0) {
        batchGames.forEach((game: any) => {
          const gameBestNameNorm = game.best_name_norm || normalizeGameName(game.nameEn || game.nameEs || game.name || '');
          
          // Find matching indices for this normalized name
          const matchingIndices = normalizedToIndex.get(gameBestNameNorm);
          if (matchingIndices && matchingIndices.length > 0 && !seenGameIds.has(game.id)) {
            // Use the first matching index (prefer earlier position in list)
            const matchIndex = matchingIndices[0];
            if (!gamesByPosition.has(matchIndex)) {
              gamesByPosition.set(matchIndex, game);
              seenGameIds.add(game.id);
            }
          }
        });
      }
    }

    // Track missing games
    normalizedNames.forEach((nameInfo) => {
      if (!gamesByPosition.has(nameInfo.index)) {
        missingGames.push(nameInfo.original);
      }
    });

    // Build final array in order of the original list
    for (let i = 0; i < gamesToFind.length; i++) {
      const game = gamesByPosition.get(i);
      if (game) {
        foundGames.push(game);
      }
    }
    
    // Build final array in order of the original list
    for (let i = 0; i < gamesToFind.length; i++) {
      const game = gamesByPosition.get(i);
      if (game) {
        foundGames.push(game);
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
