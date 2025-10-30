import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return NextResponse.json({ error: 'Supabase config not set' }, { status: 500 });
    }
    return NextResponse.json({ supabaseUrl: url, supabaseAnonKey: anon });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load public config' }, { status: 500 });
  }
}


