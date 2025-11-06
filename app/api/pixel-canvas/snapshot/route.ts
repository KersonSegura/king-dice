import { NextRequest, NextResponse } from 'next/server';
import { getLatestSnapshot, saveWeeklySnapshot, getCurrentWeekId } from '@/lib/canvas-snapshot-supabase';
import { supabaseAdmin } from '@/lib/supabase';

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
    
    // Get canvas metadata and pixels directly from Supabase (fast!)
    const { data: canvasMetadata } = await supabaseAdmin
      .from('pixel_canvas')
      .select('*')
      .eq('id', 'main-canvas')
      .maybeSingle();
    
    const width = canvasMetadata?.width || 200;
    const height = canvasMetadata?.height || 200;
    const totalPixels = canvasMetadata?.total_pixels || 0;
    const uniqueUsers = canvasMetadata?.unique_users || 0;
    
    // Fetch only pixel coordinates and colors (lightweight)
    const { data: pixels } = await supabaseAdmin
      .from('pixel_placements')
      .select('x, y, color')
      .eq('canvas_id', 'main-canvas');
    
    // Build grid efficiently
    const grid: string[][] = [];
    for (let y = 0; y < height; y++) {
      grid[y] = Array(width).fill('#FFFFFF'); // White background
    }
    
    // Fill grid with pixels
    if (pixels) {
      for (const pixel of pixels) {
        if (pixel.x >= 0 && pixel.x < width && pixel.y >= 0 && pixel.y < height) {
          grid[pixel.y][pixel.x] = pixel.color;
        }
      }
    }
    
    // Generate SVG image from grid (only non-white pixels for efficiency)
    let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="image-rendering: pixelated;">`;
    svgContent += `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
    
    let pixelCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = grid[y][x];
        if (color && color !== '#ffffff' && color !== '#FFFFFF') {
          svgContent += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
          pixelCount++;
        }
      }
    }
    
    svgContent += '</svg>';
    
    const imageData = 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');
    
    console.log(`✅ Generated canvas image with ${pixelCount} colored pixels`);
    
    // Create snapshot object
    const snapshotData = {
      width,
      height,
      totalPixels,
      uniqueUsers,
      lastUpdated: canvasMetadata?.last_updated || new Date().toISOString(),
      canvasSize: `${width}x${height}`
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
