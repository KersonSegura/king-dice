import { NextRequest, NextResponse } from 'next/server';
import { getAllImages, getUserVote } from '@/lib/gallery';
import { getAllPosts } from '@/lib/posts';
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

    // 1. Fetch items as before
    let followingIds: string[] = [];
    const posts = getAllPosts();
    const galleryImages = getAllImages();

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
        // Fallback for legacy likes in local JSON if no Supabase vote exists
        for (const gid of galleryIds) {
          const key = `gallery:${gid}`;
          if (!userVotesMap[key]) {
            const legacy = getUserVote(gid, userId as string);
            if (legacy) {
              userVotesMap[key] = { vote_type: legacy } as any;
            }
          }
        }
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
