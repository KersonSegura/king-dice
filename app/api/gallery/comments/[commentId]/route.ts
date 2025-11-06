import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/gallery/comments/[commentId] - Delete a comment

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Find the comment in database
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });
    
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is the author of the comment
    if (comment.authorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this comment' }, { status: 403 });
    }

    // Delete comment from database
    await prisma.comment.delete({
      where: { id: commentId }
    });

    // Update gallery image comment count
    if (comment.galleryImageId) {
      await prisma.galleryImage.update({
        where: { id: comment.galleryImageId },
        data: {
          comments: {
            decrement: 1
          }
        }
      });
    }

    console.log(`Gallery comment deleted: ${commentId} by user ${userId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
