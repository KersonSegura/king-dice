import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

type AnyRow = Record<string, any>;

function parseVotes(votes: any) {
  if (!votes) return { upvotes: 0, downvotes: 0 };
  if (typeof votes === 'object') {
    return {
      upvotes: Number(votes.upvotes) || 0,
      downvotes: Number(votes.downvotes) || 0
    };
  }
  try {
    const parsed = JSON.parse(String(votes));
    return {
      upvotes: Number(parsed?.upvotes) || 0,
      downvotes: Number(parsed?.downvotes) || 0
    };
  } catch {
    return { upvotes: 0, downvotes: 0 };
  }
}

function rewriteStorageUrl(origin: string | undefined, url: string | null | undefined) {
  if (!url) return url;
  if (!origin) return url;
  if (url.startsWith('http') && url.includes('.supabase.co')) return url;
  if (url.startsWith('/gallery/')) {
    const rel = url.replace('/gallery/', '');
    return `${origin}/storage/v1/object/public/gallery/${rel}`;
  }
  if (url.startsWith('/rules-images/')) {
    const rel = url.replace('/rules-images/', '');
    return `${origin}/storage/v1/object/public/rules-images/${rel}`;
  }
  if (url.startsWith('/uploads/')) {
    const filename = url.replace('/uploads/', '');
    return `${origin}/storage/v1/object/public/uploads/uploads/${filename}`;
  }
  return url;
}

function mapPostRow(row: AnyRow, authorMap: Map<string, any>) {
  const authorId = row.authorId ?? row.author_id ?? null;
  const createdAt = row.createdAt ?? row.created_at ?? new Date().toISOString();
  const votes = parseVotes(row.votes);
  const author = authorMap.get(authorId || '') || {};

  return {
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    category: row.category ?? 'general',
    author: {
      id: authorId,
      name: author.username || author.name || 'Unknown',
      avatar: author.avatar || null,
      reputation: author.xp ?? author.reputation ?? 0,
      title: author.title ?? null
    },
    createdAt: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
    votes,
    replies: row.replies ?? row.replies_count ?? 0
  };
}

function mapGalleryRow(row: AnyRow, authorMap: Map<string, any>, origin: string | undefined) {
  const authorId = row.authorId ?? row.author_id ?? null;
  const createdAt = row.createdAt ?? row.created_at ?? new Date().toISOString();
  const imageUrl = rewriteStorageUrl(origin, row.imageUrl ?? row.image_url ?? null);
  const thumbnailUrl = rewriteStorageUrl(origin, row.thumbnailUrl ?? row.thumbnail_url ?? imageUrl);
  const votes = parseVotes(row.votes);
  const author = authorMap.get(authorId || '') || {};

  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    imageUrl,
    thumbnailUrl,
    category: row.category ?? 'uncategorized',
    author: {
      id: authorId,
      name: author.username || author.name || 'Unknown',
      avatar: author.avatar || null,
      reputation: author.xp ?? author.reputation ?? 0,
      title: author.title ?? null
    },
    createdAt: typeof createdAt === 'string' ? createdAt : new Date(createdAt).toISOString(),
    votes,
    views: row.views ?? row.views_count ?? 0,
    downloads: row.downloads ?? row.downloads_count ?? 0,
    comments: row.comments ?? row.comments_count ?? 0
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');

    const offset = (page - 1) * limit;

    let followingIds: string[] = [];
    
    // Get following list if userId is provided
    if (userId) {
      try {
        const { data: follows, error: followsError } = await supabaseAdmin
          .from('follows')
          .select('followingId')
          .eq('followerId', userId);
        
        if (!followsError && follows) {
          followingIds = follows.map((f: any) => f.followingId || f.following_id).filter(Boolean);
        }
      } catch (error) {
        console.error('Error fetching following list:', error);
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

    let postsRows: AnyRow[] = [];
    let galleryRows: AnyRow[] = [];

    try {
      const { data, error } = await supabaseAdmin.from('posts').select('*');
      if (error) {
        console.error('Error fetching posts for feed:', error);
      } else if (data) {
        postsRows = data;
      }
    } catch (err) {
      console.error('Unexpected error fetching posts for feed:', err);
    }

    try {
      const { data, error } = await supabaseAdmin.from('gallery_images').select('*');
      if (error) {
        console.error('Error fetching gallery images for feed:', error);
      } else if (data) {
        galleryRows = data;
      }
    } catch (err) {
      console.error('Unexpected error fetching gallery images for feed:', err);
    }

    const authorIds = Array.from(new Set([
      ...postsRows.map(row => row.authorId ?? row.author_id).filter(Boolean),
      ...galleryRows.map(row => row.authorId ?? row.author_id).filter(Boolean)
    ] as string[]));

    let authorMap = new Map<string, any>();
    if (authorIds.length > 0) {
      try {
        const { data: authors, error: authorsError } = await supabaseAdmin
          .from('users')
          .select('id, username, avatar, xp, title');
        if (authorsError) {
          console.error('Error fetching feed authors:', authorsError);
        } else if (authors) {
          authorMap = new Map(authors.map(author => [author.id, author]));
        }
      } catch (err) {
        console.error('Unexpected error fetching feed authors:', err);
      }
    }

    const posts = postsRows
      .map(row => mapPostRow(row, authorMap))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const galleryImages = galleryRows
      .map(row => mapGalleryRow(row, authorMap, supabaseUrl))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const allItems = [
      ...posts.map(post => ({
        id: post.id,
        type: 'post' as const,
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
        type: 'gallery' as const,
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

    // Sort items: followed users first, then by recency and popularity
    const sortedItems = allItems
      .sort((a, b) => {
        // First priority: followed users come first
        if (a.isFollowing && !b.isFollowing) return -1;
        if (!a.isFollowing && b.isFollowing) return 1;
        
        // Within followed users, sort by recency (newest first)
        if (a.isFollowing && b.isFollowing) {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeB - timeA; // Newest first
        }
        
        // For non-followed users, sort by popularity score
        return b.popularityScore - a.popularityScore;
      })
      .slice(offset, offset + limit);

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
