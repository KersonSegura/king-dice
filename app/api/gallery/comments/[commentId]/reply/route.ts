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
    const { content, author } = await request.json();

    if (!content || !author) {
      return NextResponse.json({ error: 'Content and author are required' }, { status: 400 });
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

    // Create new reply
    const newReply: Comment = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author: {
        id: author.id,
        name: author.name,
        avatar: author.avatar,
        title: author.title
      },
      content: content.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      userLikes: [],
      replies: []
    };

    // Initialize replies array if not exists
    if (!targetComment.replies) {
      targetComment.replies = [];
    }

    // Add reply
    targetComment.replies.push(newReply);

    // Update image comment count
    if (targetImage.comments) {
      targetImage.comments += 1;
    } else {
      targetImage.comments = 1;
    }

    // Save updated data
    fs.writeFileSync(commentsFilePath, JSON.stringify(galleryData, null, 2));

    return NextResponse.json({
      success: true,
      reply: newReply,
      totalComments: targetImage.comments
    });

  } catch (error) {
    console.error('Error replying to comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
