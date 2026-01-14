import { NextRequest, NextResponse } from 'next/server';
import { placePixel, getUserCooldownStatus } from '@/lib/pixel-canvas';

export async function POST(request: NextRequest) {
  try {
    const { x, y, color, userId, username } = await request.json();
    
    // Validate required fields
    if (typeof x !== 'number' || typeof y !== 'number' || !color || !userId || !username) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: x, y, color, userId, username' },
        { status: 400 }
      );
    }
    
    // Check if user can place a pixel - 0 seconds cooldown (no cooldown)
    const cooldownStatus = await getUserCooldownStatus(userId);
    if (!cooldownStatus.canPlace) {
      return NextResponse.json({
        success: false,
        message: `Please wait ${cooldownStatus.remainingSeconds || cooldownStatus.remainingMinutes} more second(s) before placing another pixel`,
        cooldownRemaining: cooldownStatus.remainingMinutes
      }, { status: 429 }); // Too Many Requests
    }
    
    // Place the pixel
    const result = await placePixel(x, y, color, userId, username);
    
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
    return NextResponse.json(
      { success: false, message: 'Failed to place pixel' },
      { status: 500 }
    );
  }
}
