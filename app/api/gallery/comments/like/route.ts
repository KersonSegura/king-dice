import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const galleryFile = path.join(dataDir, 'gallery.json');

// POST /api/gallery/comments/like - Like/unlike a comment
export async function POST(request: NextRequest) {
  try {
    const { commentId, userId } = await request.json();

    if (!commentId || !userId) {
      return NextResponse.json({ error: 'Comment ID and User ID are required' }, { status: 400 });
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

    // Get the item (comment or reply) to like
    let item;
    if (isReply) {
      item = galleryData.images[imageIndex].commentsList[commentIndex].replies[replyIndex];
    } else {
      item = galleryData.images[imageIndex].commentsList[commentIndex];
    }
    
    // Initialize likes arrays if they don't exist
    if (!item.userLikes) {
      item.userLikes = [];
    }
    if (!item.likes) {
      item.likes = 0;
    }

    // Check if user already liked the item
    const userLikedIndex = item.userLikes.indexOf(userId);
    const isCurrentlyLiked = userLikedIndex !== -1;

    if (isCurrentlyLiked) {
      // Unlike: remove user from likes array and decrease count
      item.userLikes.splice(userLikedIndex, 1);
      item.likes = Math.max(0, item.likes - 1);
    } else {
      // Like: add user to likes array and increase count
      item.userLikes.push(userId);
      item.likes = item.likes + 1;
    }

    // Update the item in the gallery data
    if (isReply) {
      galleryData.images[imageIndex].commentsList[commentIndex].replies[replyIndex] = item;
    } else {
      galleryData.images[imageIndex].commentsList[commentIndex] = item;
    }

    // Save updated data
    fs.writeFileSync(galleryFile, JSON.stringify(galleryData, null, 2));

    return NextResponse.json({ 
      success: true,
      item: item,
      isLiked: !isCurrentlyLiked, // Return the new like status
      isReply: isReply
    });

  } catch (error) {
    console.error('Error liking comment:', error);
    return NextResponse.json({ error: 'Failed to like comment' }, { status: 500 });
  }
}
