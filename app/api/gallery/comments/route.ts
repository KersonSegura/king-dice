import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

// GET /api/gallery/comments?imageId=xxx - Get comments for an image

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');
    const userId = searchParams.get('userId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Check if gallery image exists
    const galleryImage = await prisma.galleryImage.findUnique({
      where: { id: imageId }
    });

    if (!galleryImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Get comments from database
    const comments = await prisma.comment.findMany({
      where: {
        galleryImageId: imageId,
        parentId: null // Only get top-level comments (not replies)
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            title: true,
            isVerified: true,
            isAdmin: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format comments to match expected structure
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.author.id,
        name: comment.author.username,
        avatar: comment.author.avatar,
        title: comment.author.title
      },
      createdAt: comment.createdAt.toISOString(),
      likes: 0, // TODO: Add likes functionality later
      userLiked: false,
      replies: []
    }));

    return NextResponse.json({ 
      comments: formattedComments,
      totalComments: galleryImage.comments || 0
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
    const galleryImage = await prisma.galleryImage.findUnique({
      where: { id: imageId }
    });

    if (!galleryImage) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Create new comment in database
    const newComment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorId: author.id,
        galleryImageId: imageId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            title: true
          }
        }
      }
    });

    // Update gallery image comment count
    await prisma.galleryImage.update({
      where: { id: imageId },
      data: {
        comments: {
          increment: 1
        }
      }
    });

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

    // Get updated comment count
    const updatedImage = await prisma.galleryImage.findUnique({
      where: { id: imageId },
      select: { comments: true }
    });

    return NextResponse.json({ 
      comment: {
        ...newComment,
        author: {
          id: newComment.author.id,
          name: newComment.author.username,
          avatar: newComment.author.avatar,
          title: newComment.author.title
        }
      },
      totalComments: updatedImage?.comments || 0,
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
