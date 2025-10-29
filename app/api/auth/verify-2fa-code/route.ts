import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the verification code
    const { data: verificationCodes, error: codeError } = await supabaseAdmin
      .from('two_factor_codes')
      .select('*, users(*)')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (codeError || !verificationCodes || verificationCodes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    const verificationCode = verificationCodes[0];
    const user = verificationCode.users as any;

    // Mark the code as used
    await supabaseAdmin
      .from('two_factor_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    // Generate JWT token for successful authentication
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin || false
    });

    // Create response with user data and token
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar || '/DefaultDiceAvatar.svg',
          isAdmin: user.is_admin || false,
          level: user.level || 1,
          xp: user.xp || 0
        },
        token
      },
      { status: 200 }
    );

    // Set secure HTTP-only cookie for the token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    };

    response.cookies.set('auth_token', token, cookieOptions);

    return response;

  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
