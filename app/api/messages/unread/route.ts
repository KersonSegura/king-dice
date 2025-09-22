import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get unread messages count for a user

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get all chats where the user is a participant
    const userChats = await prisma.chatParticipant.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1 // Get the latest message for each chat
            }
          }
        }
      }
    });

    let totalUnreadCount = 0;

    // For each chat, count unread messages
    for (const participant of userChats) {
      const { chat, lastReadAt } = participant;
      
      // If user has never read messages in this chat, count all messages
      const cutoffDate = lastReadAt || new Date(0);
      
      // Count messages in this chat that are newer than lastReadAt
      const unreadInChat = await prisma.message.count({
        where: {
          chatId: chat.id,
          createdAt: { gt: cutoffDate },
          senderId: { not: userId } // Don't count user's own messages
        }
      });
      
      totalUnreadCount += unreadInChat;
    }

    console.log(`📱 Unread count for user ${userId}: ${totalUnreadCount}`);

    return NextResponse.json({ 
      unreadCount: totalUnreadCount,
      success: true 
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Mark messages as read in a specific chat
export async function POST(request: NextRequest) {
  try {
    const { userId, chatId } = await request.json();

    if (!userId || !chatId) {
      return NextResponse.json({ error: 'User ID and Chat ID are required' }, { status: 400 });
    }

    // Update the lastReadAt timestamp for this user in this chat
    const updatedParticipant = await prisma.chatParticipant.update({
      where: {
        chatId_userId: {
          chatId,
          userId
        }
      },
      data: {
        lastReadAt: new Date()
      }
    });

    console.log(`✅ Marked messages as read for user ${userId} in chat ${chatId}`);

    return NextResponse.json({ 
      success: true,
      lastReadAt: updatedParticipant.lastReadAt
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
