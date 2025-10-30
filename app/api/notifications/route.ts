import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    // Followers (someone followed you)
    const { data: follows } = await supabaseAdmin
      .from('follows')
      .select(`id, follower_id, following_id, created_at,
               follower:users!follows_follower_id_fkey(id, username, avatar)`) 
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Follow requests (if using private mode)
    const { data: followRequests } = await supabaseAdmin
      .from('follow_requests')
      .select(`id, requester_id, target_id, status, created_at,
               requester:users!follow_requests_requester_id_fkey(id, username, avatar)`) 
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const notifications = [
      ...(follows || []).map((f: any) => ({
        id: `follow:${f.id}`,
        type: 'follow' as const,
        title: `${f.follower?.username || 'Someone'} followed you`,
        actor: f.follower,
        createdAt: f.created_at
      })),
      ...(followRequests || []).map((r: any) => ({
        id: `follow_request:${r.id}`,
        type: 'follow_request' as const,
        title: `${r.requester?.username || 'Someone'} requested to follow you`,
        actor: r.requester,
        createdAt: r.created_at,
        status: r.status
      }))
    ]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

    return NextResponse.json({ notifications });
  } catch (e) {
    console.error('Error fetching notifications:', e);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

