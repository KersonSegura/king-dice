import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { isUserAdmin } from '@/lib/admin-utils';
import { getUserFromToken } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Check authentication first
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and get authenticated user
    const authResult = await getUserFromToken(token);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { message: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const authenticatedUser = authResult.user;

    // SECURITY: Only admins can grant admin status
    const isRequesterAdmin = authenticatedUser.isAdmin || isUserAdmin(
      authenticatedUser.id,
      authenticatedUser.username,
      authenticatedUser.email
    );

    if (!isRequesterAdmin) {
      return NextResponse.json(
        { message: 'Forbidden - Only admins can grant admin status' },
        { status: 403 }
      );
    }

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
