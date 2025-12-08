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

    // Try camelCase first (Prisma schema)
    let dbUsers: any[] = [];
    let error: any = null;
    
    const { data: usersCamel, error: errorCamel } = await supabaseAdmin
      .from('users')
      .select('id, username, avatar, isVerified, isAdmin, createdAt')
      .ilike('username', `%${searchQuery}%`)
      .limit(limit)
      .order('username', { ascending: true, nullsFirst: false });
    
    if (!errorCamel && usersCamel) {
      dbUsers = usersCamel;
    } else {
      // Try snake_case as fallback
      const { data: usersSnake, error: errorSnake } = await supabaseAdmin
        .from('users')
        .select('id, username, avatar, is_verified, is_admin, created_at')
        .ilike('username', `%${searchQuery}%`)
        .limit(limit)
        .order('username', { ascending: true, nullsFirst: false });
      
      if (!errorSnake && usersSnake) {
        dbUsers = usersSnake;
      } else {
        error = errorCamel || errorSnake;
      }
    }

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    const users = (dbUsers || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      isVerified: user.isVerified !== undefined ? user.isVerified : (user.is_verified || false),
      isAdmin: user.isAdmin !== undefined ? user.isAdmin : (user.is_admin || false),
      joinDate: user.createdAt || user.created_at
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
