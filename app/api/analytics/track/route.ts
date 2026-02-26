import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function normalizePath(input: string) {
  if (!input) return '/';
  try {
    const u = new URL(input, 'https://kingdice.gg');
    return `${u.pathname}${u.search || ''}`;
  } catch {
    return input.startsWith('/') ? input : `/${input}`;
  }
}

function getClientSource(request: NextRequest, bodySource?: string) {
  const headerClient = request.headers.get('x-kd-client');
  if (headerClient === 'mobile-app') return 'app';
  if (bodySource === 'app') return 'app';
  return 'web';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const path = normalizePath(typeof body?.path === 'string' ? body.path : '/');
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 120) : null;
    const source = getClientSource(request, typeof body?.source === 'string' ? body.source : undefined);

    const token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value;
    let userId: string | null = null;
    if (token) {
      const auth = await getUserFromToken(token);
      if (auth.success && auth.user) userId = auth.user.id;
    }

    const countryCode =
      request.headers.get('cf-ipcountry') ||
      request.headers.get('x-vercel-ip-country') ||
      null;
    const region = request.headers.get('x-vercel-ip-country-region') || null;
    const city =
      request.headers.get('x-vercel-ip-city') ||
      request.headers.get('cf-ipcity') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    const { error } = await supabaseAdmin.from('analytics_page_views').insert({
      path,
      source,
      user_id: userId,
      session_id: sessionId,
      country_code: countryCode,
      region,
      city,
      user_agent: userAgent,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to track analytics event', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to track analytics event', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

