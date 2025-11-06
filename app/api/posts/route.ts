import { NextRequest, NextResponse } from 'next/server';
import { moderateText } from '@/lib/moderation';
import { awardXP } from '@/lib/reputation';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic so likes/replies reflect immediately when navigating back
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('author') || searchParams.get('authorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId') || '';
    
    // Get posts from database
    const dbPosts = await prisma.post.findMany({
      where: authorId ? { authorId } : undefined,
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

    // Format posts to match expected structure
    let posts = dbPosts.map(post => {
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
        replies: post._count.comments,
        userVote: null,
        isModerated: true
      };
    });
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    let paginatedPosts = posts.slice(startIndex, endIndex);

    // Get vote counts and user votes from Supabase
    try {
      const ids = paginatedPosts.map(p => p.id);
      if (ids.length > 0) {
        // Initialize all post IDs with 0 counts
        const upCount: Record<string, number> = {};
        const downCount: Record<string, number> = {};
        ids.forEach(id => {
          upCount[id] = 0;
          downCount[id] = 0;
        });

        // Fetch votes from Supabase
        const [{ data: up, error: upError }, { data: down, error: downError }] = await Promise.all([
          supabaseAdmin.from('post_votes').select('post_id').in('post_id', ids).eq('vote_type', 'up'),
          supabaseAdmin.from('post_votes').select('post_id').in('post_id', ids).eq('vote_type', 'down'),
        ]);

        // Count votes - increment for each vote found
        if (!upError && up) {
          up.forEach(r => { 
            if (r.post_id && upCount[r.post_id] !== undefined) {
              upCount[r.post_id] = (upCount[r.post_id] || 0) + 1; 
            }
          });
        }
        if (!downError && down) {
          down.forEach(r => { 
            if (r.post_id && downCount[r.post_id] !== undefined) {
              downCount[r.post_id] = (downCount[r.post_id] || 0) + 1; 
            }
          });
        }

        let userVotes: Record<string, string> = {};
        if (userId) {
          const { data: uv, error: uvError } = await supabaseAdmin
            .from('post_votes')
            .select('post_id, vote_type')
            .in('post_id', ids)
            .eq('user_id', userId);
          if (!uvError && uv) {
            uv.forEach(v => { userVotes[v.post_id] = v.vote_type; });
          }
        }

        // Always use Supabase counts (which are initialized to 0 if no votes exist)
        paginatedPosts = paginatedPosts.map(p => ({
          ...p,
          votes: { 
            upvotes: upCount[p.id] ?? 0, 
            downvotes: downCount[p.id] ?? 0
          },
          userVote: (userVotes[p.id] as any) || null,
        }));
      }
    } catch (e) {
      console.warn('Failed to overlay Supabase votes on posts list:', e);
    }
    
    return NextResponse.json({ posts: paginatedPosts, cached: false });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { title, content, category, author } = body;
    
    // Validate required fields
    if (!title?.trim() || !content?.trim() || !category || !author) {
      console.log('Validation failed:', { title, content, category, author });
      return NextResponse.json(
        { error: 'Title, content, category, and author are required' },
        { status: 400 }
      );
    }

    console.log('Validation passed, moderating title and content...');
    // Moderate both title and content
    const [titleModeration, contentModeration] = await Promise.all([
      moderateText(title),
      moderateText(content)
    ]);
    
    console.log('Title moderation result:', titleModeration);
    console.log('Content moderation result:', contentModeration);
    
    // Check if either title or content is inappropriate
    if (!titleModeration.isAppropriate || !contentModeration.isAppropriate) {
      const rejectedModeration = !titleModeration.isAppropriate ? titleModeration : contentModeration;
      console.log('Post rejected by moderation:', rejectedModeration);
      return NextResponse.json(
        { 
          error: 'Content was flagged as inappropriate',
          flags: rejectedModeration.flags 
        },
        { status: 400 }
      );
    }

    console.log('Content approved, creating post...');
    
    // Create post in database
    const newPost = await prisma.post.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category,
        authorId: author.id
      },
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
      }
    });
    
    // Format response
    const formattedPost = {
      id: newPost.id,
      title: newPost.title,
      content: newPost.content,
      category: newPost.category,
      author: {
        id: newPost.author.id,
        name: newPost.author.username,
        avatar: newPost.author.avatar,
        reputation: newPost.author.reputation,
        title: newPost.author.title
      },
      createdAt: newPost.createdAt.toISOString(),
      votes: { upvotes: 0, downvotes: 0 },
      replies: 0,
      userVote: null,
      isModerated: true
    };
    
    console.log('Post created:', formattedPost);

    // Award XP for creating a discussion
    console.log('Awarding XP...');
    try {
      awardXP(
        author.id,
        author.name,
        'CREATE_DISCUSSION',
        formattedPost.id
      );
      console.log('XP awarded successfully');
    } catch (xpError) {
      console.error('Error awarding XP:', xpError);
      // Don't fail the post creation if XP awarding fails
    }

    console.log('Returning success response');
    return NextResponse.json({ 
      success: true, 
      post: formattedPost,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
} 