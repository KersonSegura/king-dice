import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = search ? {
      OR: [
        { game: { name: { contains: search } } },
        { game: { nameEn: { contains: search } } }
      ]
    } : {};

    const rules = await prisma.gameRule.findMany({
      where,
      include: {
        game: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            image: true,
            year: true,
            minPlayers: true,
            maxPlayers: true,
            durationMinutes: true
          }
        }
      },
      orderBy: {
        game: {
          name: 'asc'
        }
      },
      take: limit,
      skip: offset
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newRule = await prisma.gameRule.create({
      data: {
        gameId: body.gameId,
        language: body.language || 'es',
        rulesText: body.rulesText || '',
        rulesHtml: body.rulesHtml || '',
        setupInstructions: body.setupInstructions,
        victoryConditions: body.victoryConditions,
      },
      include: {
        game: {
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
          }
        }
      }
    });

    return NextResponse.json(newRule);
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
