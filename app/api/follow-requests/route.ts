import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get user's follow requests (received or sent)

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'received' or 'sent'

    if (!userId || !type) {
      return NextResponse.json({ error: 'User ID and type are required' }, { status: 400 });
    }

    if (type === 'received') {
      // Get follow requests received by this user
      const requests = await prisma.followRequest.findMany({
        where: { 
          targetId: userId,
          status: 'pending'
        },
        include: {
          requester: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isVerified: true,
              isAdmin: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ 
        requests: requests.map(request => ({
          id: request.id,
          user: {
            id: request.requester.id,
            username: request.requester.username,
            avatar: request.requester.avatar,
            isVerified: request.requester.isVerified,
            isAdmin: request.requester.isAdmin
          },
          requestedAt: request.createdAt
        }))
      });
    } else if (type === 'sent') {
      // Get follow requests sent by this user
      const requests = await prisma.followRequest.findMany({
        where: { 
          requesterId: userId,
          status: 'pending'
        },
        include: {
          target: {
            select: {
              id: true,
              username: true,
              avatar: true,
              isVerified: true,
              isAdmin: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ 
        requests: requests.map(request => ({
          id: request.id,
          user: {
            id: request.target.id,
            username: request.target.username,
            avatar: request.target.avatar,
            isVerified: request.target.isVerified,
            isAdmin: request.target.isAdmin
          },
          requestedAt: request.createdAt
        }))
      });
    } else {
      return NextResponse.json({ error: 'Invalid type. Use "received" or "sent"' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching follow requests:', error);
    return NextResponse.json({ error: 'Failed to fetch follow requests' }, { status: 500 });
  }
}
