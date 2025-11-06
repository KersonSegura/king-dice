import { NextRequest, NextResponse } from 'next/server';
import { getLatestSnapshot, saveWeeklySnapshot, getCurrentWeekId } from '@/lib/canvas-snapshot-supabase';

// Get weekly snapshot (returns the previous week's snapshot, or current week if no previous exists)
export async function GET(request: NextRequest) {
  try {
    const result = await getLatestSnapshot();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        snapshot: null,
        message: result.message || 'Failed to fetch snapshot'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      snapshot: result.snapshot,
      message: result.message,
      currentWeek: getCurrentWeekId()
    });
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Save weekly snapshot
export async function POST(request: NextRequest) {
  try {
    const { imageData, canvasData } = await request.json();
    
    if (!canvasData) {
      return NextResponse.json(
        { error: 'Canvas data is required' },
        { status: 400 }
      );
    }
    
    const result = await saveWeeklySnapshot(canvasData, imageData);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message || 'Failed to save snapshot'
      }, { status: 500 });
    }
    
    console.log(`📸 Weekly canvas snapshot saved for week ${result.weekId}`);
    
    return NextResponse.json({
      success: true,
      message: `Weekly snapshot saved for week ${result.weekId}`,
      weekId: result.weekId
    });
  } catch (error) {
    console.error('Error saving weekly snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to save weekly snapshot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Trigger weekly snapshot (for cron job)
export async function PUT(request: NextRequest) {
  try {
    // Verify this is an authorized request
    const authHeader = request.headers.get('authorization');
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron') || 
                         process.env.VERCEL === '1';
    const isInternalTrigger = authHeader === 'Bearer internal-snapshot-trigger';
    
    if (!isVercelCron && !isInternalTrigger) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('📸 Weekly snapshot trigger activated');
    
    // Fetch current canvas stats (lightweight - no full pixel data)
    const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pixel-canvas`);
    
    if (!statsResponse.ok) {
      throw new Error('Failed to fetch canvas stats');
    }
    
    const statsData = await statsResponse.json();
    
    // Use a simple placeholder image - we'll display the live canvas instead
    const imageData = 'data:image/svg+xml;base64,' + Buffer.from(
      `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="#f3f4f6"/>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="16" fill="#6b7280">
          Canvas Snapshot
        </text>
        <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="12" fill="#9ca3af">
          ${statsData.stats?.totalPixels || 0} pixels
        </text>
      </svg>`
    ).toString('base64');
    
    // Create a lightweight snapshot object
    const snapshotData = {
      width: statsData.canvas?.width || 200,
      height: statsData.canvas?.height || 200,
      totalPixels: statsData.stats?.totalPixels || 0,
      uniqueUsers: statsData.stats?.uniqueUsers || 0,
      lastUpdated: statsData.stats?.lastUpdated || new Date().toISOString(),
      canvasSize: statsData.stats?.canvasSize || '200x200'
    };
    
    // Save the snapshot to Supabase
    const result = await saveWeeklySnapshot(snapshotData, imageData);
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to save snapshot');
    }
    
    console.log(`✅ Snapshot saved with ${snapshotData.totalPixels} pixels`);
    
    return NextResponse.json({
      success: true,
      message: `Weekly snapshot captured and saved with ${snapshotData.totalPixels} pixels`,
      weekId: result.weekId
    });
  } catch (error) {
    console.error('Error triggering weekly snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to trigger weekly snapshot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
