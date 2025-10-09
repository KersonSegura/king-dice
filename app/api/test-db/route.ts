import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const gameCount = await prisma.game.count();
    
    // Check for game 8816
    const game8816 = await prisma.game.findUnique({
      where: { id: 8816 },
      select: {
        id: true,
        nameEn: true,
        yearRelease: true
      }
    });
    
    return NextResponse.json({
      status: 'connected',
      totalGames: gameCount,
      game8816: game8816 || 'NOT_FOUND',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
