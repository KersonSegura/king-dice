import { NextRequest, NextResponse } from 'next/server';

// This endpoint can be called by a cron service (like Vercel Cron or external cron job)
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('Unauthorized cron request attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('🕐 Daily chat reset cron job triggered at:', new Date().toISOString());
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const results = [];
    
    // Reset Digital Corner chat
    try {
      const digitalCornerResponse = await fetch(`${baseUrl}/api/digital-corner/chat/reset`, {
        method: 'POST',
        headers: {
          'authorization': 'Bearer internal-reset-token',
          'content-type': 'application/json'
        }
      });
      
      if (digitalCornerResponse.ok) {
        const digitalCornerData = await digitalCornerResponse.json();
        results.push({ chat: 'Digital Corner', ...digitalCornerData });
        console.log('✅ Digital Corner chat reset completed');
      } else {
        throw new Error(`Digital Corner reset failed with status: ${digitalCornerResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Digital Corner chat reset failed:', error);
      results.push({ chat: 'Digital Corner', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    // Reset Pixel Canvas chat
    try {
      const pixelCanvasResponse = await fetch(`${baseUrl}/api/pixel-canvas/chat/reset`, {
        method: 'POST',
        headers: {
          'authorization': 'Bearer internal-reset-token',
          'content-type': 'application/json'
        }
      });
      
      if (pixelCanvasResponse.ok) {
        const pixelCanvasData = await pixelCanvasResponse.json();
        results.push({ chat: 'Pixel Canvas', ...pixelCanvasData });
        console.log('✅ Pixel Canvas chat reset completed');
      } else {
        throw new Error(`Pixel Canvas reset failed with status: ${pixelCanvasResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Pixel Canvas chat reset failed:', error);
      results.push({ chat: 'Pixel Canvas', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    console.log('✅ Daily chat reset completed for both chats');
    
    return NextResponse.json({
      success: true,
      message: 'Daily chat reset completed for both chats',
      results: results,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Daily chat reset cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for webhook-based cron services
export async function POST(request: NextRequest) {
  return GET(request);
}
