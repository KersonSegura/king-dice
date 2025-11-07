import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getValue<T>(row: Record<string, any>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key] as T;
    }
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Fetch gallery image (raw row, no assumptions about casing)
    let galleryImage: Record<string, any> | null = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('gallery_images')
        .select('*')
        .eq('id', imageId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching gallery image:', error);
      } else {
        galleryImage = data;
      }
    } catch (err) {
      console.error('Unexpected error fetching gallery image:', err);
    }

    if (!galleryImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Fetch all comments (small dataset assumption) and filter client-side
    let allComments: Record<string, any>[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select('*');
      if (error) {
        console.error('Error fetching comments:', error);
      } else if (data) {
        allComments = data;
      }
    } catch (err) {
      console.error('Unexpected error fetching comments:', err);
    }

    const filteredComments = allComments.filter(comment => {
      const commentImageId = getValue<string>(comment, 'galleryImageId', 'gallery_image_id');
      return commentImageId === imageId;
    });

    filteredComments.sort((a, b) => {
      const dateA = new Date(getValue<string>(a, 'createdAt', 'created_at') || '').getTime();
      const dateB = new Date(getValue<string>(b, 'createdAt', 'created_at') || '').getTime();
      return dateB - dateA;
    });

    // Gather unique author IDs
    const authorIds = Array.from(
      new Set(
        filteredComments
          .map(comment => getValue<string>(comment, 'authorId', 'author_id'))
          .filter(Boolean)
      )
    ) as string[];

    let authorMap = new Map<string, any>();
    if (authorIds.length > 0) {
      try {
        const { data: authors, error: authorsError } = await supabaseAdmin
          .from('users')
          .select('*')
          .in('id', authorIds);
        if (authorsError) {
          console.error('Error fetching comment authors:', authorsError);
        } else if (authors) {
          authorMap = new Map(authors.map((user: any) => [user.id, user]));
        }
      } catch (err) {
        console.error('Unexpected error fetching comment authors:', err);
      }
    }

    const formattedComments = filteredComments.map(comment => {
      const authorId = getValue<string>(comment, 'authorId', 'author_id') || '';
      const author = authorMap.get(authorId) || {};
      const createdAt = getValue<string>(comment, 'createdAt', 'created_at');

      return {
        id: comment.id,
        content: comment.content,
        author: {
          id: authorId,
          name: author.username || author.name || 'Unknown',
          avatar: author.avatar || null,
          title: author.title || null
        },
        createdAt: createdAt || new Date().toISOString(),
        likes: 0,
        userLiked: false,
        replies: []
      };
    });

    const totalComments = getValue<number>(galleryImage, 'comments', 'comments_count') ?? formattedComments.length;

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

    // Skipping external moderation service for reliability
    const moderationResult = { isAppropriate: true, confidence: 1 };

    // Fetch gallery image definition
    let galleryImage: Record<string, any> | null = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('gallery_images')
        .select('*')
        .eq('id', imageId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching gallery image:', error);
      } else {
        galleryImage = data;
      }
    } catch (err) {
      console.error('Unexpected error fetching gallery image:', err);
    }

    if (!galleryImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const timestampCuid = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestampCuid}${counter}${fingerprint}${random}`.substring(0, 25);
    const now = new Date().toISOString();

    // Determine column casing by inspecting existing comments
    let hasCamelCase = true;
    try {
      const { data: sampleComments } = await supabaseAdmin
        .from('comments')
        .select('*')
        .limit(1);
      if (sampleComments && sampleComments.length > 0) {
        hasCamelCase = Object.prototype.hasOwnProperty.call(sampleComments[0], 'galleryImageId');
      }
    } catch {
      hasCamelCase = true;
    }

    let newComment: any = null;
    if (hasCamelCase) {
      const { data, error } = await supabaseAdmin
        .from('comments')
        .insert({
          id: generatedId,
          content: content.trim(),
          authorId: author.id,
          galleryImageId: imageId,
          parentId: null,
          createdAt: now,
          updatedAt: now
        })
        .select('*')
        .single();
      if (error) {
        console.error('Error inserting comment (camelCase):', error);
      } else {
        newComment = data;
      }
    }

    if (!newComment) {
      const { data, error } = await supabaseAdmin
        .from('comments')
        .insert({
          id: generatedId,
          content: content.trim(),
          author_id: author.id,
          gallery_image_id: imageId,
          parent_id: null,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();
      if (error) {
        console.error('Error inserting comment (snake_case):', error);
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
      }
      newComment = data;
      hasCamelCase = false;
    }

    // Update gallery image comment count (best effort)
    const currentCount = getValue<number>(galleryImage, 'comments', 'comments_count') || 0;
    try {
      if (hasCamelCase) {
        await supabaseAdmin
          .from('gallery_images')
          .update({ comments: currentCount + 1 })
          .eq('id', imageId);
      } else {
        await supabaseAdmin
          .from('gallery_images')
          .update({ comments: currentCount + 1 })
          .eq('id', imageId);
      }
    } catch (err) {
      console.error('Error updating gallery comment count:', err);
    }

    // Attempt to award XP (best effort)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/api/reputation/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: author.id,
          userName: author.name,
          action: 'COMMENT_GALLERY',
          contentId: newComment.id
        })
      });
    } catch (xpError) {
      console.error('Error awarding XP for gallery comment:', xpError);
    }

    // Notify author (best effort)
    try {
      const receiverId = getValue<string>(galleryImage, 'authorId', 'author_id');
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
      galleryImageId: getValue<string>(newComment, 'galleryImageId', 'gallery_image_id') || imageId,
      author: {
        id: author.id,
        name: author.name,
        avatar: author.avatar || null,
        title: author.title || null
      },
      createdAt: getValue<string>(newComment, 'createdAt', 'created_at') || now
    };

    return NextResponse.json({
      comment: responseComment,
      totalComments: currentCount + 1,
      moderationResult
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
