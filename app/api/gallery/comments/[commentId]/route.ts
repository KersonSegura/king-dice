import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE /api/gallery/comments/[commentId] - Delete a comment

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data: commentRow, error: commentError } = await supabaseAdmin
      .from('comments')
      .select('id, author_id, gallery_image_id')
      .eq('id', commentId)
      .maybeSingle();

    if (commentError) {
      console.error('Error fetching comment for deletion:', commentError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    if (!commentRow) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const commentAuthorId = commentRow.author_id;

    if (commentAuthorId !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this comment' }, { status: 403 });
    }

    const { data: replyRows, error: repliesError } = await supabaseAdmin
      .from('comments')
      .select('id')
      .eq('parent_id', commentId);

    if (repliesError) {
      console.error('Error fetching comment replies for deletion:', repliesError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    const deleteIds = [commentId, ...((replyRows || []).map(reply => reply.id))];

    if (deleteIds.length > 0) {
      const { error: likeDeleteError } = await supabaseAdmin
        .from('comment_likes')
        .delete()
        .in('comment_id', deleteIds);

      if (likeDeleteError) {
        console.error('Error deleting comment likes:', likeDeleteError);
      }

      const { error: commentsDeleteError } = await supabaseAdmin
        .from('comments')
        .delete()
        .in('id', deleteIds);

      if (commentsDeleteError) {
        console.error('Error deleting comments:', commentsDeleteError);
        return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
      }
    }

    const imageId = commentRow.gallery_image_id;
    if (imageId) {
      try {
        const { data: galleryRow } = await supabaseAdmin
          .from('gallery_images')
          .select('comments')
          .eq('id', imageId)
          .maybeSingle();
        const currentCount = galleryRow?.comments ?? 0;
        const nextCount = Math.max(0, currentCount - deleteIds.length);
        await supabaseAdmin
          .from('gallery_images')
          .update({ comments: nextCount })
          .eq('id', imageId);
      } catch (countError) {
        console.error('Error updating gallery comment count after delete:', countError);
      }
    }

    console.log(`Gallery comment deleted: ${commentId} by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
