import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (!raw || !raw.trim()) {
      console.warn('🔐 Login: empty request body');
      return NextResponse.json(
        { message: 'Request body is empty. Send JSON: { username, password, rememberMe? }' },
        { status: 400 }
      );
    }
    let body: { username?: string; password?: string; rememberMe?: boolean };
    try {
      body = JSON.parse(raw);
    } catch {
      console.warn('🔐 Login: invalid JSON', raw.slice(0, 100));
      return NextResponse.json(
        { message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const rememberMe = body.rememberMe;

    console.log('🔐 Login attempt for:', username);

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

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