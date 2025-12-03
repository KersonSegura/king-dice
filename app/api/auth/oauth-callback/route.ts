import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

/**
 * This endpoint is called after OAuth sign-in to sync NextAuth session
 * with the existing auth_token cookie system
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: session.userId || session.user?.id,
        username: session.username || session.user?.name,
        email: session.user?.email,
        avatar: session.user?.image || '/DefaultDiceAvatar.svg',
        isAdmin: session.isAdmin || false,
        isVerified: true,
        level: session.level || 1,
        xp: session.xp || 0,
      },
      token: session.accessToken,
    });

    // Set the auth_token cookie that the existing system expects
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    };

    response.cookies.set('auth_token', session.accessToken, cookieOptions);

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

