import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');

    const offset = (page - 1) * limit;

    let feedItems: any[] = [];
    let followingIds: string[] = [];

    // Get users the current user follows
    if (userId) {
      const followingUsers = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      });
      followingIds = followingUsers.map(f => f.followingId);
    }

    // Get all posts and gallery images
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isVerified: true,
            isAdmin: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 3 // Get more to sort properly
    });

    const galleryImages = await prisma.galleryImage.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isVerified: true,
            isAdmin: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 3
    });

    // Combine and process all items
    const allItems = [
      ...posts.map(post => ({
        id: post.id,
        type: 'post',
        title: post.title,
        content: post.content,
        author: {
          ...post.author,
          reputation: 0
        },
        category: post.category,
        createdAt: post.createdAt.toISOString(),
        votes: JSON.parse(post.votes),
        userVote: null,
        engagement: {
          comments: post.replies,
          shares: 0
        },
        isFollowing: followingIds.includes(post.author.id),
        popularityScore: JSON.parse(post.votes).upvotes + post.replies * 2
      })),
      ...galleryImages.map(image => ({
        id: image.id,
        type: 'gallery',
        title: image.title,
        content: image.description,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
        author: {
          ...image.author,
          reputation: 0
        },
        category: image.category,
        createdAt: image.createdAt.toISOString(),
        votes: JSON.parse(image.votes),
        userVote: null,
        engagement: {
          views: image.views,
          downloads: image.downloads,
          comments: image.comments,
          shares: 0
        },
        isFollowing: followingIds.includes(image.author.id),
        popularityScore: JSON.parse(image.votes).upvotes + image.views + image.downloads + image.comments * 2
      }))
    ];

    // Sort: followed users first, then by popularity score
    feedItems = allItems
      .sort((a, b) => {
        // First priority: followed users
        if (a.isFollowing && !b.isFollowing) return -1;
        if (!a.isFollowing && b.isFollowing) return 1;
        
        // Second priority: popularity score
        return b.popularityScore - a.popularityScore;
      })
      .slice(offset, offset + limit)
      .map(item => ({
        ...item,
        popularityScore: undefined
      }));

    // Get user reputations for all authors
    const authorIds = [...new Set(feedItems.map(item => item.author.id))];
    const reputations = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, username: true }
    });

    // Add reputation data (simplified for now)
    feedItems = feedItems.map(item => ({
      ...item,
      author: {
        ...item.author,
        reputation: Math.floor(Math.random() * 1000) // Placeholder - would need actual reputation system
      }
    }));

    const hasMore = feedItems.length === limit;

    return NextResponse.json({
      items: feedItems,
      hasMore,
      page,
      total: feedItems.length
    });

  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
