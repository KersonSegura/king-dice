import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id },
      select: {
        id: true,
        bggId: true,
        name: true,
        year: true,
        minPlayers: true,
        maxPlayers: true,
        image: true,
        userRating: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Juego no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ game });

  } catch (error) {
    console.error('Error obteniendo juego:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 