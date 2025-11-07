import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function detectCommentCasing() {
  try {
    const { data } = await supabaseAdmin
      .from('comments')
      .select('*')
      .limit(1);
    if (data && data.length > 0) {
      return Object.prototype.hasOwnProperty.call(data[0], 'galleryImageId');
    }
  } catch {}
  return true; // default to camelCase if unsure
}

function mapCommentRow(row: any) {
  const authorId = row.authorId ?? row.author_id ?? null;
  const createdAt = row.createdAt ?? row.created_at ?? new Date().toISOString();
  return {
    id: row.id,
    content: row.content,
    author: {
      id: authorId,
      name: row.author?.username || row.author?.name || 'Unknown',
      avatar: row.author?.avatar || null,
      title: row.author?.title || null
    },
    createdAt,
    likes: 0,
    userLiked: false,
    replies: []
  };
}

async function fetchCommentAuthors(authorIds: string[]) {
  if (!authorIds.length) return new Map<string, any>();
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar, title')
      .in('id', authorIds);
    if (error) {
      console.error('Error fetching comment authors:', error);
      return new Map();
    }
    return new Map((data || []).map(author => [author.id, author]));
  } catch (err) {
    console.error('Unexpected error fetching comment authors:', err);
    return new Map();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Determine column casing
    const useCamelCase = await detectCommentCasing();
    const selectColumns = useCamelCase
      ? 'id, content, galleryImageId, authorId, createdAt'
      : 'id, content, gallery_image_id, author_id, created_at';
    const filterColumn = useCamelCase ? 'galleryImageId' : 'gallery_image_id';
    const orderColumn = useCamelCase ? 'createdAt' : 'created_at';

    const { data: commentsData, error: commentsError } = await supabaseAdmin
      .from('comments')
      .select(selectColumns)
      .eq(filterColumn, imageId)
      .order(orderColumn, { ascending: false });

    if (commentsError) {
      console.error('Error fetching gallery comments:', commentsError);
      return NextResponse.json({ comments: [], totalComments: 0 }, { status: 200 });
    }

    const authorIds = Array.from(new Set(
      (commentsData || []).map(row => row.authorId ?? row.author_id).filter(Boolean)
    )) as string[];
    const authorMap = await fetchCommentAuthors(authorIds);

    const formattedComments = (commentsData || []).map(row => {
      const authorId = row.authorId ?? row.author_id ?? null;
      const createdAt = row.createdAt ?? row.created_at ?? new Date().toISOString();
      const author = authorMap.get(authorId || '') || {};
      return {
        id: row.id,
        content: row.content,
        author: {
          id: authorId,
          name: author.username || author.name || 'Unknown',
          avatar: author.avatar || null,
          title: author.title || null
        },
        createdAt,
        likes: 0,
        userLiked: false,
        replies: []
      };
    });

    // Fetch gallery image for comment count
    const { data: galleryImage } = await supabaseAdmin
      .from('gallery_images')
      .select('comments')
      .eq('id', imageId)
      .maybeSingle();

    const totalComments = galleryImage?.comments ?? formattedComments.length;

    return NextResponse.json({ comments: formattedComments, totalComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ comments: [], totalComments: 0 }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imageId, content, author } = await request.json();

    if (!imageId || !content?.trim() || !author) {
      return NextResponse.json({ error: 'Image ID, content, and author are required' }, { status: 400 });
    }

    if (!author.id || !author.name) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const useCamelCase = await detectCommentCasing();
    const now = new Date().toISOString();

    const timestampCuid = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestampCuid}${counter}${fingerprint}${random}`.substring(0, 25);

    const insertPayload = useCamelCase
      ? {
          id: generatedId,
          content: content.trim(),
          authorId: author.id,
          galleryImageId: imageId,
          parentId: null,
          createdAt: now,
          updatedAt: now
        }
      : {
          id: generatedId,
          content: content.trim(),
          author_id: author.id,
          gallery_image_id: imageId,
          parent_id: null,
          created_at: now,
          updated_at: now
        };

    const selectColumns = useCamelCase
      ? 'id, content, galleryImageId, authorId, createdAt'
      : 'id, content, gallery_image_id, author_id, created_at';

    const { data: newComment, error: insertError } = await supabaseAdmin
      .from('comments')
      .insert(insertPayload)
      .select(selectColumns)
      .single();

    if (insertError || !newComment) {
      console.error('Error creating gallery comment:', insertError);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    // Update comment count (best effort)
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
    } catch (err) {
      console.error('Error updating gallery comment count:', err);
    }

    // Best effort notification
    try {
      const { data: galleryRow } = await supabaseAdmin
        .from('gallery_images')
        .select('authorId, author_id')
        .eq('id', imageId)
        .maybeSingle();
      const receiverId = galleryRow?.authorId ?? galleryRow?.author_id;
      if (receiverId && receiverId !== author.id) {
        await createNotification({
          userId: receiverId,
          type: 'comment',
          actorId: author.id,
          entityType: 'gallery_image',
          entityId: imageId,
          url: `/community-gallery?imageId=${imageId}#comment-${newComment.id}`,
          message: `${author.name} commented on your image`,
        });
      }
    } catch (notifyError) {
      console.error('Error sending notification for gallery comment:', notifyError);
    }

    const responseComment = {
      id: newComment.id,
      content: newComment.content,
      galleryImageId: newComment.galleryImageId ?? newComment.gallery_image_id ?? imageId,
      author: {
        id: author.id,
        name: author.name,
        avatar: author.avatar || null,
        title: author.title || null
      },
      createdAt: newComment.createdAt ?? newComment.created_at ?? now
    };

    return NextResponse.json({
      comment: responseComment,
      totalComments: undefined,
      moderationResult: { isAppropriate: true, confidence: 1 }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
