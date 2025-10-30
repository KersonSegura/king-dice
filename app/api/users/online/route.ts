import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get online users (for friends/followers)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Followers: users who follow the given userId
    const { data, error } = await supabaseAdmin
      .from('follows')
      .select('follower:users!follows_follower_id_fkey (id, username, avatar, is_verified, is_admin)')
      .eq('following_id', userId);

    if (error) {
      console.error('Error fetching followers:', error);
      return NextResponse.json({ error: 'Failed to fetch online users' }, { status: 500 });
    }

    const followers = (data || []).map((r: any) => r.follower).filter(Boolean);

    return NextResponse.json({
      connections: followers,
      total: followers.length
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    return NextResponse.json({ error: 'Failed to fetch online users' }, { status: 500 });
  }
}
