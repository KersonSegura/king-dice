import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const galleryFile = path.join(dataDir, 'gallery.json');

// DELETE /api/gallery/comments/[commentId] - Delete a comment

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const { commentId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Read gallery data
    if (!fs.existsSync(galleryFile)) {
      return NextResponse.json({ error: 'Gallery data not found' }, { status: 404 });
    }

    const galleryData = JSON.parse(fs.readFileSync(galleryFile, 'utf8'));
    
    // Find the comment and its image
    let commentFound = false;
    let imageIndex = -1;
    let commentIndex = -1;

    for (let i = 0; i < galleryData.images.length; i++) {
      const image = galleryData.images[i];
      if (image.commentsList) {
        const commentIdx = image.commentsList.findIndex((comment: any) => comment.id === commentId);
        if (commentIdx !== -1) {
          // Check if user is the author of the comment
          if (image.commentsList[commentIdx].author.id !== userId) {
            return NextResponse.json({ error: 'Unauthorized to delete this comment' }, { status: 403 });
          }
          
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

    // Remove comment
    galleryData.images[imageIndex].commentsList.splice(commentIndex, 1);
    
    // Calculate total comments including replies
    const totalComments = galleryData.images[imageIndex].commentsList.reduce((total: number, comment: any) => {
      return total + 1 + (comment.replies ? comment.replies.length : 0);
    }, 0);
    galleryData.images[imageIndex].comments = totalComments;

    // Save updated data
    fs.writeFileSync(galleryFile, JSON.stringify(galleryData, null, 2));

    return NextResponse.json({ 
      success: true,
      totalComments: galleryData.images[imageIndex].comments
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
