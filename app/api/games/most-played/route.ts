import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

    const foundGames = [];
    const gamesToFind = topRankedGames.slice(0, limit);

    // Find each game by name (and optionally year) in the database
    for (const gameInfo of gamesToFind) {
      // Try exact match on each field separately
      // First try case-sensitive exact match with .eq()
      let gameResults = null;
      
      // Try nameEn exact match (case-sensitive)
      let { data: results } = await supabaseAdmin
        .from('games')
        .select('*')
        .eq('nameEn', gameInfo.name)
        .limit(1);
      
      if (results && results.length > 0) {
        gameResults = results;
      } else {
        // Try nameEs exact match (case-sensitive)
        ({ data: results } = await supabaseAdmin
          .from('games')
          .select('*')
          .eq('nameEs', gameInfo.name)
          .limit(1));
        
        if (results && results.length > 0) {
          gameResults = results;
        } else {
          // Try name exact match (case-sensitive)
          ({ data: results } = await supabaseAdmin
            .from('games')
            .select('*')
            .eq('name', gameInfo.name)
            .limit(1));
          
          if (results && results.length > 0) {
            gameResults = results;
          } else {
            // Try case-insensitive exact match with .ilike() (no wildcards)
            // Try nameEn
            ({ data: results } = await supabaseAdmin
              .from('games')
              .select('*')
              .ilike('nameEn', gameInfo.name)
              .limit(1));
            
            if (results && results.length > 0) {
              gameResults = results;
            } else {
              // Try nameEs
              ({ data: results } = await supabaseAdmin
                .from('games')
                .select('*')
                .ilike('nameEs', gameInfo.name)
                .limit(1));
              
              if (results && results.length > 0) {
                gameResults = results;
              } else {
                // Try name
                ({ data: results } = await supabaseAdmin
                  .from('games')
                  .select('*')
                  .ilike('name', gameInfo.name)
                  .limit(1));
                
                if (results && results.length > 0) {
                  gameResults = results;
                }
              }
            }
          }
        }
      }

      // If year is provided and we found a game, verify the year matches
      if (gameResults && gameResults.length > 0 && gameInfo.year) {
        if (gameResults[0].yearRelease !== gameInfo.year && gameResults[0].year !== gameInfo.year) {
          // Year doesn't match, try to find another match with the correct year
          // Try nameEn with year
          let { data: yearMatchedResults } = await supabaseAdmin
            .from('games')
            .select('*')
            .eq('nameEn', gameInfo.name)
            .eq('yearRelease', gameInfo.year)
            .limit(1);
          
          if (!yearMatchedResults || yearMatchedResults.length === 0) {
            // Try nameEs with year
            ({ data: yearMatchedResults } = await supabaseAdmin
              .from('games')
              .select('*')
              .eq('nameEs', gameInfo.name)
              .eq('yearRelease', gameInfo.year)
              .limit(1));
          }
          
          if (!yearMatchedResults || yearMatchedResults.length === 0) {
            // Try name with year
            ({ data: yearMatchedResults } = await supabaseAdmin
              .from('games')
              .select('*')
              .eq('name', gameInfo.name)
              .eq('yearRelease', gameInfo.year)
              .limit(1));
          }
          
          if (yearMatchedResults && yearMatchedResults.length > 0) {
            gameResults = yearMatchedResults;
          }
        }
      }

      // If still not found, try partial match as last resort (with wildcards)
      if (!gameResults || gameResults.length === 0) {
        let partialQuery = supabaseAdmin
          .from('games')
          .select('*')
          .or(`nameEn.ilike.%${gameInfo.name}%,nameEs.ilike.%${gameInfo.name}%,name.ilike.%${gameInfo.name}%`);
        
        if (gameInfo.year) {
          partialQuery = partialQuery.eq('yearRelease', gameInfo.year);
        }
        
        const { data: partialResults } = await partialQuery.limit(1);
        gameResults = partialResults;
      }

      if (gameResults && gameResults.length > 0) {
        foundGames.push(gameResults[0]);
      } else {
        console.warn(`⚠️ Game not found: ${gameInfo.name}${gameInfo.year ? ` (${gameInfo.year})` : ''}`);
      }
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
