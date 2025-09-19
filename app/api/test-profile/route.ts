import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log('Test profile API called');
    
    const user = await prisma.user.findUnique({
      where: { id: 'user_1754498606845_aoutcys27' },
      select: { 
        bio: true,
        favoriteGames: true,
        isAdmin: true
      }
    });
    
    console.log('User found in API:', user);
    
    return NextResponse.json({
      success: true,
      user: user
    });
    
  } catch (error) {
    console.error('Error in test API:', error);
    return NextResponse.json(
      { message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
