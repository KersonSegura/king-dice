import { NextRequest, NextResponse } from 'next/server';

// This endpoint refreshes the Digital Corner price cache daily
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('Unauthorized price refresh cron request attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('🔄 Daily price refresh cron job triggered at:', new Date().toISOString());
    
    // Call the internal price refresh API
    const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/digital-corner/prices`, {
      method: 'POST',
      headers: {
        'authorization': 'Bearer internal-price-refresh',
        'content-type': 'application/json'
      }
    });
    
    if (!refreshResponse.ok) {
      throw new Error(`Price refresh API failed with status: ${refreshResponse.status}`);
    }
    
    const refreshData = await refreshResponse.json();
    
    console.log('✅ Daily price refresh completed:', refreshData);
    
    return NextResponse.json({
      success: true,
      message: 'Daily price refresh completed successfully',
      refreshData: refreshData,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Daily price refresh cron job failed:', error);
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
