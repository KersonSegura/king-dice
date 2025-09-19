import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Simple query just for descriptions
    const games = await prisma.game.findMany({
      include: {
        descriptions: true
      },
      take: 3,
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log('API Response:', JSON.stringify(games, null, 2));
    
    return NextResponse.json({ games });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch descriptions' },
      { status: 500 }
    );
  }
}
