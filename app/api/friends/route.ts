import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get user's friends list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'accepted'; // pending, accepted, blocked

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status },
          { friendId: userId, status }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isVerified: true,
            isAdmin: true
          }
        },
        friend: {
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

    // Transform the data to always show the other user
    const friends = friendships.map(friendship => {
      const isUser = friendship.userId === userId;
      return {
        id: friendship.id,
        user: isUser ? friendship.friend : friendship.user,
        status: friendship.status,
        createdAt: friendship.createdAt
      };
    });

    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}

// POST - Send friend request or accept/decline
export async function POST(request: NextRequest) {
  try {
    const { action, userId, friendId } = await request.json();

    if (!userId || !friendId) {
      return NextResponse.json({ error: 'User ID and Friend ID are required' }, { status: 400 });
    }

    if (userId === friendId) {
      return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 });
    }

    switch (action) {
      case 'send_request': {
        // Check if friendship already exists
        const existingFriendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId, friendId },
              { userId: friendId, friendId: userId }
            ]
          }
        });

        if (existingFriendship) {
          return NextResponse.json({ error: 'Friendship already exists' }, { status: 400 });
        }

        const friendship = await prisma.friendship.create({
          data: {
            userId,
            friendId,
            status: 'pending'
          },
          include: {
            friend: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isVerified: true,
                isAdmin: true
              }
            }
          }
        });

        return NextResponse.json({ 
          success: true, 
          friendship: {
            id: friendship.id,
            user: friendship.friend,
            status: friendship.status,
            createdAt: friendship.createdAt
          }
        });
      }

      case 'accept': {
        const friendship = await prisma.friendship.findFirst({
          where: {
            userId: friendId,
            friendId: userId,
            status: 'pending'
          }
        });

        if (!friendship) {
          return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
        }

        await prisma.friendship.update({
          where: { id: friendship.id },
          data: { status: 'accepted' }
        });

        return NextResponse.json({ success: true });
      }

      case 'decline': {
        const friendship = await prisma.friendship.findFirst({
          where: {
            userId: friendId,
            friendId: userId,
            status: 'pending'
          }
        });

        if (!friendship) {
          return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
        }

        await prisma.friendship.delete({
          where: { id: friendship.id }
        });

        return NextResponse.json({ success: true });
      }

      case 'unfriend': {
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId, friendId },
              { userId: friendId, friendId: userId }
            ],
            status: 'accepted'
          }
        });

        if (!friendship) {
          return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
        }

        await prisma.friendship.delete({
          where: { id: friendship.id }
        });

        return NextResponse.json({ success: true });
      }

      case 'block': {
        // Remove existing friendship if any
        await prisma.friendship.deleteMany({
          where: {
            OR: [
              { userId, friendId },
              { userId: friendId, friendId: userId }
            ]
          }
        });

        // Create blocked relationship
        await prisma.friendship.create({
          data: {
            userId,
            friendId,
            status: 'blocked'
          }
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing friendship:', error);
    return NextResponse.json({ error: 'Failed to manage friendship' }, { status: 500 });
  }
}
