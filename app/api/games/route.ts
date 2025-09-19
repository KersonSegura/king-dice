import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      select: {
        id: true,
        name: true,
        nameEn: true,
        nameEs: true,
        year: true,
        yearRelease: true,
        image: true,
        imageUrl: true,
        minPlayers: true,
        maxPlayers: true,
        durationMinutes: true,
        minPlayTime: true,
        maxPlayTime: true
      },
      orderBy: [
        { name: 'asc' },
        { nameEn: 'asc' }
      ]
    });

    // Normalize the data for consistent frontend usage
    const normalizedGames = games.map(game => ({
      id: game.id,
      name: game.name || game.nameEn,
      nameEn: game.nameEn,
      nameEs: game.nameEs,
      year: game.year || game.yearRelease,
      image: game.image || game.imageUrl,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      durationMinutes: game.durationMinutes || game.maxPlayTime || 60
    }));

    return NextResponse.json(normalizedGames);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}