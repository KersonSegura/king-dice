import { NextRequest, NextResponse } from 'next/server';
import { getAllImages } from '@/lib/gallery';
import { getAllPosts } from '@/lib/posts';


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

    // Get users the current user follows (simplified for now)
    // TODO: Implement following system with JSON files
    let followingIds: string[] = [];

    // Get all posts and gallery images from JSON files
    const posts = getAllPosts();
    const galleryImages = getAllImages();

    // Combine and process all items
    const allItems = [
      ...posts.map(post => ({
        id: post.id,
        type: 'post',
        title: post.title,
        content: post.content,
        author: {
          ...post.author,
          username: post.author.name, // Map name to username for consistency
          reputation: 0
        },
        category: post.category,
        createdAt: post.createdAt,
        votes: post.votes,
        userVote: null,
        engagement: {
          comments: post.replies,
          shares: 0
        },
        isFollowing: followingIds.includes(post.author.id),
        popularityScore: post.votes.upvotes + post.replies * 2
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
          username: image.author.name, // Map name to username for consistency
          reputation: 0
        },
        category: image.category,
        createdAt: image.createdAt,
        votes: image.votes,
        userVote: null,
        engagement: {
          views: image.views,
          downloads: image.downloads,
          comments: image.comments,
          shares: 0
        },
        isFollowing: followingIds.includes(image.author.id),
        popularityScore: image.votes.upvotes + image.views + image.downloads + image.comments * 2
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

    const hasMore = feedItems.length === limit;

    return NextResponse.json({
      items: feedItems,
      hasMore,
      page,
      total: allItems.length
    });

  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
