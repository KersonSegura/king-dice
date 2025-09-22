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

    // Create response with user data and token
    const response = NextResponse.json(
      {
        user: authResult.user,
        token: authResult.token
      },
      { status: 201 }
    );

    // Set secure HTTP-only cookie for the token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    };

    response.cookies.set('auth_token', authResult.token!, cookieOptions);

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Registration failed' },
      { status: 500 }
    );
  }
} 