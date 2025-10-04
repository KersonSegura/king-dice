import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Get or create Pixel Canvas public chat
export async function GET(request: NextRequest) {
  try {
    // Look for existing Pixel Canvas public chat
    let chat = await prisma.chat.findFirst({
      where: {
        name: 'Pixel Canvas Public Chat',
        type: 'public'
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
          take: 50, // Get last 50 messages
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isVerified: true,
                isAdmin: true
              }
            },
            replyTo: {
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // If no public chat exists, create one
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          name: 'Pixel Canvas Public Chat',
          type: 'public',
          createdBy: null // System-created chat
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
            take: 50,
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  isVerified: true,
                  isAdmin: true
                }
              },
              replyTo: {
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                      avatar: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    // Format messages (reverse to show oldest first)
    const formattedMessages = chat.messages.reverse().map(message => ({
      id: message.id,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        username: message.sender.username,
        avatar: message.sender.avatar,
        title: message.sender.isAdmin ? 'Admin' : message.sender.isVerified ? 'Verified' : undefined,
        isVerified: message.sender.isVerified,
        isAdmin: message.sender.isAdmin
      },
      replyTo: message.replyTo ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        sender: {
          id: message.replyTo.sender.id,
          username: message.replyTo.sender.username,
          avatar: message.replyTo.sender.avatar,
          title: message.replyTo.sender.isAdmin ? 'Admin' : message.replyTo.sender.isVerified ? 'Verified' : undefined
        }
      } : undefined
    }));

    return NextResponse.json({
      success: true,
      chat: {
        id: chat.id,
        name: chat.name,
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
        messages: formattedMessages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching Pixel Canvas chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// POST - Join user to Pixel Canvas chat
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get or create Pixel Canvas public chat
    let chat = await prisma.chat.findFirst({
      where: {
        name: 'Pixel Canvas Public Chat',
        type: 'public'
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          name: 'Pixel Canvas Public Chat',
          type: 'public',
          createdBy: null
        }
      });
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId: chat.id,
          userId: userId
        }
      }
    });

    // If not a participant, add them
    if (!existingParticipant) {
      await prisma.chatParticipant.create({
        data: {
          chatId: chat.id,
          userId: userId,
          joinedAt: new Date()
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User joined Pixel Canvas chat',
      chatId: chat.id
    });
  } catch (error) {
    console.error('Error joining Pixel Canvas chat:', error);
    return NextResponse.json({ error: 'Failed to join chat' }, { status: 500 });
  }
}
