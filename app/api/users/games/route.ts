import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Get user's game collection

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userGames = await prisma.userGame.findMany({
      where: { userId: userId },
      include: {
        game: {
          select: {
            id: true,
            nameEn: true,
            nameEs: true,
            imageUrl: true,
            thumbnailUrl: true,
            yearRelease: true,
            minPlayers: true,
            maxPlayers: true,
            durationMinutes: true
          }
        }
      },
      orderBy: { addedAt: 'desc' }
    });

    return NextResponse.json({ success: true, games: userGames });
  } catch (error) {
    console.error('Error fetching user games:', error);
    return NextResponse.json({ error: 'Failed to fetch user games' }, { status: 500 });
  }
}

// POST - Add game to user's collection
export async function POST(request: NextRequest) {
  try {
    const { userId, gameId, rating, notes } = await request.json();

    if (!userId || !gameId) {
      return NextResponse.json({ error: 'User ID and Game ID are required' }, { status: 400 });
    }

    // Check if game is already in collection
    const existingGame = await prisma.userGame.findUnique({
      where: {
        userId_gameId: {
          userId: userId,
          gameId: gameId
        }
      }
    });

    if (existingGame) {
      return NextResponse.json({ error: 'Game already in collection' }, { status: 400 });
    }

    const userGame = await prisma.userGame.create({
      data: {
        userId,
        gameId,
        rating: rating || null,
        notes: notes || null
      },
      include: {
        game: {
          select: {
            id: true,
            nameEn: true,
            nameEs: true,
            imageUrl: true,
            thumbnailUrl: true,
            yearRelease: true,
            minPlayers: true,
            maxPlayers: true,
            durationMinutes: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, game: userGame });
  } catch (error) {
    console.error('Error adding game to collection:', error);
    return NextResponse.json({ error: 'Failed to add game to collection' }, { status: 500 });
  }
}

// DELETE - Remove game from user's collection
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const gameId = searchParams.get('gameId');

    if (!userId || !gameId) {
      return NextResponse.json({ error: 'User ID and Game ID are required' }, { status: 400 });
    }

    await prisma.userGame.deleteMany({
      where: {
        userId: userId,
        gameId: parseInt(gameId)
      }
    });

    return NextResponse.json({ success: true, message: 'Game removed from collection' });
  } catch (error) {
    console.error('Error removing game from collection:', error);
    return NextResponse.json({ error: 'Failed to remove game from collection' }, { status: 500 });
  }
}
