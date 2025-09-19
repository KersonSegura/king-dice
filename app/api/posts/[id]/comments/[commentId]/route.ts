import { NextRequest, NextResponse } from 'next/server';
import { updateCommentVotes, deleteComment } from '@/lib/comments';
import { updatePostRepliesCount } from '@/lib/posts';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const { commentId } = params;
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
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const { id: postId, commentId } = params;
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const success = deleteComment(commentId, userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Comment not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update the post's replies count after deletion
    updatePostRepliesCount(postId);

    return NextResponse.json({ 
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
