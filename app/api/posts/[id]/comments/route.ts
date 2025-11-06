import { NextRequest, NextResponse } from 'next/server';
import { awardXP } from '@/lib/reputation';
import { createNotification } from '@/lib/notifications';
import { moderateText } from '@/lib/moderation';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const postId = idString;
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') as 'newest' | 'best' | 'top' || 'best';
    
    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get comments from database
    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            reputation: true,
            title: true
          }
        }
      },
      orderBy: sortBy === 'newest' 
        ? { createdAt: 'desc' }
        : { createdAt: 'asc' } // For 'best' and 'top', we'll sort by votes client-side
    });

    // Format comments
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      postId: comment.postId,
      author: {
        id: comment.author.id,
        name: comment.author.username,
        avatar: comment.author.avatar,
        reputation: comment.author.reputation,
        title: comment.author.title
      },
      createdAt: comment.createdAt.toISOString(),
      votes: { upvotes: 0, downvotes: 0 }, // Will be loaded from Supabase
      userVote: null,
      isModerated: true
    }));
    
    return NextResponse.json({ comments: formattedComments });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const postId = idString;
    const { content, author } = await request.json();
    
    // Validate required fields
    if (!content?.trim() || !author) {
      return NextResponse.json(
        { error: 'Content and author are required' },
        { status: 400 }
      );
    }

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });
    
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

    // Create comment in database
    const newComment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorId: author.id,
        postId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            reputation: true,
            title: true
          }
        }
      }
    });
    
    // Update post's replies count
    await prisma.post.update({
      where: { id: postId },
      data: {
        replies: {
          increment: 1
        }
      }
    });
    
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

    // Notify post author (if different from commenter)
    try {
      if (post.author.id !== author.id) {
        await createNotification({
          userId: post.author.id,
          type: 'comment',
          actorId: author.id,
          entityType: 'post',
          entityId: postId,
          url: `/forums/post/${postId}#comment-${newComment.id}`,
          message: `${author.name} commented on your post`,
        });
      }
    } catch {}
    
    // Format response
    const formattedComment = {
      id: newComment.id,
      content: newComment.content,
      postId: newComment.postId,
      author: {
        id: newComment.author.id,
        name: newComment.author.username,
        avatar: newComment.author.avatar,
        reputation: newComment.author.reputation,
        title: newComment.author.title
      },
      createdAt: newComment.createdAt.toISOString(),
      votes: { upvotes: 0, downvotes: 0 },
      userVote: null,
      isModerated: true
    };
    
    return NextResponse.json({ 
      success: true, 
      comment: formattedComment,
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