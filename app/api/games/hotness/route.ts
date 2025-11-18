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

    const foundGames = [];
    const gamesToFind = hotnessGames.slice(0, limit);

    // Find each game by name in the database
    for (const gameName of gamesToFind) {
      // Try exact match on each field separately
      // First try case-sensitive exact match with .eq()
      let gameResults = null;
      
      // Try nameEn exact match (case-sensitive)
      let { data: results } = await supabaseAdmin
        .from('games')
        .select('*')
        .eq('nameEn', gameName)
        .limit(1);
      
      if (results && results.length > 0) {
        gameResults = results;
      } else {
        // Try nameEs exact match (case-sensitive)
        ({ data: results } = await supabaseAdmin
          .from('games')
          .select('*')
          .eq('nameEs', gameName)
          .limit(1));
        
        if (results && results.length > 0) {
          gameResults = results;
        } else {
          // Try name exact match (case-sensitive)
          ({ data: results } = await supabaseAdmin
            .from('games')
            .select('*')
            .eq('name', gameName)
            .limit(1));
          
          if (results && results.length > 0) {
            gameResults = results;
          } else {
            // Try case-insensitive exact match with .ilike() (no wildcards)
            // Try nameEn
            ({ data: results } = await supabaseAdmin
              .from('games')
              .select('*')
              .ilike('nameEn', gameName)
              .limit(1));
            
            if (results && results.length > 0) {
              gameResults = results;
            } else {
              // Try nameEs
              ({ data: results } = await supabaseAdmin
                .from('games')
                .select('*')
                .ilike('nameEs', gameName)
                .limit(1));
              
              if (results && results.length > 0) {
                gameResults = results;
              } else {
                // Try name
                ({ data: results } = await supabaseAdmin
                  .from('games')
                  .select('*')
                  .ilike('name', gameName)
                  .limit(1));
                
                if (results && results.length > 0) {
                  gameResults = results;
                }
              }
            }
          }
        }
      }

      // If still not found, try partial match as last resort (with wildcards)
      if (!gameResults || gameResults.length === 0) {
        const { data: partialResults } = await supabaseAdmin
          .from('games')
          .select('*')
          .or(`nameEn.ilike.%${gameName}%,nameEs.ilike.%${gameName}%,name.ilike.%${gameName}%`)
          .limit(1);
        gameResults = partialResults;
      }

      if (gameResults && gameResults.length > 0) {
        foundGames.push(gameResults[0]);
      } else {
        console.warn(`⚠️ Game not found: ${gameName}`);
      }
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
