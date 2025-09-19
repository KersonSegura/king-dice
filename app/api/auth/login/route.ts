import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, getUserByEmail } from '@/lib/users';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user by username or email
    let user = getUserByUsername(username);
    if (!user) {
      // Try to find by email if username lookup failed
      user = getUserByEmail(username);
    }
    
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    // For now, we'll use a simple password check
    // In a real app, you'd store hashed passwords and compare them
    // For demo purposes, we'll accept any password for existing users
    if (user.id === 'admin') {
      // Admin user can login with any password for demo
      return NextResponse.json(user, { status: 200 });
    }

    // For KingDiceKSA, we'll check for a specific password
    if ((user.username === 'KingDiceKSA' || user.email === 'kingdice.community@gmail.com') && password === 'Kinteligente7') {
      return NextResponse.json(user, { status: 200 });
    }

    // For other users, we'll need to implement proper password checking
    // For now, we'll return an error to encourage registration
    return NextResponse.json(
      { message: 'Please register first' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Login failed' },
      { status: 500 }
    );
  }
} 