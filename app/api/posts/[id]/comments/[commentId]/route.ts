import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';

function ensureIso(raw: any) {
  if (!raw) return new Date().toISOString();
  return typeof raw === 'string' ? raw : new Date(raw).toISOString();
}

function hasColumn(row: Record<string, any> | null | undefined, column: string) {
  return !!row && Object.prototype.hasOwnProperty.call(row, column);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: postId, commentId } = await params;
    const { voteType, userId } = await request.json();

    if (!userId || !voteType || !['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json(
        { error: 'Vote type and user ID are required' },
        { status: 400 }
      );
    }

    const { data: commentRow, error: commentError } = await supabaseAdmin
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .eq('post_id', postId)
      .maybeSingle();

    if (commentError) {
      console.error('Error fetching comment for vote:', commentError);
      return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
    }

    if (!commentRow) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from('comment_likes')
      .select('id, vote_type')
      .match({ comment_id: commentId, user_id: userId })
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingError) {
      console.error('Error checking existing comment vote:', existingError);
      return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
    }

    const existing = existingRows?.[0] ?? null;
    let finalVote: 'upvote' | 'downvote' | null = voteType as 'upvote' | 'downvote';

    if (existing && existing.vote_type === voteType) {
      const { error: deleteError } = await supabaseAdmin
        .from('comment_likes')
        .delete()
        .eq('id', existing.id);
      if (deleteError) {
        console.error('Error removing comment vote:', deleteError);
        return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
      }
      finalVote = null;
    } else if (!existing) {
      const { error: insertError } = await supabaseAdmin
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userId,
          vote_type: voteType
        });
      if (insertError) {
        console.error('Error inserting comment vote:', insertError);
        return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
      }
    } else {
      const { error: updateError } = await supabaseAdmin
        .from('comment_likes')
        .update({ vote_type: voteType })
        .eq('id', existing.id);
      if (updateError) {
        console.error('Error updating comment vote:', updateError);
        return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
      }
    }

    const [upResult, downResult] = await Promise.all([
      supabaseAdmin
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .match({ comment_id: commentId, vote_type: 'upvote' }),
      supabaseAdmin
        .from('comment_likes')
        .select('*', { count: 'exact', head: true })
        .match({ comment_id: commentId, vote_type: 'downvote' }),
    ]);

    const upvotes = upResult.error ? 0 : upResult.count ?? 0;
    const downvotes = downResult.error ? 0 : downResult.count ?? 0;

    if (upResult.error) console.error('Error counting comment upvotes:', upResult.error);
    if (downResult.error) console.error('Error counting comment downvotes:', downResult.error);

    const authorId = commentRow.author_id ?? commentRow.authorId ?? null;
    let authorProfile: any = null;
    if (authorId) {
      const { data: authorData, error: authorError } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar, xp, title')
        .eq('id', authorId)
        .maybeSingle();
      if (authorError) {
        console.error('Error fetching comment author:', authorError);
      } else {
        authorProfile = authorData;
      }
    }

    if (finalVote === 'upvote' && authorId && authorId !== userId) {
      try {
        await createNotification({
          userId: authorId,
          type: 'like',
          actorId: userId,
          entityType: 'comment',
          entityId: commentId,
          url: `/forums/post/${postId}#comment-${commentId}`,
          message: `Someone liked your comment`,
        });
      } catch (notifyError) {
        console.error('Error sending comment like notification:', notifyError);
      }
    }

    const formattedComment = {
      id: commentRow.id,
      content: commentRow.content,
      postId: commentRow.post_id ?? commentRow.postId ?? postId,
      author: {
        id: authorId,
        name: authorProfile?.username || 'Unknown',
        avatar: authorProfile?.avatar || null,
        reputation: authorProfile?.xp ?? 0,
        title: authorProfile?.title ?? null
      },
      createdAt: ensureIso(commentRow.created_at ?? commentRow.createdAt),
      votes: { upvotes, downvotes },
      userVote: finalVote,
      isModerated: hasColumn(commentRow, 'isModerated') ? commentRow.isModerated : true,
      moderationResult: commentRow.moderationResult ?? null
    };

    return NextResponse.json({
      success: true,
      comment: formattedComment,
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

    const { data: commentRow, error: commentError } = await supabaseAdmin
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .eq('post_id', postId)
      .maybeSingle();

    if (commentError) {
      console.error('Error fetching comment for delete:', commentError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    if (!commentRow) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const authorId = commentRow.author_id ?? commentRow.authorId;
    if (authorId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this comment' },
        { status: 403 }
      );
    }

    const { error: deleteLikesError } = await supabaseAdmin
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId);

    if (deleteLikesError) {
      console.error('Error deleting comment votes:', deleteLikesError);
    }

    const { error: deleteCommentError } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteCommentError) {
      console.error('Error deleting comment:', deleteCommentError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    const { count: repliesCount, error: repliesError } = await supabaseAdmin
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (repliesError) {
      console.error('Error counting remaining replies:', repliesError);
    }

    const { data: postRow, error: postError } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (postError) {
      console.error('Error fetching post for replies update:', postError);
    }

    const updatePayload: Record<string, number> = {};
    const replyTotal = repliesCount ?? 0;

    if (hasColumn(postRow, 'replies')) {
      updatePayload.replies = replyTotal;
    }
    if (hasColumn(postRow, 'replies_count')) {
      updatePayload.replies_count = replyTotal;
    }
    if (Object.keys(updatePayload).length === 0) {
      updatePayload.replies = replyTotal;
    }

    const { error: updatePostError } = await supabaseAdmin
      .from('posts')
      .update(updatePayload)
      .eq('id', postId);

    if (updatePostError) {
      console.error('Error updating post replies count after delete:', updatePostError);
    }

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
