import { NextRequest, NextResponse } from 'next/server';
import { getPostById, updatePostRepliesCount } from '@/lib/posts';
import { getCommentsByPostId, createComment } from '@/lib/comments';
import { awardXP } from '@/lib/reputation';
import { moderateText } from '@/lib/moderation';


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') as 'newest' | 'best' | 'top' || 'best';
    
    // Verify post exists
    const post = getPostById(postId);
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get comments for this post with sorting
    const postComments = getCommentsByPostId(postId, sortBy);
    
    return NextResponse.json({ comments: postComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    const { content, author } = await request.json();
    
    // Validate required fields
    if (!content?.trim() || !author) {
      return NextResponse.json(
        { error: 'Content and author are required' },
        { status: 400 }
      );
    }

    // Verify post exists
    const post = getPostById(postId);
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Moderate comment content
    const moderationResult = await moderateText(content);
    
    if (!moderationResult.isAppropriate) {
      return NextResponse.json(
        { 
          error: 'Comment was flagged as inappropriate',
          flags: moderationResult.flags 
        },
        { status: 400 }
      );
    }

    // Create new comment using persistent storage
    const newComment = createComment(postId, { content, author });
    
    // Update the post's replies count
    updatePostRepliesCount(postId);
    
    // Award XP for replying to a discussion
    if (newComment) {
      const xpResult = awardXP(
        author.id,
        author.name,
        'REPLY_DISCUSSION',
        newComment.id
      );
      
      // Log level up if it occurred (server-side)
      if (xpResult.leveledUp) {
        console.log(`🎉 ${author.name} leveled up to level ${xpResult.newLevel} from replying to a discussion!`);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      comment: newComment,
      message: 'Comment created successfully'
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
} 