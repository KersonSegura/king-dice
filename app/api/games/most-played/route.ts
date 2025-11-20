import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Top Ranked Games (Most Played) list from BGG (hardcoded list)
const topRankedGames = [
  { name: 'Flip 7', year: 2024 },
  { name: 'Ark Nova', year: 2021 },
  { name: 'Harmonies', year: 2024 },
  { name: 'Castle Combo', year: 2024 },
  { name: 'Bomb Busters', year: 2024 },
  { name: 'Forest Shuffle', year: 2023 },
  { name: 'Sea Salt & Paper', year: 2022 },
  { name: 'Terraforming Mars', year: 2016 },
  { name: 'Azul', year: 2017 },
  { name: 'Wingspan', year: 2019 },
  { name: 'The Lord of the Rings: Fate of the Fellowship', year: 2025 },
  { name: 'Faraway', year: 2023 },
  { name: 'Sky Team', year: 2023 },
  { name: 'Cascadia', year: 2021 },
  { name: 'Lost Ruins of Arnak', year: 2020 },
  { name: 'Heat: Pedal to the Metal', year: 2022 },
  { name: 'Vantage', year: 2025 },
  { name: 'SETI: Search for Extraterrestrial Intelligence', year: 2024 },
  { name: 'The White Castle', year: 2023 },
  { name: 'SCOUT', year: 2019 },
  { name: '7 Wonders Duel', year: 2015 },
  { name: 'Carcassonne', year: 2000 },
  { name: 'The Gang', year: 2024 },
  { name: 'The Lord of the Rings: The Fellowship of the Ring – Trick-Taking Game', year: 2024 },
  { name: 'Splendor', year: 2014 }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log(`🎯 Getting MOST PLAYED GAMES from hardcoded list (limit: ${limit})`);

    const gamesToFind = topRankedGames.slice(0, limit);
    
    // Use smaller batches to avoid query complexity timeout
    const BATCH_SIZE = 10;
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    const seenGameIds = new Set<number>();

    for (let i = 0; i < gamesToFind.length; i += BATCH_SIZE) {
      const batch = gamesToFind.slice(i, i + BATCH_SIZE);
      
      // Build OR conditions for this batch only
      const orConditions: string[] = [];
      batch.forEach(gameInfo => {
        const escapedName = gameInfo.name.replace(/'/g, "''");
        // Try exact match first (no wildcards = faster)
        orConditions.push(`nameEn.ilike.${escapedName}`);
        orConditions.push(`nameEs.ilike.${escapedName}`);
        orConditions.push(`name.ilike.${escapedName}`);
      });

      const { data: batchGames, error: batchError } = await executeSupabaseQuery(
        async () => {
          let query = supabaseAdmin
            .from('games')
            .select('*')
            .or(orConditions.join(','))
            .limit(BATCH_SIZE * 2);
          return await query;
        },
        { maxRetries: 1, baseDelay: 200, timeout: 5000 }
      );

      if (batchError) {
        console.error(`❌ Error querying batch ${i / BATCH_SIZE + 1}:`, batchError);
        batch.forEach(gameInfo => missingGames.push(gameInfo.name));
        continue;
      }

      // Match games from this batch
      const batchMap = new Map<string, any>();
      (batchGames || []).forEach((game: any) => {
        const nameEn = (game.nameEn || '').toLowerCase();
        const nameEs = (game.nameEs || '').toLowerCase();
        const name = (game.name || '').toLowerCase();
        if (nameEn) batchMap.set(nameEn, game);
        if (nameEs) batchMap.set(nameEs, game);
        if (name) batchMap.set(name, game);
      });

      // Match games in order, prefer year match if available
      batch.forEach((gameInfo) => {
        const normalizedName = gameInfo.name.toLowerCase();
        const matchedGame = batchMap.get(normalizedName);
        
        if (matchedGame && !seenGameIds.has(matchedGame.id)) {
          // Prefer year match if year is specified
          if (gameInfo.year && matchedGame.yearRelease === gameInfo.year) {
            foundGames.push(matchedGame);
            seenGameIds.add(matchedGame.id);
          } else if (!gameInfo.year || !foundGames.find(g => g.id === matchedGame.id)) {
            foundGames.push(matchedGame);
            seenGameIds.add(matchedGame.id);
          }
        } else if (!matchedGame) {
          missingGames.push(gameInfo.name);
        }
      });

      // Small delay between batches
      if (i + BATCH_SIZE < gamesToFind.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    if (missingGames.length > 0) {
      console.warn(`⚠️ Games not found: ${missingGames.join(', ')}`);
    }

    console.log(`✅ Found ${foundGames.length} out of ${gamesToFind.length} most played games`);

    return NextResponse.json({ 
      games: foundGames,
      category: 'most-played',
      total: foundGames.length,
      description: 'The most played games this month according to BoardGameGeek',
      source: 'BGG Most Played List'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'CDN-Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error getting most played games:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
