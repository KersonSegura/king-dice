import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameName = searchParams.get('gameName');
    const gameMode = searchParams.get('gameMode');

    if (!gameName || !gameMode) {
      return NextResponse.json({ 
        error: 'Game name and mode are required' 
      }, { status: 400 });
    }

    // Fetch hints from database
    const hints = await prisma.boardleHint.findMany({
      where: {
        gameName: gameName,
        gameMode: gameMode
      },
      orderBy: {
        hintOrder: 'asc'
      },
      select: {
        hintText: true,
        hintOrder: true
      }
    });

    // Extract just the hint texts in order
    const hintTexts = hints.map(hint => hint.hintText);

    return NextResponse.json({ 
      hints: hintTexts,
      gameName: gameName,
      gameMode: gameMode
    });

  } catch (error) {
    console.error('Error fetching hints:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch hints' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameName, gameMode, hints } = body;

    if (!gameName || !gameMode || !Array.isArray(hints)) {
      return NextResponse.json({ 
        error: 'Game name, mode, and hints array are required' 
      }, { status: 400 });
    }

    // Delete existing hints for this game and mode
    await prisma.boardleHint.deleteMany({
      where: {
        gameName: gameName,
        gameMode: gameMode
      }
    });

    // Insert new hints
    const hintData = hints.map((hint, index) => ({
      gameName: gameName,
      gameMode: gameMode,
      hintText: hint,
      hintOrder: index + 1
    }));

    await prisma.boardleHint.createMany({
      data: hintData
    });

    return NextResponse.json({ 
      message: 'Hints saved successfully',
      count: hints.length
    });

  } catch (error) {
    console.error('Error saving hints:', error);
    return NextResponse.json({ 
      error: 'Failed to save hints' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

