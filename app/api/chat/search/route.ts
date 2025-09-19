import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ followers: [], chats: [] });
    }

    const userId = session.user.id;

    // Search followers (users that follow the current user)
    const followers = await prisma.user.findMany({
      where: {
        following: {
          some: {
            followerId: userId
          }
        },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        status: true
      },
      take: 10
    });

    // Search existing chats where current user is a participant
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: userId
          }
        },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          {
            participants: {
              some: {
                user: {
                  OR: [
                    { username: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                  ]
                }
              }
            }
          }
        ]
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
                status: true
              }
            }
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      take: 10
    });

    // Format chat results
    const formattedChats = chats.map(chat => {
      const otherParticipants = chat.participants
        .filter(p => p.userId !== userId)
        .map(p => p.user);

      return {
        id: chat.id,
        name: chat.name || (otherParticipants.length === 1 ? otherParticipants[0].username : 'Group Chat'),
        type: chat.type,
        participants: otherParticipants,
        lastMessage: chat.messages[0] || null,
        createdAt: chat.createdAt
      };
    });

    return NextResponse.json({
      followers,
      chats: formattedChats
    });

  } catch (error) {
    console.error('Chat search error:', error);
    return NextResponse.json(
      { error: 'Failed to search chats and followers' },
      { status: 500 }
    );
  }
}
