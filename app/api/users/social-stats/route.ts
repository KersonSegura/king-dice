import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get user's social stats (friends, followers, following counts)

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get followers count
    const followersCount = await prisma.follow.count({
      where: { followingId: userId }
    });

    // Get following count
    const followingCount = await prisma.follow.count({
      where: { followerId: userId }
    });

    // Get pending follow requests received
    const pendingRequestsCount = await prisma.followRequest.count({
      where: { 
        targetId: userId,
        status: 'pending'
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        followers: followersCount,
        following: followingCount,
        pendingRequests: pendingRequestsCount
      }
    });
  } catch (error) {
    console.error('Error fetching social stats:', error);
    return NextResponse.json({ error: 'Failed to fetch social stats' }, { status: 500 });
  }
}
