import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, voteType } = body;
    const userId = request.headers.get('user-id'); // This would come from auth middleware

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!itemId || !voteType) {
      return NextResponse.json(
        { error: 'Item ID and vote type are required' },
        { status: 400 }
      );
    }

    // For now, we'll handle voting for posts and gallery images
    // In a real implementation, you'd need to determine the item type first
    
    // Check if it's a post
    const post = await prisma.post.findUnique({
      where: { id: itemId },
      select: { id: true, votes: true }
    });

    if (post) {
      const currentVotes = JSON.parse(post.votes);
      
      // Update vote counts
      if (voteType === 'up') {
        currentVotes.upvotes += 1;
      } else {
        currentVotes.downvotes += 1;
      }

      await prisma.post.update({
        where: { id: itemId },
        data: { votes: JSON.stringify(currentVotes) }
      });

      return NextResponse.json({
        votes: currentVotes,
        userVote: voteType
      });
    }

    // Check if it's a gallery image
    const galleryImage = await prisma.galleryImage.findUnique({
      where: { id: itemId },
      select: { id: true, votes: true }
    });

    if (galleryImage) {
      const currentVotes = JSON.parse(galleryImage.votes);
      
      // Update vote counts
      if (voteType === 'up') {
        currentVotes.upvotes += 1;
      } else {
        currentVotes.downvotes += 1;
      }

      await prisma.galleryImage.update({
        where: { id: itemId },
        data: { votes: JSON.stringify(currentVotes) }
      });

      return NextResponse.json({
        votes: currentVotes,
        userVote: voteType
      });
    }

    return NextResponse.json(
      { error: 'Item not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error voting on feed item:', error);
    return NextResponse.json(
      { error: 'Failed to vote' },
      { status: 500 }
    );
  }
}
