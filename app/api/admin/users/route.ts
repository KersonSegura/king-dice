import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdminFromRequest } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdminFromRequest(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const blockedOnly = searchParams.get('blocked') === '1';
    const limit = Math.min(Number(searchParams.get('limit') || 25), 100);

    let query = supabaseAdmin
      .from('users')
      .select('id, username, email, isAdmin, isVerified, level, xp, createdAt, updatedAt')
      .order('updatedAt', { ascending: false })
      .limit(limit);

    if (q) {
      query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%`);
    }
    if (blockedOnly) {
      query = query.eq('isVerified', false);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to search users', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, users: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

