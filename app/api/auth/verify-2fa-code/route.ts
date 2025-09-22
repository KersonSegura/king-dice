import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '@/lib/auth';

const prisma = new PrismaClient();

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
    const verificationCode = await prisma.twoFactorCode.findFirst({
      where: {
        userId,
        code,
        used: false,
        expiresAt: {
          gt: new Date() // Code hasn't expired
        }
      },
      include: {
        user: true
      }
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Mark the code as used
    await prisma.twoFactorCode.update({
      where: { id: verificationCode.id },
      data: { used: true }
    });

    // Generate JWT token for successful authentication
    const token = generateToken({
      userId: verificationCode.user.id,
      username: verificationCode.user.username,
      email: verificationCode.user.email,
      isAdmin: verificationCode.user.isAdmin || false
    });

    // Create response with user data and token
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: verificationCode.user.id,
          username: verificationCode.user.username,
          email: verificationCode.user.email,
          avatar: verificationCode.user.avatar || '/DefaultDiceAvatar.svg',
          isAdmin: verificationCode.user.isAdmin || false,
          level: verificationCode.user.level || 1,
          xp: verificationCode.user.xp || 0
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
