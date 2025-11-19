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

    // OPTIMIZED: Query games by name matching the hardcoded list
    // Split into batches to avoid Supabase OR clause limits
    const gamesToFind = hotnessGames.slice(0, limit);
    const BATCH_SIZE = 10;
    const allMatchedGames: any[] = [];
    
    console.log(`🔍 Starting to fetch ${gamesToFind.length} games in batches of ${BATCH_SIZE}`);
    console.log(`📋 First 5 games to find:`, gamesToFind.slice(0, 5));
    
    for (let i = 0; i < gamesToFind.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batch = gamesToFind.slice(i, i + BATCH_SIZE);
      const orConditions: string[] = [];
      
      console.log(`\n🔄 Processing batch ${batchNum}/${Math.ceil(gamesToFind.length / BATCH_SIZE)} (games ${i + 1}-${Math.min(i + BATCH_SIZE, gamesToFind.length)})`);
      console.log(`   Batch games:`, batch);
      
      batch.forEach((gameName) => {
        // For ilike, we need to wrap in quotes and escape properly
        // Supabase ilike expects the value to be quoted
        const escapedName = gameName.replace(/'/g, "''");
        // Use eq for exact match instead of ilike - faster and more precise
        orConditions.push(`nameEn.eq.${escapedName}`);
        orConditions.push(`nameEs.eq.${escapedName}`);
        orConditions.push(`name.eq.${escapedName}`);
      });

      console.log(`   Built ${orConditions.length} OR conditions`);
      console.log(`   Executing query...`);

      const queryStartTime = Date.now();
      try {
        const { data: batchGames, error: batchError } = await supabaseAdmin
          .from('games')
          .select('*')
          .or(orConditions.join(','))
          .limit(BATCH_SIZE * 3);

        const queryDuration = Date.now() - queryStartTime;
        console.log(`   ✅ Query completed in ${queryDuration}ms`);

        if (batchError) {
          console.error(`   ❌ Batch ${batchNum} query error:`, batchError);
          console.error(`   ❌ Error code:`, batchError.code);
          console.error(`   ❌ Error message:`, batchError.message);
          continue;
        }

        if (batchGames) {
          console.log(`   ✅ Found ${batchGames.length} games in batch ${batchNum}`);
          allMatchedGames.push(...batchGames);
        } else {
          console.log(`   ⚠️ Batch ${batchNum} returned no games`);
        }
      } catch (error) {
        const queryDuration = Date.now() - queryStartTime;
        console.error(`   ❌ Exception in batch ${batchNum} after ${queryDuration}ms:`, error);
        console.error(`   ❌ Error type:`, error instanceof Error ? error.constructor.name : typeof error);
        console.error(`   ❌ Error message:`, error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
          console.error(`   ❌ Stack trace:`, error.stack);
        }
      }
    }
    
    console.log(`\n📊 Total games fetched: ${allMatchedGames.length}`);
    const matchedGames = allMatchedGames;

    // Create a map: lowercase name -> game
    const gamesMap = new Map<string, any>();
    (matchedGames || []).forEach((game) => {
      if (!game.id) return;
      const nameEn = (game.nameEn || '').toLowerCase().trim();
      const nameEs = (game.nameEs || '').toLowerCase().trim();
      const name = (game.name || '').toLowerCase().trim();
      
      if (nameEn) gamesMap.set(nameEn, game);
      if (nameEs) gamesMap.set(nameEs, game);
      if (name) gamesMap.set(name, game);
    });

    // Match games in the correct order from hardcoded list
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    const matchedGameIds = new Set<number>();

    gamesToFind.forEach((gameName) => {
      const lowerName = gameName.toLowerCase().trim();
      let matchedGame = gamesMap.get(lowerName);
      
      // If not found, try without apostrophes (handles "Feya's" vs "Feyas")
      if (!matchedGame) {
        const nameWithoutApostrophe = lowerName.replace(/'/g, '');
        matchedGame = gamesMap.get(nameWithoutApostrophe);
      }
      
      if (matchedGame && matchedGame.id && !matchedGameIds.has(matchedGame.id)) {
        matchedGameIds.add(matchedGame.id);
        foundGames.push(matchedGame);
      } else {
        missingGames.push(gameName);
        // Debug missing games
        if (missingGames.length <= 3) {
          console.log(`   🔍 Looking for: "${gameName}" (lowercase: "${lowerName}")`);
          const similarKeys = Array.from(gamesMap.keys()).filter(k => 
            k.includes(lowerName.substring(0, Math.min(5, lowerName.length))) || 
            lowerName.includes(k.substring(0, Math.min(5, k.length)))
          ).slice(0, 3);
          if (similarKeys.length > 0) {
            console.log(`      Similar names found:`, similarKeys);
          }
        }
      }
    });

    if (missingGames.length > 0) {
      console.warn(`⚠️ Games not found: ${missingGames.join(', ')}`);
    }

    console.log(`✅ Found ${foundGames.length} out of ${gamesToFind.length} hotness games`);
    if (missingGames.length > 0) {
      console.log(`⚠️ Missing games (${missingGames.length}):`, missingGames.slice(0, 10));
    }

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
