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
    const normalizedNames = gamesToFind.map(name => ({
      original: name,
      normalized: normalizeGameName(name)
    }));

    // Map to store games by their position in the original list
    const gamesByPosition = new Map<number, any>();

    // Single query using .in() on the normalized best_name_norm column
    // This is much faster and more reliable than OR chains
    const normalizedNameValues = normalizedNames.map(n => n.normalized);
    
    const { data: allGames, error } = await executeSupabaseQuery(
      async () => {
        return await supabaseAdmin
          .from('games')
          .select('*')
          .in('best_name_norm', normalizedNameValues);
      },
      { maxRetries: 2, baseDelay: 200, timeout: 10000 }
    );

    if (error) {
      console.error('❌ Error querying games:', error);
      // Return empty array instead of crashing
      return NextResponse.json({ 
        games: [],
        category: 'hotness',
        total: 0,
        description: 'The hottest games today according to BoardGameGeek',
        source: 'BGG Hotness List'
      });
    }

    // Match found games back to their original positions
    if (allGames && allGames.length > 0) {
      allGames.forEach((game: any) => {
        const gameBestNameNorm = game.best_name_norm || normalizeGameName(game.nameEn || game.nameEs || game.name || '');
        
        // Find matching normalized name
        const matchIndex = normalizedNames.findIndex(n => n.normalized === gameBestNameNorm);
        if (matchIndex !== -1 && !seenGameIds.has(game.id)) {
          gamesByPosition.set(matchIndex, game);
          seenGameIds.add(game.id);
        }
      });
    }

    // Track missing games
    normalizedNames.forEach((nameInfo, index) => {
      if (!gamesByPosition.has(index)) {
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
