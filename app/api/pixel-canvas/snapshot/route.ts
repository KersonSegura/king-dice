import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SNAPSHOTS_DIR = path.join(process.cwd(), 'data', 'canvas-snapshots');
const CURRENT_SNAPSHOT_FILE = path.join(SNAPSHOTS_DIR, 'current-week.json');

interface CanvasSnapshot {
  id: string;
  week: string;
  imageData: string;
  timestamp: string;
  canvasData?: any;
}

// Ensure snapshots directory exists
function ensureSnapshotsDir() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
}

// Get the current week identifier (e.g., "2025-W38")
function getCurrentWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Get the previous week identifier
function getPreviousWeekId(): string {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const year = lastWeek.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((lastWeek.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Get weekly snapshot (returns the previous week's snapshot, or current week if no previous exists)
export async function GET(request: NextRequest) {
  try {
    ensureSnapshotsDir();
    
    const previousWeekId = getPreviousWeekId();
    const currentWeekId = getCurrentWeekId();
    
    // First, try to get previous week's snapshot
    let snapshotFile = path.join(SNAPSHOTS_DIR, `${previousWeekId}.json`);
    
    if (fs.existsSync(snapshotFile)) {
      const snapshotData = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8'));
      return NextResponse.json({
        success: true,
        snapshot: snapshotData
      });
    } else {
      // If no previous week snapshot, try current week as fallback
      snapshotFile = path.join(SNAPSHOTS_DIR, `${currentWeekId}.json`);
      
      if (fs.existsSync(snapshotFile)) {
        const snapshotData = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8'));
        return NextResponse.json({
          success: true,
          snapshot: snapshotData,
          message: `Showing current week snapshot (${currentWeekId}) - no previous week available`
        });
      } else {
        // No snapshot available at all
        return NextResponse.json({
          success: true,
          snapshot: null,
          message: `No snapshot available for week ${previousWeekId} or ${currentWeekId}`
        });
      }
    }
  } catch (error) {
    console.error('Error getting weekly snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to get weekly snapshot' },
      { status: 500 }
    );
  }
}

// Save weekly snapshot
export async function POST(request: NextRequest) {
  try {
    const { imageData, canvasData } = await request.json();
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }
    
    ensureSnapshotsDir();
    
    const currentWeekId = getCurrentWeekId();
    const snapshot: CanvasSnapshot = {
      id: `snapshot-${currentWeekId}`,
      week: currentWeekId,
      imageData: imageData,
      timestamp: new Date().toISOString(),
      canvasData: canvasData
    };
    
    // Save snapshot for current week
    const snapshotFile = path.join(SNAPSHOTS_DIR, `${currentWeekId}.json`);
    fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
    
    console.log(`📸 Weekly canvas snapshot saved for week ${currentWeekId}`);
    
    return NextResponse.json({
      success: true,
      message: `Weekly snapshot saved for week ${currentWeekId}`,
      snapshot: snapshot
    });
  } catch (error) {
    console.error('Error saving weekly snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to save weekly snapshot' },
      { status: 500 }
    );
  }
}

// Trigger weekly snapshot (for cron job)
export async function PUT(request: NextRequest) {
  try {
    // Verify this is an authorized request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer internal-snapshot-trigger') {
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
    
    // Save the snapshot
    const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pixel-canvas/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageData: imageData,
        canvasData: canvasData
      })
    });
    
    if (!saveResponse.ok) {
      throw new Error('Failed to save snapshot');
    }
    
    const saveResult = await saveResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Weekly snapshot captured and saved',
      result: saveResult
    });
  } catch (error) {
    console.error('Error triggering weekly snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to trigger weekly snapshot' },
      { status: 500 }
    );
  }
}