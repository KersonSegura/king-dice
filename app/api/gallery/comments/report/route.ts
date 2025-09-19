import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const galleryFile = path.join(dataDir, 'gallery.json');

// POST /api/gallery/comments/report - Report a comment or reply
export async function POST(request: NextRequest) {
  try {
    const { commentId, reason, details, reporterId } = await request.json();

    if (!commentId || !reason || !reporterId) {
      return NextResponse.json({ error: 'Comment ID, reason, and reporter ID are required' }, { status: 400 });
    }

    // Read gallery data
    if (!fs.existsSync(galleryFile)) {
      return NextResponse.json({ error: 'Gallery data not found' }, { status: 404 });
    }

    const galleryData = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    
    // Find the comment or reply in all images
    let itemFound = false;
    let imageIndex = -1;
    let commentIndex = -1;
    let replyIndex = -1;
    let isReply = false;

    for (let i = 0; i < galleryData.images.length; i++) {
      const image = galleryData.images[i];
      if (image.commentsList) {
        // First check main comments
        const commentIdx = image.commentsList.findIndex((comment: any) => comment.id === commentId);
        if (commentIdx !== -1) {
          itemFound = true;
          imageIndex = i;
          commentIndex = commentIdx;
          isReply = false;
          break;
        }
        
        // Then check replies within comments
        for (let j = 0; j < image.commentsList.length; j++) {
          const comment = image.commentsList[j];
          if (comment.replies) {
            const replyIdx = comment.replies.findIndex((reply: any) => reply.id === commentId);
            if (replyIdx !== -1) {
              itemFound = true;
              imageIndex = i;
              commentIndex = j;
              replyIndex = replyIdx;
              isReply = true;
              break;
            }
          }
        }
        if (itemFound) break;
      }
    }

    if (!itemFound) {
      return NextResponse.json({ error: 'Comment or reply not found' }, { status: 404 });
    }

    // Create report object
    const report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      commentId,
      reason,
      details: details || '',
      reporterId,
      createdAt: new Date().toISOString(),
      isReply
    };

    // Initialize reports array if it doesn't exist
    if (!galleryData.reports) {
      galleryData.reports = [];
    }

    // Add report to the reports array
    galleryData.reports.push(report);

    // Save updated data
    fs.writeFileSync(galleryFile, JSON.stringify(galleryData, null, 2));

    return NextResponse.json({ 
      success: true,
      report: report,
      message: `Report submitted successfully for ${isReply ? 'reply' : 'comment'}`
    });

  } catch (error) {
    console.error('Error reporting comment:', error);
    return NextResponse.json({ error: 'Failed to report comment' }, { status: 500 });
  }
}
