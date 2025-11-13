import { NextRequest, NextResponse } from 'next/server';
import { awardXP } from '@/lib/reputation';
import { createNotification } from '@/lib/notifications';
import { moderateText } from '@/lib/moderation';
import { supabaseAdmin } from '@/lib/supabase';

async function detectCommentCasing() {
  try {
    const { data } = await supabaseAdmin
      .from('comments')
      .select('*')
      .limit(1);
    if (data && data.length > 0) {
      return Object.prototype.hasOwnProperty.call(data[0], 'postId');
    }
  } catch (error) {
    console.error('detectCommentCasing (posts) error:', error);
  }
  return false;
}

function hasColumn(row: Record<string, any> | null | undefined, column: string) {
  return !!row && Object.prototype.hasOwnProperty.call(row, column);
}

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

    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: sortBy !== 'newest' });

    if (commentsError) {
      throw commentsError;
    }

    const commentAuthorIds = Array.from(new Set((comments || []).map((c: any) => c.author_id ?? c.authorId).filter(Boolean)));
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

    const formattedComments = (comments || []).map((comment: any) => {
      const authorId = comment.author_id ?? comment.authorId;
      const createdAtRaw = comment.created_at ?? comment.createdAt ?? new Date().toISOString();
      return {
        id: comment.id,
        content: comment.content,
        postId: comment.post_id ?? comment.postId,
        author: {
          id: authorId,
          name: commentAuthorMap.get(authorId)?.username || 'Unknown',
          avatar: commentAuthorMap.get(authorId)?.avatar || null,
          reputation: commentAuthorMap.get(authorId)?.xp ?? 0,
          title: commentAuthorMap.get(authorId)?.title || null
        },
        createdAt: typeof createdAtRaw === 'string' ? createdAtRaw : new Date(createdAtRaw).toISOString(),
        votes: { upvotes: 0, downvotes: 0 },
        userVote: null,
        isModerated: true
      };
    });

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

    if (!content?.trim() || !author) {
      return NextResponse.json(
        { error: 'Content and author are required' },
        { status: 400 }
      );
    }

    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

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

    const timestampCuid = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestampCuid}${counter}${fingerprint}${random}`.substring(0, 25);

    const now = new Date().toISOString();

    const insertCamel = {
      id: generatedId,
      content: content.trim(),
      authorId: author.id,
      postId,
      createdAt: now,
      updatedAt: now
    };

    const insertSnake = {
      id: generatedId,
      content: content.trim(),
      author_id: author.id,
      post_id: postId,
      created_at: now,
      updated_at: now
    };

    const selectCamel = 'id, content, postId, authorId, createdAt';
    const selectSnake = 'id, content, post_id, author_id, created_at';

    const useCamelCase = await detectCommentCasing();

    const runInsert = async (useCamel: boolean) =>
      supabaseAdmin
        .from('comments')
        .insert(useCamel ? insertCamel : insertSnake)
        .select(useCamel ? selectCamel : selectSnake)
        .single();

    let insertResult = await runInsert(useCamelCase);
    if (
      insertResult.error &&
      (insertResult.error.code === '42703' || insertResult.error.code === 'PGRST204')
    ) {
      insertResult = await runInsert(!useCamelCase);
    }

    const { data: newComment, error: createError } = insertResult;

    if (createError || !newComment) {
      throw new Error(`Failed to create comment: ${createError?.message || 'Unknown error'}`);
    }

    const currentReplies = (post.replies ?? post.replies_count ?? 0) + 1;
    const updatePayload: Record<string, number> = {};
    if (hasColumn(post, 'replies')) {
      updatePayload.replies = currentReplies;
    }
    if (hasColumn(post, 'replies_count')) {
      updatePayload.replies_count = currentReplies;
    }
    if (Object.keys(updatePayload).length === 0) {
      updatePayload.replies = currentReplies;
    }

    const { error: updateRepliesError } = await supabaseAdmin
      .from('posts')
      .update(updatePayload)
      .eq('id', postId);

    if (updateRepliesError) {
      console.error('Error updating replies count for post:', updateRepliesError);
    }

    const postAuthorId = post.author_id ?? post.authorId;
    if (postAuthorId && postAuthorId !== author.id) {
      try {
        await createNotification({
          userId: postAuthorId,
          type: 'comment',
          actorId: author.id,
          entityType: 'post',
          entityId: postId,
          url: `/forums/post/${postId}#comment-${newComment.id}`,
          message: `${author.name} commented on your post`,
        });
      } catch (notifyError) {
        console.error('Error sending post comment notification:', notifyError);
      }
    }

    try {
      const xpResult = await awardXP(
        author.id,
        author.name,
        'REPLY_DISCUSSION',
        newComment.id
      );
      if (xpResult?.leveledUp) {
        console.log(`🎉 ${author.name} leveled up to level ${xpResult.newLevel} from replying to a discussion!`);
      }
    } catch (xpError) {
      console.error('Error awarding XP for post comment:', xpError);
    }

    const formattedComment = {
      id: newComment.id,
      content: newComment.content,
      postId: newComment.postId ?? newComment.post_id ?? postId,
      author: {
        id: author.id,
        name: author.name,
        avatar: author.avatar || null,
        reputation: author.reputation || 0,
        title: author.title || null
      },
      createdAt: newComment.createdAt ?? newComment.created_at ?? now,
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