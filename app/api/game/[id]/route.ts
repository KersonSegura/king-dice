import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const gameId = parseInt(idString);
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    // Fetch the game and related data from Supabase
    const { data: game, error } = await supabaseAdmin
      .from('games')
      .select(`
        id, bggId, name, nameEn, nameEs, year, yearRelease, image, imageUrl, thumbnailUrl,
        minPlayers, maxPlayers, durationMinutes, minPlayTime, maxPlayTime,
        userRating, userVotes, bggRanking, bggRating, bggVotes,
        officialWebsite, expansions, isExpansion,
        gameCategories:gameCategories(*, category:category(*)),
        gameMechanics:gameMechanics(*, mechanic:mechanic(*)),
        descriptions:descriptions(*),
        rules:rules(*),
        baseGameExpansions:baseGameExpansions(*)
      `)
      .eq('id', gameId)
      .single();

    if (error) {
      console.error('Error querying game:', error);
      return NextResponse.json(
        { error: 'Failed to fetch game' },
        { status: 500 }
      );
    }

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, game });

  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch game', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
