import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('🔍 Auth verify API called');
  try {
    // Get token from cookie
    const token = request.cookies.get('auth_token')?.value;
    console.log('🍪 Token found:', !!token);

    if (!token) {
      console.log('❌ No token found, returning 401');
      return NextResponse.json(
        { message: 'No authentication token found' },
        { status: 401 }
      );
    }

    // Verify token and get user data
    console.log('🔐 Verifying token...');
    const authResult = await getUserFromToken(token);
    console.log('✅ Auth result:', authResult.success);

    if (!authResult.success) {
      console.log('❌ Auth failed:', authResult.message);
      return NextResponse.json(
        { message: authResult.message },
        { status: 401 }
      );
    }

    console.log('✅ Auth successful for user:', authResult.user?.username);
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
