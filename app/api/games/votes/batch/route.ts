import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const denormalizeRating = (rating: number): number => {
  // Convert from 1-10 scale to 0.5-5.0 stars scale
  return Math.round((rating / 2) * 10) / 10;
};

/**
 * Batch endpoint to get vote data for multiple games at once
 * POST /api/games/votes/batch
 * Body: { gameIds: number[], userId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { gameIds, userId } = await request.json();

    if (!Array.isArray(gameIds) || gameIds.length === 0) {
      return NextResponse.json(
        { error: 'gameIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (gameIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 games per batch request' },
        { status: 400 }
      );
    }

    // Get all votes for these games
    const { data: allVotes, error: votesError } = await supabaseAdmin
      .from('user_votes')
      .select('gameId, rating, userId')
      .in('gameId', gameIds);

    if (votesError) {
      console.error('Error fetching batch votes:', votesError);
      return NextResponse.json(
        { error: 'Failed to fetch votes' },
        { status: 500 }
      );
    }

    // Group votes by gameId
    const votesByGame: Record<number, { ratings: number[], userVote?: number }> = {};
    
    // Initialize all games
    gameIds.forEach((gameId: number) => {
      votesByGame[gameId] = { ratings: [] };
    });

    // Process votes
    allVotes?.forEach((vote) => {
      const gameId = vote.gameId;
      if (!votesByGame[gameId]) {
        votesByGame[gameId] = { ratings: [] };
      }
      votesByGame[gameId].ratings.push(vote.rating);
      
      // Track user's vote if userId provided
      if (userId && vote.userId === userId) {
        votesByGame[gameId].userVote = vote.rating;
      }
    });

    // Calculate stats for each game
    const result: Record<number, {
      hasVoted: boolean;
      userRatingStars: number | null;
      averageUserRatingRaw: number;
      averageUserRatingStars: number;
      totalVotes: number;
    }> = {};

    gameIds.forEach((gameId: number) => {
      const gameVotes = votesByGame[gameId];
      const totalVotes = gameVotes.ratings.length;
      const sumRatings = gameVotes.ratings.reduce((sum, rating) => sum + (rating || 0), 0);
      const averageUserRating = totalVotes > 0 ? sumRatings / totalVotes : 0;
      const userVote = gameVotes.userVote;

      result[gameId] = {
        hasVoted: !!userVote,
        userRatingStars: userVote ? denormalizeRating(userVote) : null,
        averageUserRatingRaw: averageUserRating,
        averageUserRatingStars: denormalizeRating(averageUserRating),
        totalVotes: totalVotes,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in batch votes endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

