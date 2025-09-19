import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isUserAdmin } from '@/lib/admin-utils';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, username, email } = await request.json();

    if (!userId || !username || !email) {
      return NextResponse.json(
        { message: 'User ID, username, and email are required' },
        { status: 400 }
      );
    }

    // Check if user is authorized to be admin based on config
    if (!isUserAdmin(userId, username, email)) {
      return NextResponse.json(
        { message: 'User is not authorized to be admin' },
        { status: 403 }
      );
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      // Create user with admin status
      user = await prisma.user.create({
        data: {
          id: userId,
          username: username,
          email: email,
          password: '', // Empty password for now
          isAdmin: true,
          bio: null,
          favoriteGames: null,
          profileColors: null
        }
      });
    } else {
      // Update existing user to admin
      user = await prisma.user.update({
        where: { id: userId },
        data: { isAdmin: true }
      });
    }

    return NextResponse.json({
      success: true,
      user: user,
      message: 'Admin status granted successfully'
    });

  } catch (error) {
    console.error('Error granting admin status:', error);
    return NextResponse.json(
      { message: `Failed to grant admin status: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
