import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for comments (in production, this would be a database)
let comments: any[] = [];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const { commentId } = params;
    const { voteType } = await request.json();
    
    if (voteType === undefined || !['up', 'down', null].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      );
    }

    // Find the comment
    const commentIndex = comments.findIndex(comment => comment.id === commentId);
    if (commentIndex === -1) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const comment = comments[commentIndex];
    const currentVote = comment.userVote;
    
    // Calculate vote changes
    let upvoteChange = 0;
    let downvoteChange = 0;
    
    if (currentVote === voteType) {
      // Remove vote
      if (voteType === 'up') upvoteChange = -1;
      else if (voteType === 'down') downvoteChange = -1;
    } else {
      // Add new vote
      if (voteType === 'up') upvoteChange = 1;
      else if (voteType === 'down') downvoteChange = 1;
      
      // Remove previous vote if exists
      if (currentVote === 'up') upvoteChange -= 1;
      else if (currentVote === 'down') downvoteChange -= 1;
    }

    const updatedComment = {
      ...comment,
      userVote: voteType,
      votes: {
        upvotes: comment.votes.upvotes + upvoteChange,
        downvotes: comment.votes.downvotes + downvoteChange
      }
    };

    comments[commentIndex] = updatedComment;
    
    return NextResponse.json({ 
      success: true, 
      comment: updatedComment
    });
  } catch (error) {
    console.error('Error updating comment vote:', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
} 