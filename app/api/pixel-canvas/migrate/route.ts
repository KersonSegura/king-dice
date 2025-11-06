import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

// This is a one-time migration endpoint
export async function POST(request: NextRequest) {
  try {
    // Simple auth - require a secret token
    const authHeader = request.headers.get('authorization');
    const migrationSecret = process.env.MIGRATION_SECRET || 'migrate-pixels-now-2025';
    
    if (authHeader !== `Bearer ${migrationSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - migration requires secret token' },
        { status: 401 }
      );
    }

    console.log('🎨 Starting Pixel Canvas migration...');

    // Read old pixel canvas JSON
    const dataPath = path.join(process.cwd(), 'data', 'pixel-canvas.json');
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json(
        { error: 'pixel-canvas.json not found' },
        { status: 404 }
      );
    }

    console.log('📖 Reading pixel-canvas.json...');
    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const oldCanvas = JSON.parse(fileContent);

    console.log(`✅ Loaded ${oldCanvas.pixels.length} pixels from JSON file`);

    // Check if canvas already exists
    const { data: existingCanvas } = await supabaseAdmin
      .from('pixel_canvas')
      .select('*')
      .eq('id', 'main-canvas')
      .maybeSingle();

    if (!existingCanvas) {
      console.log('📝 Creating canvas metadata...');
      await supabaseAdmin
        .from('pixel_canvas')
        .insert({
          id: 'main-canvas',
          width: oldCanvas.width,
          height: oldCanvas.height,
          total_pixels: oldCanvas.totalPixels,
          unique_users: oldCanvas.uniqueUsers,
          last_updated: oldCanvas.lastUpdated
        });
      console.log('✅ Canvas metadata created');
    }

    // Check how many pixels are already in the database
    const { count: existingCount } = await supabaseAdmin
      .from('pixel_placements')
      .select('*', { count: 'exact', head: true })
      .eq('canvas_id', 'main-canvas');

    console.log(`📊 Current pixels in database: ${existingCount || 0}`);

    // Prepare pixels for insertion
    console.log('🔄 Preparing pixels for insertion...');
    const pixelsToInsert = oldCanvas.pixels.map((pixel: any, index: number) => ({
      id: `px_migrated_${Date.now()}_${index}`,
      canvas_id: 'main-canvas',
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
      user_id: pixel.userId,
      username: pixel.username,
      placed_at: pixel.timestamp,
      created_at: pixel.timestamp,
      updated_at: pixel.timestamp
    }));

    // Insert in batches (Supabase has a limit)
    const batchSize = 1000;
    const totalBatches = Math.ceil(pixelsToInsert.length / batchSize);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    console.log(`📦 Inserting ${pixelsToInsert.length} pixels in ${totalBatches} batches...`);

    for (let i = 0; i < pixelsToInsert.length; i += batchSize) {
      const batch = pixelsToInsert.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      try {
        const { error } = await supabaseAdmin
          .from('pixel_placements')
          .upsert(batch, {
            onConflict: 'canvas_id,x,y',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Error in batch ${batchNumber}:`, error.message);
          errorCount += batch.length;
          errors.push(`Batch ${batchNumber}: ${error.message}`);
        } else {
          successCount += batch.length;
          console.log(`✅ Batch ${batchNumber}/${totalBatches} complete (${successCount}/${pixelsToInsert.length} pixels)`);
        }
      } catch (err) {
        console.error(`❌ Exception in batch ${batchNumber}:`, err);
        errorCount += batch.length;
        errors.push(`Batch ${batchNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Update canvas statistics
    console.log('📊 Updating canvas statistics...');
    
    const { data: allPixels } = await supabaseAdmin
      .from('pixel_placements')
      .select('user_id')
      .eq('canvas_id', 'main-canvas');

    const totalPixels = allPixels?.length || 0;
    const uniqueUsers = new Set(allPixels?.map((p: any) => p.user_id) || []).size;

    await supabaseAdmin
      .from('pixel_canvas')
      .update({
        total_pixels: totalPixels,
        unique_users: uniqueUsers,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', 'main-canvas');

    return NextResponse.json({
      success: true,
      message: 'Migration complete!',
      stats: {
        totalPixels,
        uniqueUsers,
        successfullyMigrated: successCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors.slice(0, 5) : undefined
      }
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  try {
    const { count } = await supabaseAdmin
      .from('pixel_placements')
      .select('*', { count: 'exact', head: true })
      .eq('canvas_id', 'main-canvas');

    const { data: canvas } = await supabaseAdmin
      .from('pixel_canvas')
      .select('*')
      .eq('id', 'main-canvas')
      .maybeSingle();

    return NextResponse.json({
      success: true,
      currentPixels: count || 0,
      canvasMetadata: canvas || null,
      message: count === 0 ? 'No pixels migrated yet' : `${count} pixels in database`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}

