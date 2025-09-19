import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Reset Digital Corner chat (clear all messages)
export async function POST(request: NextRequest) {
  try {
    const DIGITAL_CORNER_CHAT_ID = 'digital-corner-public';
    
    // Verify this is an internal request (add a simple auth check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer internal-reset-token') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Delete all messages from the Digital Corner chat
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        chatId: DIGITAL_CORNER_CHAT_ID
      }
    });
    
    console.log(`🗑️ Digital Corner chat reset: ${deletedMessages.count} messages deleted at ${new Date().toISOString()}`);
    
    return NextResponse.json({
      success: true,
      message: `Digital Corner chat reset successfully. ${deletedMessages.count} messages deleted.`,
      deletedCount: deletedMessages.count,
      resetTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting Digital Corner chat:', error);
    return NextResponse.json(
      { error: 'Failed to reset chat' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Get reset status and next reset time
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0); // Next midnight
    
    const DIGITAL_CORNER_CHAT_ID = 'digital-corner-public';
    
    // Get current message count
    const messageCount = await prisma.message.count({
      where: {
        chatId: DIGITAL_CORNER_CHAT_ID
      }
    });
    
    // Get the oldest message to see when the last reset was
    const oldestMessage = await prisma.message.findFirst({
      where: {
        chatId: DIGITAL_CORNER_CHAT_ID
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        createdAt: true
      }
    });
    
    return NextResponse.json({
      success: true,
      currentMessageCount: messageCount,
      nextResetTime: nextMidnight.toISOString(),
      lastResetTime: oldestMessage ? oldestMessage.createdAt : null,
      hoursUntilReset: Math.ceil((nextMidnight.getTime() - now.getTime()) / (1000 * 60 * 60))
    });
  } catch (error) {
    console.error('Error getting reset status:', error);
    return NextResponse.json(
      { error: 'Failed to get reset status' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
