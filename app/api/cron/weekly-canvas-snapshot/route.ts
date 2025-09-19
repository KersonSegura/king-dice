import { NextRequest, NextResponse } from 'next/server';

// This endpoint captures a weekly canvas snapshot every Sunday at midnight
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('Unauthorized weekly snapshot cron request attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('📸 Weekly canvas snapshot cron job triggered at:', new Date().toISOString());
    
    // Check if today is Sunday (0 = Sunday)
    const today = new Date();
    if (today.getDay() !== 0) {
      console.log('⚠️ Weekly snapshot triggered on non-Sunday, skipping...');
      return NextResponse.json({
        success: false,
        message: 'Weekly snapshots only run on Sundays',
        currentDay: today.getDay(),
        executedAt: new Date().toISOString()
      });
    }
    
    // Call the internal snapshot trigger API
    const snapshotResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pixel-canvas/snapshot`, {
      method: 'PUT',
      headers: {
        'authorization': 'Bearer internal-snapshot-trigger',
        'content-type': 'application/json'
      }
    });
    
    if (!snapshotResponse.ok) {
      throw new Error(`Snapshot API failed with status: ${snapshotResponse.status}`);
    }
    
    const snapshotData = await snapshotResponse.json();
    
    console.log('✅ Weekly canvas snapshot completed:', snapshotData);
    
    return NextResponse.json({
      success: true,
      message: 'Weekly canvas snapshot completed successfully',
      snapshotData: snapshotData,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Weekly canvas snapshot cron job failed:', error);
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
