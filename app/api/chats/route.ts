import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get user's chats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isVerified: true,
                isAdmin: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Format the response
    const formattedChats = chats.map(chat => {
      const otherParticipants = chat.participants
        .filter(p => p.userId !== userId)
        .map(p => p.user);

      const lastMessage = chat.messages[0];

      return {
        id: chat.id,
        name: chat.name || (chat.type === 'direct' ? otherParticipants[0]?.username : 'Group Chat'),
        type: chat.type,
        participants: chat.participants.map(p => ({
          id: p.user.id,
          username: p.user.username,
          avatar: p.user.avatar,
          isVerified: p.user.isVerified,
          isAdmin: p.user.isAdmin,
          joinedAt: p.joinedAt,
          lastReadAt: p.lastReadAt
        })),
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          type: lastMessage.type,
          createdAt: lastMessage.createdAt,
          sender: {
            id: lastMessage.sender.id,
            username: lastMessage.sender.username,
            avatar: lastMessage.sender.avatar
          }
        } : null,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        createdBy: chat.creator
      };
    });

    return NextResponse.json({ chats: formattedChats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

// POST - Create a new chat
export async function POST(request: NextRequest) {
  try {
    const { type, name, participants, createdBy } = await request.json();

    if (!type || !participants || !Array.isArray(participants)) {
      return NextResponse.json({ error: 'Invalid chat data' }, { status: 400 });
    }

    if (type === 'group' && !name) {
      return NextResponse.json({ error: 'Group chat name is required' }, { status: 400 });
    }

    // Check if direct chat already exists between these two users
    if (type === 'direct' && participants.length === 2) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          type: 'direct',
          participants: {
            every: {
              userId: {
                in: participants
              }
            }
          }
        },
        include: {
          participants: true
        }
      });

      if (existingChat && existingChat.participants.length === 2) {
        return NextResponse.json({ 
          chat: existingChat,
          message: 'Direct chat already exists'
        });
      }
    }

    const chat = await prisma.chat.create({
      data: {
        type,
        name: type === 'group' ? name : null,
        createdBy: type === 'group' ? createdBy : null,
        participants: {
          create: participants.map((userId: string) => ({
            userId
          }))
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isVerified: true,
                isAdmin: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    return NextResponse.json({ 
      chat: {
        id: chat.id,
        name: chat.name || (chat.type === 'direct' ? 
          chat.participants.find(p => p.userId !== createdBy)?.user.username : 
          'Group Chat'
        ),
        type: chat.type,
        participants: chat.participants.map(p => ({
          id: p.user.id,
          username: p.user.username,
          avatar: p.user.avatar,
          isVerified: p.user.isVerified,
          isAdmin: p.user.isAdmin,
          joinedAt: p.joinedAt,
          lastReadAt: p.lastReadAt
        })),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        createdBy: chat.creator
      }
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
