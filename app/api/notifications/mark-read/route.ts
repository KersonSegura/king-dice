import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .in('id', ids);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('mark-read error:', e);
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 });
  }
}


