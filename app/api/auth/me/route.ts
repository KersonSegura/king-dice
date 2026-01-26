import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No authentication token found' 
        },
        { status: 401 }
      );
    }

    // Verify token and get user data
    const authResult = await getUserFromToken(token);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { 
          success: false,
          error: authResult.message || 'Authentication failed' 
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: authResult.user
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication failed'
    }, { status: 401 });
  }
}
