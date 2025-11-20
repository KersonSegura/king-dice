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

    // Query multiple games at once using OR conditions - much faster
    const queryGamesBatch = async (gameNames: string[]): Promise<Map<string, any>> => {
      const results = new Map<string, any>();
      if (gameNames.length === 0) return results;
      
      try {
        // Build OR conditions for this batch
        const orConditions: string[] = [];
        gameNames.forEach((gameName) => {
          // Escape single quotes for SQL
          const escapedName = gameName.replace(/'/g, "''");
          // Try exact match first
          orConditions.push(`nameEn.ilike.${escapedName}`);
          orConditions.push(`nameEs.ilike.${escapedName}`);
          orConditions.push(`name.ilike.${escapedName}`);
        });

        // Single query for the batch
        const { data: batchGames, error } = await executeSupabaseQuery(
          async () => {
            return await supabaseAdmin
              .from('games')
              .select('*')
              .or(orConditions.join(','));
          },
          { maxRetries: 1, baseDelay: 200, timeout: 5000 }
        );

        if (error || !batchGames) return results;

        // Match games to their names
        batchGames.forEach((game: any) => {
          const nameEn = (game.nameEn || '').toLowerCase().trim();
          const nameEs = (game.nameEs || '').toLowerCase().trim();
          const name = (game.name || '').toLowerCase().trim();
          
          // Find matching game name
          for (const gameName of gameNames) {
            const searchName = gameName.toLowerCase().trim();
            if (nameEn === searchName || nameEs === searchName || name === searchName) {
              if (!results.has(gameName)) {
                results.set(gameName, game);
                break;
              }
            }
          }
        });
      } catch (error) {
        console.error('Error querying batch:', error);
      }
      
      return results;
    };

    // Load first 10 games immediately (prioritize these) - run in parallel with timeout
    const first10Games = gamesToFind.slice(0, 10);
    const first10Promises = first10Games.map(async (gameName) => {
      try {
        // Add a timeout wrapper to ensure we don't wait forever
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        );
        const gamePromise = queryGame(gameName);
        const game = await Promise.race([gamePromise, timeoutPromise]) as any;
        return { gameName, game };
      } catch (error) {
        return { gameName, game: null };
      }
    });

    // Map to store games by their position in the original list
    const gamesByPosition = new Map<number, any>();
    
    const first10Results = await Promise.allSettled(first10Promises);
    first10Results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.game && !seenGameIds.has(result.value.game.id)) {
        gamesByPosition.set(idx, result.value.game);
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
        const batchPromises = batch.map(async (gameName, batchIdx) => {
          const globalIdx = 10 + i + batchIdx;
          const game = await queryGame(gameName);
          return { position: globalIdx, gameName, game };
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.game && !seenGameIds.has(result.value.game.id)) {
            gamesByPosition.set(result.value.position, result.value.game);
            seenGameIds.add(result.value.game.id);
          } else if (result.status === 'fulfilled' && !result.value.game) {
            missingGames.push(result.value.gameName);
          }
        });

        // Small delay between batches
        if (i + BATCH_SIZE < remainingGames.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
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
