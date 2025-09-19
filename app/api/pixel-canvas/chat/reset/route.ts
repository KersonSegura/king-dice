import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Reset Pixel Canvas chat (clear all messages)
export async function POST(request: NextRequest) {
  try {
    const PIXEL_CANVAS_CHAT_ID = 'pixel-canvas-public';
    
    // Verify this is an internal request (add a simple auth check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer internal-reset-token') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Delete all messages from the Pixel Canvas chat
    const deletedMessages = await prisma.message.deleteMany({
      where: {
        chatId: PIXEL_CANVAS_CHAT_ID
      }
    });
    
    console.log(`🗑️ Pixel Canvas chat reset: ${deletedMessages.count} messages deleted at ${new Date().toISOString()}`);
    
    return NextResponse.json({
      success: true,
      message: `Pixel Canvas chat reset successfully. ${deletedMessages.count} messages deleted.`,
      deletedCount: deletedMessages.count,
      resetTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting Pixel Canvas chat:', error);
    return NextResponse.json(
      { error: 'Failed to reset chat' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
