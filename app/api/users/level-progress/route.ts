import { NextRequest, NextResponse } from 'next/server';
import { getLevelProgress } from '@/lib/reputation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const levelProgress = getLevelProgress(userId);
    
    return NextResponse.json(levelProgress);
  } catch (error) {
    console.error('Error fetching level progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch level progress' },
      { status: 500 }
    );
  }
}
