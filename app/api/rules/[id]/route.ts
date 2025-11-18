import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      // If JSON parsing fails, it might be due to body size limit
      console.error('Error parsing JSON in rules PUT:', jsonError);
      return NextResponse.json(
        { error: 'Request body is too large or invalid. Vercel has a 4.5MB limit. Please reduce the size of the rules text.' },
        { status: 413 }
      );
    }

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
    const errorMessage = error instanceof Error ? error.message : 'Failed to update rule';
    // Check if it's a body size issue
    if (errorMessage.includes('too large') || errorMessage.includes('Request Entity Too Large')) {
      return NextResponse.json(
        { error: 'Rules text is too large. Vercel has a 4.5MB limit. Please reduce the size of the rules text.' },
        { status: 413 }
      );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

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

