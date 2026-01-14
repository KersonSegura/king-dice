import { NextRequest, NextResponse } from 'next/server';
import { placePixel, getUserCooldownStatus } from '@/lib/pixel-canvas';

export async function POST(request: NextRequest) {
  try {
    const { x, y, color, userId, username } = await request.json();
    
    console.log('[PIXEL CANVAS API] Received pixel placement:', { x, y, color, userId, username });
    
    // Validate required fields
    if (typeof x !== 'number' || typeof y !== 'number' || !color || !userId || !username) {
      console.log('[PIXEL CANVAS API] Validation failed:', { x, y, color, userId, username });
      return NextResponse.json(
        { error: 'Missing required fields: x, y, color, userId, username' },
        { status: 400 }
      );
    }
    
    // Check if user can place a pixel - 0 seconds cooldown (no cooldown)
    const cooldownStatus = await getUserCooldownStatus(userId);
    console.log('[PIXEL CANVAS API] Cooldown status:', cooldownStatus);
    if (!cooldownStatus.canPlace) {
      return NextResponse.json({
        success: false,
        message: `Please wait ${cooldownStatus.remainingSeconds || cooldownStatus.remainingMinutes} more second(s) before placing another pixel`,
        cooldownRemaining: cooldownStatus.remainingMinutes
      }, { status: 429 }); // Too Many Requests
    }
    
    // Place the pixel
    console.log('[PIXEL CANVAS API] Calling placePixel...');
    const result = await placePixel(x, y, color, userId, username);
    console.log('[PIXEL CANVAS API] placePixel result:', result);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        cooldownRemaining: result.cooldownRemaining
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[PIXEL CANVAS API] Error placing pixel:', error);
    return NextResponse.json(
      { error: 'Failed to place pixel', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
