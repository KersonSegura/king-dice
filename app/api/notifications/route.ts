import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = (searchParams.get('unread') || 'true') !== 'false';
    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const query = supabaseAdmin
      .from('notifications')
      .select(`
        id, user_id, type, actor_id, entity_type, entity_id, url, message, read, created_at,
        actor:users!notifications_actor_id_fkey(id, username, avatar)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    const { data, error } = unreadOnly ? await query.eq('read', false) : await query;
    
    // Handle missing notifications table gracefully
    if (error) {
      if (error.code === 'PGRST205') {
        // Table doesn't exist - return empty array
        return NextResponse.json({ notifications: [] });
      }
      throw error;
    }

    const notifications = (data || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.message || inferTitle(n),
      actor: n.actor,
      url: n.url,
      createdAt: n.created_at,
      read: n.read
    }));

    return NextResponse.json({ notifications });
  } catch (e) {
    console.error('Error fetching notifications:', e);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

function inferTitle(n: any): string {
  switch (n.type) {
    case 'follow': return `${n.actor?.username || 'Someone'} followed you`;
    case 'follow_request': return `${n.actor?.username || 'Someone'} requested to follow you`;
    case 'comment': return `${n.actor?.username || 'Someone'} commented on your post`;
    case 'reply': return `${n.actor?.username || 'Someone'} replied to your comment`;
    case 'like': return `${n.actor?.username || 'Someone'} liked your post`;
    case 'gallery_like': return `${n.actor?.username || 'Someone'} liked your gallery image`;
    case 'level_up': return n.message || 'You leveled up!';
    case 'dice_of_week': return n.message || 'Your post was selected as Dice of the Week!';
    case 'card_of_week': return n.message || 'Your post was selected as Card of the Week!';
    case 'message': return n.message || 'New message';
    default: return n.message || 'New notification';
  }
}

