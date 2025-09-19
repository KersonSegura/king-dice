import { NextRequest, NextResponse } from 'next/server';
import { getUserCooldownStatus } from '@/lib/pixel-canvas';

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
    
    const cooldownStatus = getUserCooldownStatus(userId);
    
    return NextResponse.json({
      success: true,
      canPlace: cooldownStatus.canPlace,
      remainingMinutes: cooldownStatus.remainingMinutes,
      cooldownSeconds: cooldownStatus.remainingSeconds
    });
  } catch (error) {
    console.error('Error checking cooldown:', error);
    return NextResponse.json(
      { error: 'Failed to check cooldown' },
      { status: 500 }
    );
  }
}
