import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');

    const offset = (page - 1) * limit;

    let followingIds: string[] = [];

    // Fetch posts from Supabase
    let postsData: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('posts')
        .select('id, title, content, category, authorId, votes, replies, createdAt')
        .order('createdAt', { ascending: false });
      if (error) {
        console.error('Error fetching posts for feed:', error);
      } else if (data) {
        postsData = data;
      }
    } catch (err) {
      console.error('Unexpected error fetching posts for feed:', err);
    }

    // Fetch gallery images from Supabase
    let galleryData: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('gallery_images')
        .select('id, title, description, imageUrl, thumbnailUrl, category, authorId, votes, views, downloads, comments, createdAt')
        .order('createdAt', { ascending: false });
      if (error) {
        console.error('Error fetching gallery images for feed:', error);
      } else if (data) {
        galleryData = data;
      }
    } catch (err) {
      console.error('Unexpected error fetching gallery images for feed:', err);
    }

    // Load author information for all unique authorIds
    const authorIds = Array.from(new Set([
      ...postsData.map((p: any) => p.authorId).filter(Boolean),
      ...galleryData.map((g: any) => g.authorId).filter(Boolean)
    ]));
    let authorMap = new Map<string, any>();
    if (authorIds.length > 0) {
      try {
        const { data: authors, error: authorsError } = await supabaseAdmin
          .from('users')
          .select('id, username, avatar, xp, title')
          .in('id', authorIds);
        if (authorsError) {
          console.error('Error fetching feed authors:', authorsError);
        } else if (authors) {
          authorMap = new Map(authors.map((u: any) => [u.id, u]));
        }
      } catch (err) {
        console.error('Unexpected error fetching feed authors:', err);
      }
    }

    // Format posts
    const posts = postsData.map(post => {
      let votes = { upvotes: 0, downvotes: 0 };
      try {
        votes = JSON.parse(post.votes || '{}');
      } catch (e) {
        console.error('Error parsing votes for post:', post.id);
      }
      const author = authorMap.get(post.authorId) || {};

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        category: post.category,
        author: {
          id: post.authorId,
          name: author.username || 'Unknown',
          avatar: author.avatar || null,
          reputation: author.xp ?? author.reputation ?? 0,
          title: author.title || null
        },
        createdAt: typeof post.createdAt === 'string' ? post.createdAt : post.createdAt?.toISOString?.() || new Date().toISOString(),
        votes,
        replies: post.replies || 0
      };
    });

    // Format gallery images
    const galleryImages = galleryData.map(img => {
      let votes = { upvotes: 0, downvotes: 0 };
      try {
        votes = JSON.parse(img.votes || '{}');
      } catch (e) {
        console.error('Error parsing votes for image:', img.id);
      }
      const author = authorMap.get(img.authorId) || {};

      return {
        id: img.id,
        title: img.title,
        description: img.description || '',
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        category: img.category,
        author: {
          id: img.authorId,
          name: author.username || 'Unknown',
          avatar: author.avatar || null,
          reputation: author.xp ?? author.reputation ?? 0,
          title: author.title || null
        },
        createdAt: typeof img.createdAt === 'string' ? img.createdAt : img.createdAt?.toISOString?.() || new Date().toISOString(),
        votes,
        views: img.views || 0,
        downloads: img.downloads || 0,
        comments: img.comments || 0
      };
    });

    // Merge feed items
    const allItems = [
      ...posts.map(post => ({
        id: post.id,
        type: 'post',
        title: post.title,
        content: post.content,
        author: {
          ...post.author,
          username: post.author.name,
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
          username: image.author.name,
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

    const sortedItems = allItems
      .sort((a, b) => {
        if (a.isFollowing && !b.isFollowing) return -1;
        if (!a.isFollowing && b.isFollowing) return 1;
        return b.popularityScore - a.popularityScore;
      })
      .slice(offset, offset + limit);

    // User votes lookups (if authenticated)
    let userVotesMap: Record<string, { vote_type: string }> = {};
    if (userId) {
      const postIds = sortedItems.filter(i => i.type === 'post').map(i => i.id);
      const galleryIds = sortedItems.filter(i => i.type === 'gallery').map(i => i.id);
      if (postIds.length > 0) {
        const { data: postVotes } = await supabaseAdmin
          .from('post_votes')
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
        const { data: galleryVotes } = await supabaseAdmin
          .from('gallery_votes')
          .select('gallery_image_id, vote_type')
          .in('gallery_image_id', galleryIds)
          .eq('user_id', userId);
        if (galleryVotes && Array.isArray(galleryVotes)) {
          for (const v of galleryVotes) {
            userVotesMap[`gallery:${v.gallery_image_id}`] = { vote_type: v.vote_type };
          }
        }
      }
    }

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
