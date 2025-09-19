import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await request.json();
    const nominationId = parseInt(params.id);
    
    if (isNaN(nominationId)) {
      return NextResponse.json(
        { error: 'Invalid nomination ID' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user has already voted for this nomination
    const existingVote = await prisma.catanNominationVote.findUnique({
      where: {
        nominationId_userId: {
          nominationId: nominationId,
          userId: userId
        }
      }
    });

    // Use transaction to handle both adding and removing votes
    const result = await prisma.$transaction(async (tx) => {
      if (existingVote) {
        // User has already voted - remove the vote
        await tx.catanNominationVote.delete({
          where: {
            nominationId_userId: {
              nominationId: nominationId,
              userId: userId
            }
          }
        });

        // Decrease the nomination's vote count
        const updatedNomination = await tx.catanNomination.update({
          where: { id: nominationId },
          data: { votes: { decrement: 1 } }
        });

        return { action: 'removed', nomination: updatedNomination };
      } else {
        // User hasn't voted - create the vote
        await tx.catanNominationVote.create({
          data: {
            nominationId: nominationId,
            userId: userId
          }
        });

        // Increase the nomination's vote count
        const updatedNomination = await tx.catanNomination.update({
          where: { id: nominationId },
          data: { votes: { increment: 1 } }
        });

        return { action: 'added', nomination: updatedNomination };
      }
    });

    return NextResponse.json({
      success: true,
      action: result.action,
      nominationId: result.nomination.id,
      votes: result.nomination.votes
    });

  } catch (error) {
    console.error('Error updating vote:', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
}
