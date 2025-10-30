import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Disabled in production' }, { status: 403 });
    }

    const { userId, kind = 'follow' } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    if (kind === 'follow') {
      // Insert a self-follow to trigger realtime (safe for testing)
      const { error } = await supabaseAdmin
        .from('follows')
        .insert({ follower_id: userId, following_id: userId });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, inserted: 'follow' });
    }

    // Default to follow_request
    const { error } = await supabaseAdmin
      .from('follow_requests')
      .insert({ requester_id: userId, target_id: userId, status: 'pending' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, inserted: 'follow_request' });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create test notification' }, { status: 500 });
  }
}


