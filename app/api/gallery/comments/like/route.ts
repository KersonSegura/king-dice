import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/gallery/comments/like - Like/unlike a comment
export async function POST(request: NextRequest) {
  try {
    const { commentId, userId } = await request.json();

    if (!commentId || !userId) {
      return NextResponse.json({ error: 'Comment ID and User ID are required' }, { status: 400 });
    }

    const { data: commentRow, error: commentError } = await supabaseAdmin
      .from('comments')
      .select('id, parentId, parent_id')
      .eq('id', commentId)
      .maybeSingle();

    if (commentError) {
      console.error('Error fetching comment for like:', commentError);
      return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
    }

    if (!commentRow) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const parentId = commentRow.parentId ?? commentRow.parent_id ?? null;

    const { data: existingLike, error: existingError } = await supabaseAdmin
      .from('comment_likes')
      .select('id, vote_type')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing comment like:', existingError);
      return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
    }

    let isLiked = false;

    if (existingLike) {
      await supabaseAdmin
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);
      isLiked = false;
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('comment_likes')
        .insert({
          user_id: userId,
          comment_id: commentId,
          vote_type: 'upvote'
        });
      if (insertError) {
        console.error('Error inserting comment like:', insertError);
        return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
      }
      isLiked = true;
    }

    const { count: likeCount, error: countError } = await supabaseAdmin
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .match({ comment_id: commentId, vote_type: 'upvote' });

    if (countError) {
      console.error('Error counting comment likes:', countError);
      return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      likes: likeCount || 0,
      isLiked,
      isReply: Boolean(parentId)
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
  }
}
