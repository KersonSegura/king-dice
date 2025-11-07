import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // 1. Fetch gallery image (camelCase first, then snake_case fallback)
    let galleryImage: any = null;
    let galleryError = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('gallery_images')
        .select('id, authorId, comments')
        .eq('id', imageId)
        .maybeSingle();
      galleryImage = data;
      galleryError = error;
    } catch (err) {
      galleryError = err as any;
    }

    if ((!galleryImage || galleryError?.code === '42703') && !galleryImage) {
      const { data, error } = await supabaseAdmin
        .from('gallery_images')
        .select('id, author_id, comments')
        .eq('id', imageId)
        .maybeSingle();
      galleryImage = data
        ? {
            id: data.id,
            authorId: data.author_id,
            comments: data.comments
          }
        : null;
      galleryError = error;
    }

    if (galleryError) {
      console.error('Error fetching gallery image:', galleryError);
    }

    if (!galleryImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // 2. Fetch comments with fallback for column names
    let commentsData: any[] = [];
    let commentsFormat: 'camel' | 'snake' = 'camel';
    try {
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select('id, content, galleryImageId, authorId, createdAt, parentId')
        .eq('galleryImageId', imageId)
        .is('parentId', null)
        .order('createdAt', { ascending: false });
      if (error) {
        if (error.code === '42703') {
          const retry = await supabaseAdmin
            .from('comments')
            .select('id, content, gallery_image_id, author_id, created_at, parent_id')
            .eq('gallery_image_id', imageId)
            .is('parent_id', null)
            .order('created_at', { ascending: false });
          if (!retry.error && retry.data) {
            commentsData = retry.data;
            commentsFormat = 'snake';
          } else if (retry.error) {
            console.error('Error fetching gallery comments (snake_case):', retry.error);
          }
        } else {
          console.error('Error fetching gallery comments:', error);
        }
      } else if (data) {
        commentsData = data;
      }
    } catch (err) {
      console.error('Unexpected error fetching gallery comments:', err);
    }

    // 3. Fetch author info
    const authorIds = Array.from(
      new Set(
        (commentsData || []).map((c: any) =>
          commentsFormat === 'camel' ? c.authorId : c.author_id
        ).filter(Boolean)
      )
    );
    let authorMap = new Map<string, any>();
    if (authorIds.length > 0) {
      const { data: authors, error: authorsError } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar, title')
        .in('id', authorIds);

      if (authorsError) {
        console.error('Error fetching gallery comment authors:', authorsError);
      } else if (authors) {
        authorMap = new Map(authors.map((u: any) => [u.id, u]));
      }
    }

    const formattedComments = (commentsData || []).map((comment: any) => {
      const authorId = commentsFormat === 'camel' ? comment.authorId : comment.author_id;
      const createdAt = commentsFormat === 'camel' ? comment.createdAt : comment.created_at;
      const author = authorMap.get(authorId) || {};
      return {
        id: comment.id,
        content: comment.content,
        author: {
          id: authorId,
          name: author.username || 'Unknown',
          avatar: author.avatar || null,
          title: author.title || null
        },
        createdAt: typeof createdAt === 'string'
          ? createdAt
          : createdAt?.toISOString?.() || new Date().toISOString(),
        likes: 0,
        userLiked: false,
        replies: []
      };
    });

    return NextResponse.json({
      comments: formattedComments,
      totalComments: galleryImage.comments ?? formattedComments.length
    });
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

    const moderationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/moderate/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content })
    });

    const moderationResult = await moderationResponse.json();

    if (!moderationResult.isAppropriate) {
      return NextResponse.json(
        {
          error: 'Content was flagged as inappropriate',
          flags: moderationResult.flags,
          reason: moderationResult.reason
        },
        { status: 400 }
      );
    }

    // Fetch gallery image (camelCase then snake_case)
    let galleryImage: any = null;
    let galleryError = null;
    try {
      const { data, error } = await supabaseAdmin
        .from('gallery_images')
        .select('id, authorId, comments')
        .eq('id', imageId)
        .maybeSingle();
      galleryImage = data;
      galleryError = error;
    } catch (err) {
      galleryError = err as any;
    }

    if ((!galleryImage || galleryError?.code === '42703') && !galleryImage) {
      const { data, error } = await supabaseAdmin
        .from('gallery_images')
        .select('id, author_id, comments')
        .eq('id', imageId)
        .maybeSingle();
      galleryImage = data
        ? { id: data.id, authorId: data.author_id, comments: data.comments }
        : null;
      galleryError = error;
    }

    if (galleryError) {
      console.error('Error fetching gallery image:', galleryError);
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

    // Insert comment camelCase first then fallback
    let newComment: any = null;
    let insertError = null;
    try {
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
        .select('id, content, galleryImageId, authorId, createdAt')
        .single();
      newComment = data;
      insertError = error;
    } catch (err) {
      insertError = err as any;
    }

    if ((!newComment || insertError?.code === '42703') && !newComment) {
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
        .select('id, content, gallery_image_id, author_id, created_at')
        .single();
      newComment = data
        ? {
            id: data.id,
            content: data.content,
            galleryImageId: data.gallery_image_id,
            authorId: data.author_id,
            createdAt: data.created_at
          }
        : null;
      insertError = error;
    }

    if (insertError || !newComment) {
      console.error('Error creating gallery comment:', insertError);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    const newCommentCount = (galleryImage.comments || 0) + 1;
    const { error: updateError } = await supabaseAdmin
      .from('gallery_images')
      .update({ comments: newCommentCount })
      .eq('id', imageId);

    if (updateError) {
      console.error('Error updating gallery comment count:', updateError);
    }

    try {
      const xpResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/reputation/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: author.id,
          userName: author.name,
          action: 'COMMENT_GALLERY',
          contentId: newComment.id
        })
      });

      if (xpResponse.ok) {
        const xpResult = await xpResponse.json();

        if (xpResult.dailyLimitReached) {
          return NextResponse.json(
            { error: 'Daily comment limit reached. Try again tomorrow.' },
            { status: 429 }
          );
        }

        if (xpResult.spamBlocked) {
          return NextResponse.json(
            { error: 'Please wait before commenting again.' },
            { status: 429 }
          );
        }

        if (xpResult.leveledUp) {
          console.log(`🎉 ${author.name} leveled up to level ${xpResult.newLevel} from commenting on gallery!`);
        }
      } else {
        const errorData = await xpResponse.json();
        if (errorData.error?.includes('Daily limit') || errorData.error?.includes('Please wait')) {
          return NextResponse.json(
            { error: errorData.error },
            { status: 429 }
          );
        }
      }
    } catch (xpError) {
      console.error('Error awarding XP for gallery comment:', xpError);
    }

    try {
      const receiverId = galleryImage.authorId;
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
    } catch {}

    return NextResponse.json({
      comment: {
        id: newComment.id,
        content: newComment.content,
        galleryImageId: newComment.galleryImageId,
        author: {
          id: author.id,
          name: author.name,
          avatar: author.avatar || null,
          title: author.title || null
        },
        createdAt: newComment.createdAt
      },
      totalComments: newCommentCount,
      moderationResult: {
        isAppropriate: true,
        confidence: moderationResult.confidence
      }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
