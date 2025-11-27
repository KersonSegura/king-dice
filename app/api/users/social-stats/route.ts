import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get user's social stats (friends, followers, following counts)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get followers count (users following this user)
    const { count: followersCount, error: followersError } = await supabaseAdmin
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followingId', userId);

    if (followersError) {
      console.error('Error fetching followers count:', followersError);
    }

    // Get following count (users this user is following)
    const { count: followingCount, error: followingError } = await supabaseAdmin
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followerId', userId);

    if (followingError) {
      console.error('Error fetching following count:', followingError);
    }

    // Get pending follow requests received
    const { count: pendingRequestsCount, error: requestsError } = await supabaseAdmin
      .from('followRequests')
      .select('*', { count: 'exact', head: true })
      .eq('targetId', userId)
      .eq('status', 'pending');

    if (requestsError) {
      console.error('Error fetching pending requests count:', requestsError);
    }

    return NextResponse.json({
      success: true,
      stats: {
        followers: followersCount || 0,
        following: followingCount || 0,
        pendingRequests: pendingRequestsCount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching social stats:', error);
    return NextResponse.json({ error: 'Failed to fetch social stats' }, { status: 500 });
  }
}
