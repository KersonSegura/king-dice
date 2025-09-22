import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get online users (for friends/followers)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's followers only (Instagram-style: only people who follow you)
    const userRelations = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        followers: {
          include: {
            follower: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isVerified: true,
                isAdmin: true
              }
            }
          }
        }
      }
    });

    if (!userRelations) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only show followers (people who follow you)
    const followers = userRelations.followers.map(f => f.follower);

    return NextResponse.json({
      connections: followers,
      total: followers.length
    });
  } catch (error) {
    console.error('Error fetching online users:', error);
    return NextResponse.json({ error: 'Failed to fetch online users' }, { status: 500 });
  }
}
