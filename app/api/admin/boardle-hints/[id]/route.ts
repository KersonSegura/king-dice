import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ 
        error: 'Invalid hint ID' 
      }, { status: 400 });
    }

    // Delete the hint
    await prisma.boardleHint.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: 'Hint deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting hint:', error);
    return NextResponse.json({ 
      error: 'Failed to delete hint' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

