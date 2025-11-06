import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Search for users by username

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    const searchQuery = query.trim();

    const { data: dbUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar, is_verified, is_admin, created_at')
      .ilike('username', `%${searchQuery}%`)
      .limit(limit)
      .order('username', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    const users = (dbUsers || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      isVerified: user.is_verified || false,
      isAdmin: user.is_admin || false,
      joinDate: user.created_at
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
