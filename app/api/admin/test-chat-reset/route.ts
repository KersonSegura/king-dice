import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET - Manually trigger chat reset for testing
export async function GET(request: NextRequest) {
  try {
    // Simple auth check - you can call this with the internal token
    const authHeader = request.headers.get('authorization');
    const internalToken = 'Bearer internal-reset-token';
    
    if (authHeader !== internalToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Use: Authorization: Bearer internal-reset-token' },
        { status: 401 }
      );
    }
    
    console.log('🧪 Manual chat reset test triggered at:', new Date().toISOString());
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
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
        console.log('✅ Digital Corner chat reset completed:', digitalCornerData);
      } else {
        const errorText = await digitalCornerResponse.text();
        console.error('❌ Digital Corner reset failed:', {
          status: digitalCornerResponse.status,
          statusText: digitalCornerResponse.statusText,
          body: errorText
        });
        results.push({ 
          chat: 'Digital Corner', 
          error: `Failed with status ${digitalCornerResponse.status}: ${errorText}` 
        });
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
        console.log('✅ Pixel Canvas chat reset completed:', pixelCanvasData);
      } else {
        const errorText = await pixelCanvasResponse.text();
        console.error('❌ Pixel Canvas reset failed:', {
          status: pixelCanvasResponse.status,
          statusText: pixelCanvasResponse.statusText,
          body: errorText
        });
        results.push({ 
          chat: 'Pixel Canvas', 
          error: `Failed with status ${pixelCanvasResponse.status}: ${errorText}` 
        });
      }
    } catch (error) {
      console.error('❌ Pixel Canvas chat reset failed:', error);
      results.push({ chat: 'Pixel Canvas', error: error instanceof Error ? error.message : 'Unknown error' });
    }
    
    const allSuccess = results.every(r => r.success !== false && !r.error);
    
    return NextResponse.json({
      success: allSuccess,
      message: allSuccess 
        ? 'Chat reset test completed successfully' 
        : 'Chat reset test completed with some errors',
      results: results,
      executedAt: new Date().toISOString(),
      note: 'This is a test endpoint. The actual cron job runs at midnight UTC via /api/cron/daily-chat-reset'
    });
  } catch (error) {
    console.error('❌ Manual chat reset test failed:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

