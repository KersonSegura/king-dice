import { NextRequest, NextResponse } from 'next/server';
import { updateCommentVotes, getCommentsByPostId } from '@/lib/comments';
import { updatePostRepliesCount } from '@/lib/posts';
import { createNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: postId, commentId } = await params;
    const { voteType, userId } = await request.json();
    
    if (!voteType || !userId) {
      return NextResponse.json(
        { error: 'Vote type and user ID are required' },
        { status: 400 }
      );
    }

    if (voteType !== 'upvote' && voteType !== 'downvote') {
      return NextResponse.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      );
    }

    const updatedComment = updateCommentVotes(commentId, voteType, userId);
    
    if (!updatedComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Notify comment author on upvote (like)
    if (voteType === 'upvote') {
      try {
        // Find the target comment under the post
        const list = getCommentsByPostId(postId) || [];
        const stack: any[] = [...list];
        let target: any = null;
        while (stack.length) {
          const c = stack.shift();
          if (c?.id === commentId) { target = c; break; }
          if (c?.replies) stack.push(...c.replies);
        }
        if (target?.author?.id && target.author.id !== userId) {
          await createNotification({
            userId: target.author.id,
            type: 'like',
            actorId: userId,
            entityType: 'comment',
            entityId: commentId,
            url: request.nextUrl?.pathname.replace(`/comments/${commentId}`, '') + `#comment-${commentId}`,
            message: `Someone liked your comment`,
          });
        }
      } catch {}
    }

    return NextResponse.json({ 
      success: true, 
      comment: updatedComment,
      message: 'Vote updated successfully'
    });
  } catch (error) {
    console.error('Error updating comment vote:', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: postId, commentId } = await params;
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the comment in database
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });
    
    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Only allow deletion by the comment author
    if (comment.authorId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this comment' },
        { status: 403 }
      );
    }

    // Delete the comment
    await prisma.comment.delete({
      where: { id: commentId }
    });

    // Update the post's replies count after deletion
    updatePostRepliesCount(postId);

    console.log(`Forum comment deleted: ${commentId} by user ${userId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
