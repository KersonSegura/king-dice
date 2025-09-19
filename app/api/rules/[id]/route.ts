import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();

    const updatedRule = await prisma.gameRule.update({
      where: { id },
      data: {
        language: body.language,
        rulesText: body.rulesText,
        rulesHtml: body.rulesHtml,
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

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    await prisma.gameRule.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

