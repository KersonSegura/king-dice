import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/gallery/comments?imageId=xxx - Get comments for an image

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Check if gallery image exists (Supabase)
    const { data: galleryImage, error: galleryError } = await supabaseAdmin
      .from('gallery_images')
      .select('id, authorId, comments')
      .eq('id', imageId)
      .maybeSingle();

    if (galleryError) {
      console.error('Error fetching gallery image:', galleryError);
    }

    if (!galleryImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    let commentsData: any[] = [];
    try {
      const { data, error: commentsError } = await supabaseAdmin
        .from('comments')
        .select('id, content, galleryImageId, authorId, createdAt, parentId')
        .eq('galleryImageId', imageId)
        .is('parentId', null)
        .order('createdAt', { ascending: false });

      if (commentsError) {
        console.error('Error fetching gallery comments:', commentsError);
      } else if (data) {
        commentsData = data;
      }
    } catch (err) {
      console.error('Unexpected error fetching gallery comments:', err);
      // commentsData stays empty so the UI still renders
    }

    // Fetch author info in a separate query
    const authorIds = Array.from(new Set((commentsData || []).map((c: any) => c.authorId).filter(Boolean)));
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

    // Format comments to match expected structure
    const formattedComments = (commentsData || []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.authorId,
        name: authorMap.get(comment.authorId)?.username || 'Unknown',
        avatar: authorMap.get(comment.authorId)?.avatar || null,
        title: authorMap.get(comment.authorId)?.title || null
      },
      createdAt: typeof comment.createdAt === 'string'
        ? comment.createdAt
        : comment.createdAt?.toISOString?.() || new Date().toISOString(),
      likes: 0,
      userLiked: false,
      replies: []
    }));

    return NextResponse.json({ 
      comments: formattedComments,
      totalComments: galleryImage.comments ?? formattedComments.length
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch comments', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST /api/gallery/comments - Add a new comment
export async function POST(request: NextRequest) {
  try {
    const { imageId, content, author } = await request.json();

    // Validate required fields
    if (!imageId || !content?.trim() || !author) {
      return NextResponse.json({ error: 'Image ID, content, and author are required' }, { status: 400 });
    }

    // Check authentication
    if (!author.id || !author.name) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Moderate content
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

    // Check if gallery image exists
    const { data: galleryImage, error: galleryError } = await supabaseAdmin
      .from('gallery_images')
      .select('id, authorId, comments')
      .eq('id', imageId)
      .maybeSingle();

    if (galleryError) {
      console.error('Error fetching gallery image:', galleryError);
    }

    if (!galleryImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Generate ID for comment
    const timestampCuid = Date.now().toString(36);
    const counter = Math.floor(Math.random() * 36).toString(36);
    const fingerprint = Math.floor(Math.random() * 36).toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    const generatedId = `c${timestampCuid}${counter}${fingerprint}${random}`.substring(0, 25);
    const now = new Date().toISOString();

    // Create new comment in Supabase
    const { data: newComment, error: createError } = await supabaseAdmin
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

    if (createError || !newComment) {
      console.error('Error creating gallery comment:', createError);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    // Update gallery image comment count
    const newCommentCount = (galleryImage.comments || 0) + 1;
    const { error: updateError } = await supabaseAdmin
      .from('gallery_images')
      .update({ comments: newCommentCount })
      .eq('id', imageId);

    if (updateError) {
      console.error('Error updating gallery comment count:', updateError);
    }

    // Award XP for commenting on gallery image
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
        
        // Check for restrictions
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
      // Don't fail the comment creation if XP awarding fails
    }

    // Create notification for image author (if different from commenter)
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
