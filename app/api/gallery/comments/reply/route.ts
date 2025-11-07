import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { awardXP } from '@/lib/reputation';
import { createNotification } from '@/lib/notifications';

function rewriteStorageUrl(origin: string | undefined, url?: string | null) {
  if (!url) return url ?? null;
  if (!origin) return url;
  if (url.startsWith('http') && url.includes('.supabase.co')) return url;
  if (url.startsWith('/gallery/')) {
    const rel = url.replace('/gallery/', '');
    return `${origin}/storage/v1/object/public/gallery/${rel}`;
  }
  if (url.startsWith('/rules-images/')) {
    const rel = url.replace('/rules-images/', '');
    return `${origin}/storage/v1/object/public/rules-images/${rel}`;
  }
  if (url.startsWith('/uploads/')) {
    const filename = url.replace('/uploads/', '');
    return `${origin}/storage/v1/object/public/uploads/uploads/${filename}`;
  }
  return url;
}

// POST /api/gallery/comments/reply - Reply to a comment
export async function POST(request: NextRequest) {
  try {
    const { commentId, content, author } = await request.json();

    if (!commentId || !content?.trim() || !author) {
      return NextResponse.json({ error: 'Comment ID, content, and author are required' }, { status: 400 });
    }

    if (!author.id || !author.name) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: parentComment, error: parentError } = await supabaseAdmin
      .from('comments')
      .select('id, gallery_image_id, author_id')
      .eq('id', commentId)
      .maybeSingle();

    if (parentError) {
      console.error('Error fetching parent comment for reply:', parentError);
      return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 });
    }

    if (!parentComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const imageId = parentComment.gallery_image_id;

    if (!imageId) {
      return NextResponse.json({ error: 'Parent comment is missing gallery image association' }, { status: 400 });
    }

    const timestampCuid = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestampCuid}${counter}${fingerprint}${random}`.substring(0, 25);
    const now = new Date().toISOString();

    const insertPayloadCamel = {
      id: generatedId,
      content: content.trim(),
      authorId: author.id,
      galleryImageId: imageId,
      parentId: commentId,
      createdAt: now,
      updatedAt: now
    };

    const insertPayloadSnake = {
      id: generatedId,
      content: content.trim(),
      author_id: author.id,
      gallery_image_id: imageId,
      parent_id: commentId,
      created_at: now,
      updated_at: now
    };

    const runInsert = async (useCamel: boolean) =>
      supabaseAdmin
        .from('comments')
        .insert(useCamel ? insertPayloadCamel : insertPayloadSnake)
        .select(useCamel ? 'id, content, authorId, galleryImageId, parentId, createdAt' : 'id, content, author_id, gallery_image_id, parent_id, created_at')
        .single();

    let insertResult = await runInsert(true);
    if (insertResult.error && insertResult.error.code === '42703') {
      insertResult = await runInsert(false);
    }

    const { data: replyRow, error: insertError } = insertResult;

    if (insertError || !replyRow) {
      console.error('Error creating reply:', insertError);
      return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 });
    }

    try {
      const { data: galleryRow } = await supabaseAdmin
        .from('gallery_images')
        .select('comments')
        .eq('id', imageId)
        .maybeSingle();
      const currentCount = galleryRow?.comments ?? 0;
      await supabaseAdmin
        .from('gallery_images')
        .update({ comments: currentCount + 1 })
        .eq('id', imageId);
    } catch (countError) {
      console.error('Error updating gallery comment count after reply:', countError);
    }

    try {
      const parentAuthorId = parentComment.author_id;
      if (parentAuthorId && parentAuthorId !== author.id) {
        await createNotification({
          userId: parentAuthorId,
          type: 'comment',
          actorId: author.id,
          entityType: 'comment',
          entityId: commentId,
          url: `/community-gallery?imageId=${imageId}#comment-${commentId}`,
          message: `${author.name} replied to your comment`
        });
      }
    } catch (notifyError) {
      console.error('Error sending reply notification:', notifyError);
    }

    try {
      await awardXP(author.id, author.name, 'COMMENT_GALLERY', generatedId);
    } catch (xpError) {
      console.error('Error awarding XP for comment reply:', xpError);
    }

    let authorDetails = author;
    try {
      const { data: authorRow } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar, xp, title')
        .eq('id', author.id)
        .maybeSingle();
      if (authorRow) {
        authorDetails = {
          id: authorRow.id,
          name: authorRow.username || author.name,
          avatar: authorRow.avatar || author.avatar,
          reputation: authorRow.xp ?? 0,
          title: authorRow.title
        };
      }
    } catch (authorError) {
      console.error('Error fetching author details for reply:', authorError);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const replyComment = {
      id: replyRow.id,
      content: replyRow.content ?? content.trim(),
      author: {
        id: authorDetails.id,
        name: authorDetails.name,
        avatar: authorDetails.avatar || null,
        reputation: authorDetails.reputation ?? 0,
        title: authorDetails.title ?? null
      },
      createdAt: replyRow.createdAt ?? replyRow.created_at ?? now,
      isEdited: false,
      likes: 0,
      userLiked: false,
      replies: [] as any[]
    };

    replyComment.author.avatar = replyComment.author.avatar
      ? supabaseUrl
        ? replyComment.author.avatar.startsWith('http')
          ? replyComment.author.avatar
          : rewriteStorageUrl(supabaseUrl, replyComment.author.avatar)
        : replyComment.author.avatar
      : null;

    return NextResponse.json({
      success: true,
      reply: replyComment,
      moderationResult: {
        isAppropriate: true,
        confidence: 1
      }
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
    return NextResponse.json({ error: 'Failed to reply to comment' }, { status: 500 });
  }
}
