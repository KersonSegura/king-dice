import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Fetch all hints
    const hints = await prisma.boardleHint.findMany({
      orderBy: [
        { gameName: 'asc' },
        { gameMode: 'asc' },
        { hintOrder: 'asc' }
      ]
    });

    return NextResponse.json({ hints });

  } catch (error) {
    console.error('Error fetching hints:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch hints' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

