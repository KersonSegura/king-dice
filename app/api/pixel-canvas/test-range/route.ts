import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Test endpoint to verify .range() is being used
export async function GET() {
  try {
    const { data, error, count } = await supabaseAdmin
      .from('pixel_placements')
      .select('*', { count: 'exact' })
      .eq('canvas_id', 'main-canvas')
      .range(0, 49999);

    return NextResponse.json({
      success: true,
      pixelsReturned: data?.length || 0,
      totalCount: count || 0,
      message: `Using .range(0, 49999) - returned ${data?.length || 0} pixels out of ${count || 0} total`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

