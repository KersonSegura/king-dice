import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { awardXP } from '@/lib/reputation';
import prisma from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const normalizeStarRating = (stars: number) => stars * 2; // Convert 1-5 stars to 1-10 scale
const denormalizeRating = (rating: number | null | undefined) => {
  if (rating === null || typeof rating === 'undefined') return null;
  return Math.round((rating / 2) * 10) / 10;
};

const toNumber = (value: unknown): number | null => {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    try {
      // Prisma.Decimal has toNumber method
      return (value as { toNumber: () => number }).toNumber();
    } catch {
      return Number(value);
    }
  }
  return Number(value);
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[VOTE API] Starting vote submission...');
    const { id: idString } = await params;
    const gameId = Number.parseInt(idString, 10);
    console.log('[VOTE API] Game ID:', gameId);

    if (Number.isNaN(gameId)) {
      console.error('[VOTE API] Invalid game ID:', idString);
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const body = await request.json();
    console.log('[VOTE API] Request body:', { rating: body.rating, userId: body.userId });
    const { rating, userId } = body;

    if (!userId) {
      console.error('[VOTE API] Missing userId');
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Accept decimal ratings from 0.5 to 5.0 in 0.5 increments
    if (typeof rating !== 'number' || isNaN(rating) || rating < 0.5 || rating > 5.0) {
      console.error('[VOTE API] Invalid rating:', rating);
      return NextResponse.json(
        { error: 'Rating must be between 0.5 and 5.0 stars' },
        { status: 400 }
      );
    }
    
    // Validate it's a valid 0.5 increment
    const validIncrement = Math.abs(rating % 0.5) < 0.01 || Math.abs(rating % 0.5 - 0.5) < 0.01;
    if (!validIncrement) {
      console.error('[VOTE API] Invalid rating increment:', rating);
      return NextResponse.json(
        { error: 'Rating must be a multiple of 0.5 (e.g., 1.0, 1.5, 2.0, etc.)' },
        { status: 400 }
      );
    }

    console.log('[VOTE API] Finding game...');
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, userVotes: true, userRating: true },
    });
    console.log('[VOTE API] Game found:', !!game);

    if (!game) {
      console.error('[VOTE API] Game not found for ID:', gameId);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const normalizedRating = normalizeStarRating(rating);
    console.log('[VOTE API] Normalized rating:', normalizedRating, '(from', rating, 'stars)');

    // Determine if this is a new vote or an update
    console.log('[VOTE API] Checking for existing vote...');
    const existingVote = await prisma.userVote.findUnique({
      where: {
        gameId_userId: {
          gameId,
          userId,
        },
      },
    });
    console.log('[VOTE API] Existing vote found:', !!existingVote);

    console.log('[VOTE API] Upserting vote...');
    await prisma.userVote.upsert({
      where: {
        gameId_userId: {
          gameId,
          userId,
        },
      },
      update: { rating: normalizedRating },
      create: {
        gameId,
        userId,
        rating: normalizedRating,
      },
    });
    console.log('[VOTE API] Vote upserted successfully');

    console.log('[VOTE API] Aggregating votes...');
    const aggregate = await prisma.userVote.aggregate({
      where: { gameId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    console.log('[VOTE API] Aggregate result:', aggregate);

    const averageUserRating = toNumber(aggregate._avg.rating) ?? 0;
    const totalUserVotes = aggregate._count.rating ?? 0;
    console.log('[VOTE API] Calculated average:', averageUserRating, 'Total votes:', totalUserVotes);

    console.log('[VOTE API] Updating game...');
    await prisma.game.update({
      where: { id: gameId },
      data: {
        userRating: averageUserRating,
        userVotes: totalUserVotes,
      },
    });
    console.log('[VOTE API] Game updated successfully');

    const isNewVote = !existingVote;
    
    if (isNewVote) {
      try {
        await awardXP(userId, userId, 'VOTE_GAME', gameId.toString());
      } catch (error) {
        console.error('Error awarding XP for game vote:', error);
      }
    }

    return NextResponse.json({
      success: true,
      isNewVote,
      userRating: averageUserRating,
      userRatingStars: denormalizeRating(averageUserRating), // 1-5 scale
      userVotes: totalUserVotes,
      message: isNewVote ? 'Vote submitted successfully!' : 'Rating updated successfully!',
    });
  } catch (error) {
    console.error('[VOTE API] ERROR CAUGHT:', error);
    console.error('[VOTE API] Error type:', error?.constructor?.name);
    console.error('[VOTE API] Error instanceof Prisma.PrismaClientKnownRequestError:', error instanceof Prisma.PrismaClientKnownRequestError);
    console.error('[VOTE API] Error instanceof Error:', error instanceof Error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[VOTE API] Prisma error code:', error.code);
      console.error('[VOTE API] Prisma error message:', error.message);
      console.error('[VOTE API] Prisma error meta:', JSON.stringify(error.meta, null, 2));
      
      // Provide more specific error messages based on error code
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'You have already voted for this game. You can update your rating.' },
          { status: 400 }
        );
      }
      
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid game or user reference.' },
          { status: 400 }
        );
      }
      
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Game not found.' },
          { status: 404 }
        );
      }
      
      // For other Prisma errors, return the actual error message
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('[VOTE API] Error message:', error.message);
      console.error('[VOTE API] Error stack:', error.stack);
      console.error('[VOTE API] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Check if it's a connection error
      const errorMessageLower = error.message.toLowerCase();
      if (errorMessageLower.includes('connect') || 
          errorMessageLower.includes('connection') || 
          errorMessageLower.includes('timeout') ||
          errorMessageLower.includes('econnrefused') ||
          errorMessageLower.includes('enotfound') ||
          errorMessageLower.includes('prisma') && errorMessageLower.includes('error')) {
        console.error('[VOTE API] Detected as connection/database error');
        return NextResponse.json(
          { error: 'Database connection issue. Please try again later.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
    
    console.error('[VOTE API] Unknown error type:', typeof error, error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const votePromise = userId
      ? prisma.userVote.findUnique({
          where: {
            gameId_userId: {
              gameId,
              userId,
            },
          },
          select: { rating: true },
        })
      : null;

    const [existingVote, aggregate] = await Promise.all([
      votePromise,
      prisma.userVote.aggregate({
        where: { gameId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const averageUserRating = toNumber(aggregate._avg.rating) ?? 0;
    const totalUserVotes = aggregate._count.rating ?? 0;

    return NextResponse.json({
      hasVoted: !!existingVote,
      userRatingStars: existingVote ? toNumber(existingVote.rating) / 2 : null,
      averageUserRatingRaw: averageUserRating,
      averageUserRatingStars: denormalizeRating(averageUserRating),
      totalVotes: totalUserVotes,
    });
  } catch (error) {
    console.error('Error checking vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}