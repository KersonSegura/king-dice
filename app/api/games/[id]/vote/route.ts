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

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, userVotes: true, userRating: true },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const normalizedRating = normalizeStarRating(rating);

    // Determine if this is a new vote or an update
    const existingVote = await prisma.userVote.findUnique({
      where: {
        gameId_userId: {
          gameId,
          userId,
        },
      },
    });

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

    const aggregate = await prisma.userVote.aggregate({
      where: { gameId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const averageUserRating = toNumber(aggregate._avg.rating) ?? 0;
    const totalUserVotes = aggregate._count.rating ?? 0;

    await prisma.game.update({
      where: { id: gameId },
      data: {
        userRating: averageUserRating,
        userVotes: totalUserVotes,
      },
    });

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
    console.error('Error procesando voto:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code, error.meta);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
    
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