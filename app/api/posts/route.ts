import { NextRequest, NextResponse } from 'next/server';
import { createPost, getAllPosts } from '@/lib/posts';
import { moderateText } from '@/lib/moderation';
import { awardXP } from '@/lib/reputation';
import { CacheService } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('author') || searchParams.get('authorId');
    
    // Check cache first
    const cacheKey = `posts:${authorId || 'all'}`;
    const cachedPosts = await CacheService.getCachedForumPosts(cacheKey);
    
    if (cachedPosts) {
      console.log(`✅ Cache hit for posts - Author: ${authorId || 'all'}`);
      return NextResponse.json({ 
        posts: cachedPosts,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'CDN-Cache-Control': 'public, max-age=60'
        }
      });
    }

    console.log(`❌ Cache miss for posts - Author: ${authorId || 'all'}, fetching from database`);
    
    let posts = getAllPosts();
    
    // Filter by author if authorId is provided
    if (authorId) {
      posts = posts.filter(post => post.author.id === authorId);
    }
    
    // Cache the results for 15 minutes
    await CacheService.cacheForumPosts(cacheKey, posts, 900);
    
    return NextResponse.json({ 
      posts,
      cached: false
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute (posts change more frequently)
        'CDN-Cache-Control': 'public, max-age=60'
      }
    });
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
    console.log('=== POST CREATION DEBUG ===');
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
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
    // Create post
    const newPost = createPost({
      title: title.trim(),
      content: content.trim(),
      category,
      author
    });
    console.log('Post created:', newPost);

    // Award XP for creating a discussion
    if (newPost) {
      console.log('Awarding XP...');
      try {
        awardXP(
          author.id,
          author.name,
          'CREATE_DISCUSSION',
          newPost.id
        );
        console.log('XP awarded successfully');
      } catch (xpError) {
        console.error('Error awarding XP:', xpError);
        // Don't fail the post creation if XP awarding fails
      }
    }

    console.log('Returning success response');
    return NextResponse.json({ 
      success: true, 
      post: newPost,
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