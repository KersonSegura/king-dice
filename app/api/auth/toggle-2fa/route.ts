import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, enabled } = await request.json();

    if (!userId || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    // Update user's 2FA status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
      select: {
        id: true,
        username: true,
        email: true,
        twoFactorEnabled: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error toggling 2FA:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
