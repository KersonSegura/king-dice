import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { awardXP } from '@/lib/reputation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const normalizeStarRating = (stars: number) => stars * 2; // Convert 1-5 stars to 1-10 scale
const denormalizeRating = (rating: number | null | undefined) => {
  if (rating === null || typeof rating === 'undefined') return null;
  return Math.round((rating / 2) * 10) / 10;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const gameId = Number.parseInt(idString, 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const { rating, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Accept decimal ratings from 0.5 to 5.0 in 0.5 increments
    if (typeof rating !== 'number' || isNaN(rating) || rating < 0.5 || rating > 5.0) {
      return NextResponse.json(
        { error: 'Rating must be between 0.5 and 5.0 stars' },
        { status: 400 }
      );
    }
    
    // Validate it's a valid 0.5 increment
    const validIncrement = Math.abs(rating % 0.5) < 0.01 || Math.abs(rating % 0.5 - 0.5) < 0.01;
    if (!validIncrement) {
      return NextResponse.json(
        { error: 'Rating must be a multiple of 0.5 (e.g., 1.0, 1.5, 2.0, etc.)' },
        { status: 400 }
      );
    }

    // Check if game exists
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('id, userVotes, userRating')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const normalizedRating = normalizeStarRating(rating);

    // Check if user already voted
    const { data: existingVote } = await supabaseAdmin
      .from('user_votes')
      .select('id, rating')
      .eq('gameId', gameId)
      .eq('userId', userId)
      .single();

    const isNewVote = !existingVote;

    // Upsert the vote
    const { error: voteError } = await supabaseAdmin
      .from('user_votes')
      .upsert({
        gameId,
        userId,
        rating: normalizedRating,
      }, {
        onConflict: 'gameId,userId'
      });

    if (voteError) {
      console.error('Error saving vote:', voteError);
      return NextResponse.json(
        { error: 'Failed to save vote. Please try again.' },
        { status: 500 }
      );
    }

    // Calculate new average rating from all votes
    const { data: allVotes, error: votesError } = await supabaseAdmin
      .from('user_votes')
      .select('rating')
      .eq('gameId', gameId);

    if (votesError) {
      console.error('Error fetching votes:', votesError);
      return NextResponse.json(
        { error: 'Failed to calculate rating. Please try again.' },
        { status: 500 }
      );
    }

    // Calculate average
    const totalVotes = allVotes?.length || 0;
    const sumRatings = allVotes?.reduce((sum, vote) => sum + (vote.rating || 0), 0) || 0;
    const averageUserRating = totalVotes > 0 ? sumRatings / totalVotes : 0;

    // Update game with new rating and vote count
    const { error: updateError } = await supabaseAdmin
      .from('games')
      .update({
        userRating: averageUserRating,
        userVotes: totalVotes,
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Error updating game:', updateError);
      return NextResponse.json(
        { error: 'Failed to update game rating. Please try again.' },
        { status: 500 }
      );
    }

    // Award XP for new votes only
    if (isNewVote) {
      try {
        await awardXP(userId, userId, 'VOTE_GAME', gameId.toString());
      } catch (error) {
        console.error('Error awarding XP for game vote:', error);
        // Don't fail the request if XP award fails
      }
    }

    return NextResponse.json({
      success: true,
      isNewVote,
      userRating: averageUserRating,
      userRatingStars: denormalizeRating(averageUserRating), // 1-5 scale
      userVotes: totalVotes,
      message: isNewVote ? 'Vote submitted successfully!' : 'Rating updated successfully!',
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const gameId = Number.parseInt(idString, 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Get user's existing vote if userId provided
    let existingVote = null;
    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('user_votes')
        .select('rating')
        .eq('gameId', gameId)
        .eq('userId', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully
      
      // Only set existingVote if data exists and no error (or error is just "not found")
      if (data && !error) {
        existingVote = data;
      }
    }

    // Get all votes for this game to calculate average
    const { data: allVotes, error: votesError } = await supabaseAdmin
      .from('user_votes')
      .select('rating')
      .eq('gameId', gameId);

    if (votesError) {
      console.error('Error fetching votes:', votesError);
      return NextResponse.json(
        { error: 'Failed to fetch votes' },
        { status: 500 }
      );
    }

    const totalVotes = allVotes?.length || 0;
    const sumRatings = allVotes?.reduce((sum, vote) => sum + (vote.rating || 0), 0) || 0;
    const averageUserRating = totalVotes > 0 ? sumRatings / totalVotes : 0;

    return NextResponse.json({
      hasVoted: !!existingVote,
      userRatingStars: (existingVote?.rating != null) ? denormalizeRating(existingVote.rating) : null,
      averageUserRatingRaw: averageUserRating,
      averageUserRatingStars: denormalizeRating(averageUserRating),
      totalVotes: totalVotes,
    });
  } catch (error) {
    console.error('Error checking vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
