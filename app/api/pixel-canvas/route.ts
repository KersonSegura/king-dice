import { NextRequest, NextResponse } from 'next/server';
import { getCanvas, getCanvasAsGrid, getCanvasStats } from '@/lib/pixel-canvas';

export async function GET() {
  try {
    const canvas = getCanvas();
    const grid = getCanvasAsGrid();
    const stats = getCanvasStats();
    
    return NextResponse.json({
      success: true,
      canvas: {
        ...canvas,
        grid
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching canvas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canvas' },
      { status: 500 }
    );
  }
}
