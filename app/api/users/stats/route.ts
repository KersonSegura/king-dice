import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    const { count: forumPosts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    // Get user's gallery posts count
    const { count: galleryPosts, error: galleryError } = await supabaseAdmin
      .from('gallery_images')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    // Get user's games owned count
    const { count: gamesOwned, error: gamesError } = await supabaseAdmin
      .from('user_games')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get user's friends count (accepted friendships)
    const { count: friends1, error: friends1Error } = await supabaseAdmin
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'accepted');

    const { count: friends2, error: friends2Error } = await supabaseAdmin
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', userId)
      .eq('status', 'accepted');

    if (postsError || galleryError || gamesError || friends1Error || friends2Error) {
      console.error('Error fetching stats:', { postsError, galleryError, gamesError, friends1Error, friends2Error });
    }

    const stats = {
      gamesOwned: gamesOwned || 0,
      forumDiscussions: forumPosts || 0,
      galleryPosts: galleryPosts || 0,
      friends: (friends1 || 0) + (friends2 || 0)
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
  }
}
