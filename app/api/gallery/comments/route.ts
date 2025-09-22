import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const galleryFile = path.join(dataDir, 'gallery.json');

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

    // Read gallery data
    if (!fs.existsSync(galleryFile)) {
      return NextResponse.json({ comments: [] });
    }

    const galleryData = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const image = galleryData.images.find((img: any) => img.id === imageId);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Process comments to add userLiked state
    const processComments = (comments: any[]): any[] => {
      return comments.map(comment => ({
        ...comment,
        userLiked: userId ? (comment.userLikes || []).includes(userId) : false,
        likes: comment.likes || 0,
        replies: comment.replies ? processComments(comment.replies) : []
      }));
    };

    const processedComments = processComments(image.commentsList || []);

    return NextResponse.json({ 
      comments: processedComments,
      totalComments: image.comments || 0
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
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

    // Read gallery data
    if (!fs.existsSync(galleryFile)) {
      return NextResponse.json({ error: 'Gallery data not found' }, { status: 404 });
    }

    const galleryData = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    const imageIndex = galleryData.images.findIndex((img: any) => img.id === imageId);

    if (imageIndex === -1) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Create new comment
    const newComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author: {
        id: author.id,
        name: author.name,
        avatar: author.avatar,
        title: author.title
      },
      content: content.trim(),
      createdAt: new Date().toISOString(),
      isEdited: false,
      likes: 0,
      userLikes: [],
      replies: []
    };

    // Add comment to image
    if (!galleryData.images[imageIndex].commentsList) {
      galleryData.images[imageIndex].commentsList = [];
    }
    galleryData.images[imageIndex].commentsList.push(newComment);
    
    // Calculate total comments including replies
    const totalComments = galleryData.images[imageIndex].commentsList.reduce((total: number, comment: any) => {
      return total + 1 + (comment.replies ? comment.replies.length : 0);
    }, 0);
    galleryData.images[imageIndex].comments = totalComments;

    // Save updated data
    fs.writeFileSync(galleryFile, JSON.stringify(galleryData, null, 2));

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

    return NextResponse.json({ 
      comment: newComment,
      totalComments: galleryData.images[imageIndex].comments,
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
