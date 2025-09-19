import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const galleryFile = path.join(dataDir, 'gallery.json');

// POST /api/gallery/comments/reply - Reply to a comment
export async function POST(request: NextRequest) {
  try {
    const { commentId, content, author } = await request.json();

    if (!commentId || !content?.trim() || !author) {
      return NextResponse.json({ error: 'Comment ID, content, and author are required' }, { status: 400 });
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
    
    // Find the comment in all images
    let commentFound = false;
    let imageIndex = -1;
    let commentIndex = -1;

    for (let i = 0; i < galleryData.images.length; i++) {
      const image = galleryData.images[i];
      if (image.commentsList) {
        const commentIdx = image.commentsList.findIndex((comment: any) => comment.id === commentId);
        if (commentIdx !== -1) {
          commentFound = true;
          imageIndex = i;
          commentIndex = commentIdx;
          break;
        }
      }
    }

    if (!commentFound) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Create new reply
    const newReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      parentCommentId: commentId
    };

    // Add reply to the comment
    const comment = galleryData.images[imageIndex].commentsList[commentIndex];
    if (!comment.replies) {
      comment.replies = [];
    }
    comment.replies.push(newReply);

    // Update the comment in the gallery data
    galleryData.images[imageIndex].commentsList[commentIndex] = comment;

    // Calculate total comments including replies
    const totalComments = galleryData.images[imageIndex].commentsList.reduce((total: number, comment: any) => {
      return total + 1 + (comment.replies ? comment.replies.length : 0);
    }, 0);
    galleryData.images[imageIndex].comments = totalComments;

    // Save updated data
    fs.writeFileSync(galleryFile, JSON.stringify(galleryData, null, 2));

    // Award XP for replying to comment
    try {
      const xpResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/reputation/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: author.id,
          userName: author.name,
          action: 'REPLY_COMMENT',
          contentId: newReply.id
        })
      });
      
      if (xpResponse.ok) {
        const xpResult = await xpResponse.json();
        
        if (xpResult.leveledUp) {
          console.log(`🎉 ${author.name} leveled up to level ${xpResult.newLevel} from replying to comment!`);
        }
      }
    } catch (xpError) {
      console.error('Error awarding XP for comment reply:', xpError);
      // Don't fail the reply creation if XP awarding fails
    }

    return NextResponse.json({ 
      success: true,
      reply: newReply,
      moderationResult: {
        isAppropriate: true,
        confidence: moderationResult.confidence
      }
    });

  } catch (error) {
    console.error('Error replying to comment:', error);
    return NextResponse.json({ error: 'Failed to reply to comment' }, { status: 500 });
  }
}
