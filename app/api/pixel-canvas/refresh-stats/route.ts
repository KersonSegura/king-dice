import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Refresh canvas metadata stats
export async function POST(request: NextRequest) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer refresh-canvas-stats') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Refreshing canvas metadata...');

    // Count total pixels
    const { count: totalPixels } = await supabaseAdmin
      .from('pixel_placements')
      .select('*', { count: 'exact', head: true })
      .eq('canvas_id', 'main-canvas');

    // Count unique users
    const { data: pixels } = await supabaseAdmin
      .from('pixel_placements')
      .select('user_id')
      .eq('canvas_id', 'main-canvas');

    const uniqueUsers = new Set(pixels?.map((p: any) => p.user_id) || []).size;

    // Update canvas metadata
    const { error } = await supabaseAdmin
      .from('pixel_canvas')
      .update({
        total_pixels: totalPixels || 0,
        unique_users: uniqueUsers,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', 'main-canvas');

    if (error) {
      throw new Error(error.message);
    }

    console.log(`✅ Metadata updated: ${totalPixels} pixels from ${uniqueUsers} users`);

    return NextResponse.json({
      success: true,
      totalPixels: totalPixels || 0,
      uniqueUsers,
      message: `Canvas metadata refreshed: ${totalPixels} pixels from ${uniqueUsers} users`
    });
  } catch (error) {
    console.error('Error refreshing canvas metadata:', error);
    return NextResponse.json(
      { error: 'Failed to refresh metadata', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

