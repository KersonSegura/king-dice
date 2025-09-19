import { NextRequest, NextResponse } from 'next/server';
import { updatePostVote } from '@/lib/posts';
import { awardXP } from '@/lib/reputation';

export async function POST(request: NextRequest) {
  try {
    const { postId, voteType, userId } = await request.json();
    
    if (!postId || !voteType || !userId) {
      return NextResponse.json(
        { error: 'Post ID, vote type, and user ID are required' },
        { status: 400 }
      );
    }

    if (!['up', 'down', null].includes(voteType)) {
      return NextResponse.json(
        { error: 'Invalid vote type' },
        { status: 400 }
      );
    }

    const updatedPost = updatePostVote(postId, voteType, userId);
    
    if (!updatedPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Award XP for voting (if voteType is not null and it's an upvote)
    if (voteType === 'up' && updatedPost.author?.id) {
      try {
        const xpResult = awardXP(
          updatedPost.author.id,
          updatedPost.author.name,
          'POST_GETS_LIKE',
          postId
        );
        
        // Log level up if it occurred (server-side)
        if (xpResult.leveledUp) {
          console.log(`🎉 ${updatedPost.author.name} leveled up to level ${xpResult.newLevel} from receiving a like!`);
        }
      } catch (xpError) {
        console.error('Error awarding XP:', xpError);
        // Don't fail the vote if XP awarding fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      post: updatedPost
    });
  } catch (error) {
    console.error('Error updating vote:', error);
    return NextResponse.json(
      { error: 'Failed to update vote' },
      { status: 500 }
    );
  }
} 