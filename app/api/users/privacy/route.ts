import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get user's privacy settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPrivate: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      privacy: {
        isPrivate: user.isPrivate
      }
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json({ error: 'Failed to fetch privacy settings' }, { status: 500 });
  }
}

// POST - Update user's privacy settings
export async function POST(request: NextRequest) {
  try {
    const { userId, isPrivate } = await request.json();

    if (!userId || typeof isPrivate !== 'boolean') {
      return NextResponse.json({ error: 'User ID and privacy setting are required' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isPrivate },
      select: { isPrivate: true }
    });

    return NextResponse.json({
      success: true,
      privacy: {
        isPrivate: user.isPrivate
      }
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
  }
}
