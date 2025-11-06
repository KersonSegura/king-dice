import { supabaseAdmin } from './supabase';

export interface CanvasSnapshot {
  id: string;
  canvasId: string;
  weekId: string;
  snapshotDate: string;
  canvasData: any;
  imageData?: string;
  totalPixels: number;
  uniqueUsers: number;
  createdAt: string;
}

// Get the current week identifier (e.g., "2025-W45")
export function getCurrentWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Get the previous week identifier
export function getPreviousWeekId(): string {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const year = lastWeek.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((lastWeek.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

// Save a weekly snapshot to Supabase
export async function saveWeeklySnapshot(
  canvasData: any,
  imageData?: string
): Promise<{ success: boolean; weekId: string; message?: string }> {
  try {
    const weekId = getCurrentWeekId();
    const snapshotId = `snapshot_${weekId}_${Date.now()}`;
    
    const { error } = await supabaseAdmin
      .from('canvas_snapshots')
      .upsert({
        id: snapshotId,
        canvas_id: 'main-canvas',
        week_id: weekId,
        snapshot_date: new Date().toISOString(),
        canvas_data: canvasData,
        image_data: imageData || null,
        total_pixels: canvasData.totalPixels || 0,
        unique_users: canvasData.uniqueUsers || 0,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'canvas_id,week_id'
      });

    if (error) {
      console.error('Error saving snapshot:', error);
      return { success: false, weekId, message: error.message };
    }

    return { success: true, weekId };
  } catch (error) {
    console.error('Exception saving snapshot:', error);
    return { 
      success: false, 
      weekId: getCurrentWeekId(), 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Get the latest snapshot (usually previous week)
export async function getLatestSnapshot(): Promise<{
  success: boolean;
  snapshot: CanvasSnapshot | null;
  message?: string;
}> {
  try {
    const previousWeekId = getPreviousWeekId();
    const currentWeekId = getCurrentWeekId();

    // Try to get previous week's snapshot first
    const { data: prevWeekSnapshot, error: prevError } = await supabaseAdmin
      .from('canvas_snapshots')
      .select('*')
      .eq('canvas_id', 'main-canvas')
      .eq('week_id', previousWeekId)
      .maybeSingle();

    if (prevWeekSnapshot && !prevError) {
      return {
        success: true,
        snapshot: {
          id: prevWeekSnapshot.id,
          canvasId: prevWeekSnapshot.canvas_id,
          weekId: prevWeekSnapshot.week_id,
          snapshotDate: prevWeekSnapshot.snapshot_date,
          canvasData: prevWeekSnapshot.canvas_data,
          imageData: prevWeekSnapshot.image_data,
          totalPixels: prevWeekSnapshot.total_pixels,
          uniqueUsers: prevWeekSnapshot.unique_users,
          createdAt: prevWeekSnapshot.created_at
        }
      };
    }

    // If no previous week, try current week
    const { data: currWeekSnapshot, error: currError } = await supabaseAdmin
      .from('canvas_snapshots')
      .select('*')
      .eq('canvas_id', 'main-canvas')
      .eq('week_id', currentWeekId)
      .maybeSingle();

    if (currWeekSnapshot && !currError) {
      return {
        success: true,
        snapshot: {
          id: currWeekSnapshot.id,
          canvasId: currWeekSnapshot.canvas_id,
          weekId: currWeekSnapshot.week_id,
          snapshotDate: currWeekSnapshot.snapshot_date,
          canvasData: currWeekSnapshot.canvas_data,
          imageData: currWeekSnapshot.image_data,
          totalPixels: currWeekSnapshot.total_pixels,
          uniqueUsers: currWeekSnapshot.unique_users,
          createdAt: currWeekSnapshot.created_at
        },
        message: `Showing current week (${currentWeekId}) - no previous week available`
      };
    }

    // No snapshots found
    return {
      success: true,
      snapshot: null,
      message: `No snapshot available for week ${previousWeekId} or ${currentWeekId}`
    };
  } catch (error) {
    console.error('Error getting snapshot:', error);
    return {
      success: false,
      snapshot: null,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get a specific week's snapshot
export async function getSnapshotByWeek(weekId: string): Promise<{
  success: boolean;
  snapshot: CanvasSnapshot | null;
  message?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('canvas_snapshots')
      .select('*')
      .eq('canvas_id', 'main-canvas')
      .eq('week_id', weekId)
      .maybeSingle();

    if (error) {
      return { success: false, snapshot: null, message: error.message };
    }

    if (!data) {
      return { success: true, snapshot: null, message: `No snapshot found for week ${weekId}` };
    }

    return {
      success: true,
      snapshot: {
        id: data.id,
        canvasId: data.canvas_id,
        weekId: data.week_id,
        snapshotDate: data.snapshot_date,
        canvasData: data.canvas_data,
        imageData: data.image_data,
        totalPixels: data.total_pixels,
        uniqueUsers: data.unique_users,
        createdAt: data.created_at
      }
    };
  } catch (error) {
    console.error('Error getting snapshot by week:', error);
    return {
      success: false,
      snapshot: null,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

