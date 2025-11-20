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

    // Process in smaller batches with OR queries (10 games = 30 conditions per batch)
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < gamesToFind.length; i += BATCH_SIZE) {
      const batch = gamesToFind.slice(i, i + BATCH_SIZE);
      
      try {
        // Build OR conditions for this batch
        const orConditions: string[] = [];
        const batchNameMap = new Map<string, number>(); // Map game name to batch index
        
        batch.forEach((gameName, batchIndex) => {
          const globalIndex = i + batchIndex;
          batchNameMap.set(gameName.toLowerCase(), globalIndex);
          // Escape single quotes for SQL
          const escapedName = gameName.replace(/'/g, "''");
          orConditions.push(`nameEn.ilike.${escapedName}`);
          orConditions.push(`nameEs.ilike.${escapedName}`);
          orConditions.push(`name.ilike.${escapedName}`);
        });

        // Query this batch with OR conditions
        const { data: batchGames, error } = await executeSupabaseQuery(
          async () => {
            return await supabaseAdmin
              .from('games')
              .select('*')
              .or(orConditions.join(','));
          },
          { maxRetries: 1, baseDelay: 200, timeout: 5000 }
        );

        if (error) {
          console.error(`❌ Error querying batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
          // Mark this batch as missing and continue
          batch.forEach(name => missingGames.push(name));
          continue;
        }

        if (batchGames && batchGames.length > 0) {
          // Match games to their names
          const matchedGames = new Map<number, any>();
          
          batchGames.forEach((game: any) => {
            const nameEn = (game.nameEn || '').toLowerCase();
            const nameEs = (game.nameEs || '').toLowerCase();
            const name = (game.name || '').toLowerCase();
            
            // Find matching game name
            for (const [gameName, index] of batchNameMap.entries()) {
              if (nameEn === gameName || nameEs === gameName || name === gameName) {
                if (!matchedGames.has(index)) {
                  matchedGames.set(index, game);
                  break;
                }
              }
            }
          });

          // Add matched games
          batch.forEach((gameName, batchIndex) => {
            const globalIndex = i + batchIndex;
            const matchedGame = matchedGames.get(globalIndex);
            if (matchedGame && !seenGameIds.has(matchedGame.id)) {
              foundGames.push(matchedGame);
              seenGameIds.add(matchedGame.id);
            } else if (!matchedGame) {
              missingGames.push(gameName);
            }
          });
        } else {
          // No games found in this batch
          batch.forEach(name => missingGames.push(name));
        }
      } catch (error) {
        console.error(`❌ Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        // Mark this batch as missing and continue
        batch.forEach(name => missingGames.push(name));
      }

      // Small delay between batches
      if (i + BATCH_SIZE < gamesToFind.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
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
