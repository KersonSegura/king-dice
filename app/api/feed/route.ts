import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');

    const offset = (page - 1) * limit;

    // 1. Fetch items from database
    let followingIds: string[] = [];
    
    // Get forum posts from database
    const dbPosts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            reputation: true,
            title: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format posts
    const posts = dbPosts.map(post => {
      let votes = { upvotes: 0, downvotes: 0 };
      try {
        votes = JSON.parse(post.votes);
      } catch (e) {
        console.error('Error parsing votes for post:', post.id);
      }

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        category: post.category,
        author: {
          id: post.author.id,
          name: post.author.username,
          avatar: post.author.avatar,
          reputation: post.author.reputation,
          title: post.author.title
        },
        createdAt: post.createdAt.toISOString(),
        votes,
        replies: post._count.comments
      };
    });
    
    // Get gallery images from database
    const dbGalleryImages = await prisma.galleryImage.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            reputation: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format gallery images to match expected structure
    const galleryImages = dbGalleryImages.map(img => {
      let votes = { upvotes: 0, downvotes: 0 };
      try {
        votes = JSON.parse(img.votes);
      } catch (e) {
        console.error('Error parsing votes for image:', img.id);
      }

      return {
        id: img.id,
        title: img.title,
        description: img.description || '',
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        category: img.category,
        author: {
          id: img.author.id,
          name: img.author.username,
          avatar: img.author.avatar,
          reputation: img.author.reputation,
          title: img.author.title
        },
        createdAt: img.createdAt.toISOString(),
        votes,
        views: img.views,
        downloads: img.downloads,
        comments: img.comments
      };
    });

    // 2. Build feed items array
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

    // 3. Pagination
    const sortedItems = allItems
      .sort((a, b) => {
        if (a.isFollowing && !b.isFollowing) return -1;
        if (!a.isFollowing && b.isFollowing) return 1;
        return b.popularityScore - a.popularityScore;
      })
      .slice(offset, offset + limit);

    // 4. User votes lookups (if authenticated)
    let userVotesMap: Record<string, {vote_type: string}> = {};
    if (userId) {
      const postIds = sortedItems.filter(i => i.type === 'post').map(i => i.id);
      const galleryIds = sortedItems.filter(i => i.type === 'gallery').map(i => i.id);
      if (postIds.length > 0) {
        const { data: postVotes } = await supabaseAdmin.from('post_votes')
          .select('post_id, vote_type')
          .in('post_id', postIds)
          .eq('user_id', userId);
        if (postVotes && Array.isArray(postVotes)) {
          for (const v of postVotes) {
            userVotesMap[`post:${v.post_id}`] = { vote_type: v.vote_type };
          }
        }
      }
      if (galleryIds.length > 0) {
        const { data: galleryVotes } = await supabaseAdmin.from('gallery_votes')
          .select('gallery_image_id, vote_type')
          .in('gallery_image_id', galleryIds)
          .eq('user_id', userId);
        if (galleryVotes && Array.isArray(galleryVotes)) {
          for (const v of galleryVotes) {
            userVotesMap[`gallery:${v.gallery_image_id}`] = { vote_type: v.vote_type };
          }
        }
        // No more fallback needed - all votes are in Supabase
      }
    }

    // 5. Patch userVote per item according to user's real vote
    const feedItems = sortedItems.map(item => {
      const voteInfo = userVotesMap[`${item.type}:${item.id}`];
      return {
        ...item,
        userVote: voteInfo ? voteInfo.vote_type : null
      };
    });

    const hasMore = feedItems.length === limit;

    return NextResponse.json({
      items: feedItems,
      hasMore,
      page,
      total: allItems.length
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });
  }
}
