import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { comparePassword } from '@/lib/auth';
import { requireAdminFromRequest } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdminFromRequest(request);
    if (!adminCheck.ok) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { password } = await request.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const { data: userRow, error } = await supabaseAdmin
      .from('users')
      .select('id, password_hash')
      .eq('id', adminCheck.user.id)
      .single();

    if (error || !userRow?.password_hash) {
      return NextResponse.json(
        { error: 'Password verification is unavailable for this account' },
        { status: 400 }
      );
    }

    const valid = await comparePassword(password, userRow.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to verify password', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

