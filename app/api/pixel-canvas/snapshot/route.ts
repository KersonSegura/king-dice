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
    
    // Fetch current canvas data
    const canvasResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pixel-canvas`);
    
    if (!canvasResponse.ok) {
      throw new Error('Failed to fetch canvas data');
    }
    
    const canvasData = await canvasResponse.json();
    
    // Generate a proper visual representation of the canvas from the pixel data
    let imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // If we have canvas data with pixels, create an actual visual representation
    if (canvasData.success && canvasData.canvas && canvasData.canvas.grid) {
      console.log(`📊 Generating visual snapshot from canvas grid data`);
      
      const grid = canvasData.canvas.grid;
      const width = canvasData.canvas.width || 200;
      const height = canvasData.canvas.height || 200;
      
      // Create SVG representation of the actual pixel canvas
      let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="image-rendering: pixelated;">`;
      
      // Add background
      svgContent += `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
      
      // Add each pixel from the grid
      for (let y = 0; y < height && y < grid.length; y++) {
        for (let x = 0; x < width && x < grid[y].length; x++) {
          const pixelColor = grid[y][x];
          if (pixelColor && pixelColor !== '#ffffff' && pixelColor !== '#FFFFFF') {
            svgContent += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pixelColor}"/>`;
          }
        }
      }
      
      svgContent += '</svg>';
      
      imageData = 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');
      console.log(`✅ Generated snapshot SVG with ${canvasData.canvas.pixels?.length || 0} pixels`);
    } else if (canvasData.success && canvasData.canvas && canvasData.canvas.pixels && canvasData.canvas.pixels.length > 0) {
      console.log(`📊 Generating visual snapshot from pixel array data`);
      
      const pixels = canvasData.canvas.pixels;
      const width = canvasData.canvas.width || 200;
      const height = canvasData.canvas.height || 200;
      
      // Create SVG representation from pixel array
      let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="image-rendering: pixelated;">`;
      
      // Add background
      svgContent += `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
      
      // Add each pixel
      pixels.forEach((pixel: any) => {
        if (pixel.color && pixel.color !== '#ffffff' && pixel.color !== '#FFFFFF') {
          svgContent += `<rect x="${pixel.x}" y="${pixel.y}" width="1" height="1" fill="${pixel.color}"/>`;
        }
      });
      
      svgContent += '</svg>';
      
      imageData = 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');
      console.log(`✅ Generated snapshot SVG from ${pixels.length} pixel array`);
    } else {
      console.log('⚠️ No canvas data available, using placeholder');
    }
    
    // Save the snapshot to Supabase
    const result = await saveWeeklySnapshot(canvasData.canvas || {}, imageData);
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to save snapshot');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Weekly snapshot captured and saved',
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
