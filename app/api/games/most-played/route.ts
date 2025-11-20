import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { executeSupabaseQuery } from '@/lib/supabase-helpers';
import { normalizeGameName } from '@/utils/normalizeGameName';

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
    const foundGames: any[] = [];
    const missingGames: string[] = [];
    const seenGameIds = new Set<number>();

    // Normalize all game names for consistent matching
    const normalizedNames = gamesToFind.map(gameInfo => ({
      original: gameInfo,
      normalized: normalizeGameName(gameInfo.name)
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
        category: 'most-played',
        total: 0,
        description: 'The most played games this month according to BoardGameGeek',
        source: 'BGG Most Played List'
      });
    }

    // Match found games back to their original positions
    if (allGames && allGames.length > 0) {
      allGames.forEach((game: any) => {
        const gameBestNameNorm = game.best_name_norm || normalizeGameName(game.nameEn || game.nameEs || game.name || '');
        
        // Find matching normalized name and check year if specified
        const matchIndex = normalizedNames.findIndex(n => {
          const nameMatches = n.normalized === gameBestNameNorm;
          const yearMatches = !n.original.year || !game.yearRelease || game.yearRelease === n.original.year;
          return nameMatches && yearMatches;
        });
        
        if (matchIndex !== -1 && !seenGameIds.has(game.id)) {
          gamesByPosition.set(matchIndex, game);
          seenGameIds.add(game.id);
        }
      });
    }

    // Track missing games
    normalizedNames.forEach((nameInfo, index) => {
      if (!gamesByPosition.has(index)) {
        missingGames.push(nameInfo.original.name);
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
