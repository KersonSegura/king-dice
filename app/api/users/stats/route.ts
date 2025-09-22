import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's forum posts count
    const forumPosts = await prisma.post.count({
      where: { authorId: userId }
    });

    // Get user's gallery posts count
    const galleryPosts = await prisma.galleryImage.count({
      where: { authorId: userId }
    });

    // Get user's games owned count
    const gamesOwned = await prisma.userGame.count({
      where: { userId: userId }
    });

    // Get user's friends count (accepted friendships)
    const friends = await prisma.friendship.count({
      where: {
        OR: [
          { userId: userId, status: 'accepted' },
          { friendId: userId, status: 'accepted' }
        ]
      }
    });

    const stats = {
      gamesOwned,
      forumDiscussions: forumPosts,
      galleryPosts,
      friends
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
  }
}
