import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password, rememberMe } = await request.json();

    console.log('🔐 Login attempt for:', username);

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Authenticate user using secure authentication
    const authResult = await authenticateUser(username, password);
    
    console.log('🔐 Auth result:', { success: authResult.success, requiresTwoFactor: authResult.requiresTwoFactor });

    if (!authResult.success) {
      // Check if 2FA is required
      if (authResult.requiresTwoFactor) {
        return NextResponse.json(
          { 
            message: authResult.message,
            requiresTwoFactor: true,
            userId: authResult.userId
          },
          { status: 200 } // 200 because this is a successful response that requires 2FA
        );
      }
      
      return NextResponse.json(
        { message: authResult.message },
        { status: 401 }
      );
    }

    // Create response with user data and token
    const response = NextResponse.json(
      {
        user: authResult.user,
        token: authResult.token
      },
      { status: 200 }
    );

    // Set secure HTTP-only cookie for the token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60 // 30 days if remember me, 7 days otherwise
    };

    response.cookies.set('auth_token', authResult.token!, cookieOptions);

    return response;

  } catch (error) {
    console.error('❌ Login route error:', error);
    console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack);
    }
    return NextResponse.json(
      { 
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 