import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate password requirements
    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { message: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      );
    }

    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { message: 'Password must contain at least one lowercase letter' },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { message: 'Password must contain at least one number' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate username length
    if (username.length < 3) {
      return NextResponse.json(
        { message: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Check if username contains KingDice variations (restricted to admin users only)
    const containsKingDiceVariation = (username: string): boolean => {
      const kingDiceVariations = ['kingdice', 'king-dice', 'king_dice', 'king dice'];
      const lowerUsername = username.toLowerCase();
      return kingDiceVariations.some(variation => lowerUsername.includes(variation));
    };

    if (containsKingDiceVariation(username)) {
      return NextResponse.json(
        { message: 'Usernames containing "KingDice" variations are restricted to admin users only' },
        { status: 400 }
      );
    }

    // Register user using secure authentication
    const authResult = await registerUser(username, email, password);

    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.message },
        { status: 400 }
      );
    }

    // If verification is required, return user data without token
    if (authResult.requiresVerification) {
      return NextResponse.json(
        {
          user: authResult.user,
          requiresVerification: true,
          message: 'Verification code sent to your email'
        },
        { status: 201 }
      );
    }

    // If no verification needed (shouldn't happen for new registrations), proceed as before
    const response = NextResponse.json(
      {
        user: authResult.user,
        token: authResult.token
      },
      { status: 201 }
    );

    if (authResult.token) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      };
      response.cookies.set('auth_token', authResult.token, cookieOptions);
    }

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
} 