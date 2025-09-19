import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByUsername, getUserByEmail, containsKingDiceVariation } from '@/lib/users';
import bcrypt from 'bcryptjs';

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

    if (username.length < 3) {
      return NextResponse.json(
        { message: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if username contains KingDice variations (restricted to admin users only)
    if (containsKingDiceVariation(username)) {
      return NextResponse.json(
        { message: 'Usernames containing "KingDice" variations are restricted to admin users only' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { message: 'Username already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = getUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json(
        { message: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (without password in response)
    const newUser = createUser({
      username,
      email,
      avatar: '/DiceLogo.svg' // Default avatar
    }, false);

    // Return user data
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Registration failed' },
      { status: 500 }
    );
  }
} 