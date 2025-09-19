import { NextRequest, NextResponse } from 'next/server';
import { placePixel, getUserCooldownStatus } from '@/lib/pixel-canvas';

export async function POST(request: NextRequest) {
  try {
    const { x, y, color, userId, username } = await request.json();
    
    // Validate required fields
    if (typeof x !== 'number' || typeof y !== 'number' || !color || !userId || !username) {
      return NextResponse.json(
        { error: 'Missing required fields: x, y, color, userId, username' },
        { status: 400 }
      );
    }
    
    // Check if user can place a pixel - 30 seconds cooldown
    const cooldownStatus = getUserCooldownStatus(userId);
    if (!cooldownStatus.canPlace) {
      return NextResponse.json({
        success: false,
        message: `Please wait ${cooldownStatus.remainingMinutes} more minute(s) before placing another pixel`,
        cooldownRemaining: cooldownStatus.remainingMinutes
      }, { status: 429 }); // Too Many Requests
    }
    
    // Place the pixel
    const result = placePixel(x, y, color, userId, username);
    
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
    console.error('Error placing pixel:', error);
    return NextResponse.json(
      { error: 'Failed to place pixel' },
      { status: 500 }
    );
  }
}
