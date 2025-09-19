import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get or create the Digital Corner public chat room
export async function GET(request: NextRequest) {
  try {
    const DIGITAL_CORNER_CHAT_ID = 'digital-corner-public';
    
    // Try to find existing Digital Corner chat
    let chat = await prisma.chat.findFirst({
      where: {
        id: DIGITAL_CORNER_CHAT_ID
      },
      include: {
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
                title: true,
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
                    avatar: true,
                    title: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: 50 // Last 50 messages
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                title: true,
                isVerified: true,
                isAdmin: true
              }
            }
          }
        }
      }
    });

    // If chat doesn't exist, create it
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          id: DIGITAL_CORNER_CHAT_ID,
          name: 'Digital Corner',
          type: 'public',
          createdBy: null // System created
        },
        include: {
          messages: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  isVerified: true,
                  isAdmin: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            },
            take: 50
          },
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
          }
        }
      });

      console.log('Created Digital Corner chat room:', chat.id);
    }

    return NextResponse.json({
      success: true,
      chat: chat
    });
  } catch (error) {
    console.error('Error getting/creating Digital Corner chat:', error);
    return NextResponse.json(
      { error: 'Failed to get chat room' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Join the Digital Corner chat (for authenticated users)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const DIGITAL_CORNER_CHAT_ID = 'digital-corner-public';
    
    // Check if user is already a participant
    const existingParticipant = await prisma.chatParticipant.findFirst({
      where: {
        chatId: DIGITAL_CORNER_CHAT_ID,
        userId: userId
      }
    });

    if (!existingParticipant) {
      // Add user as participant
      await prisma.chatParticipant.create({
        data: {
          chatId: DIGITAL_CORNER_CHAT_ID,
          userId: userId
        }
      });

      console.log(`User ${userId} joined Digital Corner chat`);
    }

    return NextResponse.json({
      success: true,
      message: 'Joined chat successfully'
    });
  } catch (error) {
    console.error('Error joining Digital Corner chat:', error);
    return NextResponse.json(
      { error: 'Failed to join chat' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
