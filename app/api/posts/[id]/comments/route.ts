import { NextRequest, NextResponse } from 'next/server';
import { awardXP } from '@/lib/reputation';
import { createNotification } from '@/lib/notifications';
import { moderateText } from '@/lib/moderation';
import { supabaseAdmin } from '@/lib/supabase';

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
    
    // Verify post exists in Supabase
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();
    
    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get comments from Supabase
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('comments')
      .select('id, content, postId, authorId, createdAt, updatedAt')
      .eq('postId', postId)
      .order('createdAt', { ascending: sortBy !== 'newest' });
    
    if (commentsError) {
      throw commentsError;
    }

    // Format comments
    const commentAuthorIds = Array.from(new Set((comments || []).map((c: any) => c.authorId).filter(Boolean)));
    let commentAuthorMap = new Map<string, any>();
    if (commentAuthorIds.length > 0) {
      const { data: commentAuthors, error: commentAuthorsError } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar, xp, title')
        .in('id', commentAuthorIds);

      if (commentAuthorsError) {
        console.error('Error fetching comment authors:', commentAuthorsError);
      } else if (commentAuthors) {
        commentAuthorMap = new Map(commentAuthors.map((u: any) => [u.id, u]));
      }
    }

    const formattedComments = (comments || []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      postId: comment.postId,
      author: {
        id: comment.authorId,
        name: commentAuthorMap.get(comment.authorId)?.username || 'Unknown',
        avatar: commentAuthorMap.get(comment.authorId)?.avatar || null,
        reputation: commentAuthorMap.get(comment.authorId)?.xp ?? 0,
        title: commentAuthorMap.get(comment.authorId)?.title || null
      },
      createdAt: typeof comment.createdAt === 'string' ? comment.createdAt : comment.createdAt.toISOString(),
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

    // Verify post exists in Supabase
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, authorId')
      .eq('id', postId)
      .single();
    
    if (postError || !post) {
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

    // Generate CUID for comment
    const timestampCuid = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestampCuid}${counter}${fingerprint}${random}`.substring(0, 25);
    
    const now = new Date().toISOString();
    
    // Create comment in Supabase
    const { data: newComment, error: createError } = await supabaseAdmin
      .from('comments')
      .insert({
        id: generatedId,
        content: content.trim(),
        authorId: author.id,
        postId,
        createdAt: now,
        updatedAt: now
      })
      .select('id, content, postId, authorId, createdAt')
      .single();
    
    if (createError || !newComment) {
      throw new Error(`Failed to create comment: ${createError?.message || 'Unknown error'}`);
    }
    
    // Update post's replies count in Supabase
    const { data: currentPost } = await supabaseAdmin
      .from('posts')
      .select('replies')
      .eq('id', postId)
      .single();
    
    await supabaseAdmin
      .from('posts')
      .update({ replies: (currentPost?.replies || 0) + 1 })
      .eq('id', postId);
    
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
      const postAuthorId = post.authorId;
      if (postAuthorId && postAuthorId !== author.id) {
        await createNotification({
          userId: postAuthorId,
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
        id: author.id,
        name: author.name,
        avatar: author.avatar || null,
        reputation: author.reputation || 0,
        title: author.title || null
      },
      createdAt: typeof newComment.createdAt === 'string' ? newComment.createdAt : newComment.createdAt?.toISOString?.() || now,
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