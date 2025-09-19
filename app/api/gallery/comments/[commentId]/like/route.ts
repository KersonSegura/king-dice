import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const commentsFilePath = path.join(process.cwd(), 'data', 'gallery.json');

interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    title?: string;
  };
  content: string;
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
  likes?: number;
  userLikes?: string[];
  replies?: Comment[];
}

interface GalleryImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
    title?: string;
  };
  category: string;
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  userVotes?: Array<{
    userId: string;
    voteType: 'up' | 'down';
    weekId: string;
  }>;
  weeklyLikes?: {
    likesReceivedThisWeek: number;
  };
  comments?: number;
  commentsList?: Comment[];
  isDraft?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const { commentId } = params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Read current gallery data
    let galleryData;
    try {
      const fileContent = fs.readFileSync(commentsFilePath, 'utf8');
      galleryData = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json({ error: 'Failed to read gallery data' }, { status: 500 });
    }

    // Find the comment in any image
    let targetImage: GalleryImage | null = null;
    let targetComment: Comment | null = null;

    for (const image of galleryData.images || []) {
      if (image.commentsList) {
        const findComment = (comments: Comment[]): Comment | null => {
          for (const comment of comments) {
            if (comment.id === commentId) {
              return comment;
            }
            if (comment.replies) {
              const found = findComment(comment.replies);
              if (found) return found;
            }
          }
          return null;
        };

        const foundComment = findComment(image.commentsList);
        if (foundComment) {
          targetImage = image;
          targetComment = foundComment;
          break;
        }
      }
    }

    if (!targetImage || !targetComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Initialize comment likes if not exists
    if (!targetComment.userLikes) {
      targetComment.userLikes = [];
    }
    if (targetComment.likes === undefined) {
      targetComment.likes = 0;
    }

    // Toggle like
    const userLiked = targetComment.userLikes.includes(userId);
    
    if (userLiked) {
      // Remove like
      targetComment.userLikes = targetComment.userLikes.filter(id => id !== userId);
      targetComment.likes = Math.max(0, targetComment.likes - 1);
    } else {
      // Add like
      targetComment.userLikes.push(userId);
      targetComment.likes += 1;
    }

    // Save updated data
    fs.writeFileSync(commentsFilePath, JSON.stringify(galleryData, null, 2));

    return NextResponse.json({
      success: true,
      comment: {
        id: targetComment.id,
        likes: targetComment.likes,
        userLiked: !userLiked
      }
    });

  } catch (error) {
    console.error('Error liking comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
