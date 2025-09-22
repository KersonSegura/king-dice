import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { emailService, generateVerificationCode } from '@/lib/email-service';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, email, username } = await request.json();

    if (!userId || !email || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate 6-digit verification code
    const code = generateVerificationCode();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Clean up any existing unused codes for this user
    await prisma.twoFactorCode.deleteMany({
      where: {
        userId,
        used: false
      }
    });

    // Save the new verification code
    await prisma.twoFactorCode.create({
      data: {
        userId,
        code,
        expiresAt
      }
    });

    // Send verification code via email
    const emailSent = await emailService.sendVerificationCode(email, code, username);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully'
    });

  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
