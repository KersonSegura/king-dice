import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

function getTokenFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get('auth_token')?.value;
  if (cookie) return cookie;
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { message: 'No authentication token found' },
        { status: 401 }
      );
    }

    const authResult = await getUserFromToken(token);
    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.message },
        { status: 401 }
      );
    }
    return NextResponse.json({
      user: authResult.user
    }, { status: 200 });

  } catch (error) {
    console.error('💥 Token verification error:', error);
    return NextResponse.json(
      { message: 'Token verification failed' },
      { status: 500 }
    );
  }
}
