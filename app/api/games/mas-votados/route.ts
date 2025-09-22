import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '9');
    
    // Obtener todos los juegos (por ahora sin filtros de rating)
    const games = await prisma.game.findMany({
      orderBy: [
        {
          yearRelease: 'desc'
        },
        {
          nameEn: 'asc'
        }
      ],
      take: limit,
      select: {
        id: true,
        bggId: true,
        nameEn: true,
        nameEs: true,
        yearRelease: true,
        designer: true,
        developer: true,
        minPlayers: true,
        maxPlayers: true,
        durationMinutes: true,
        imageUrl: true,
        thumbnailUrl: true
      }
    });

    return NextResponse.json({
      games,
      total: games.length,
      limit
    });

  } catch (error) {
    console.error('Error fetching top ranked games:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 