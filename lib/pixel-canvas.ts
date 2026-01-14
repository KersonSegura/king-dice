import { supabaseAdmin } from './supabase';

export interface Pixel {
  x: number;
  y: number;
  color: string;
  userId: string;
  username: string;
  timestamp: string;
}

export interface PixelCanvas {
  id: string;
  width: number;
  height: number;
  pixels: Pixel[];
  lastUpdated: string;
  totalPixels: number;
  uniqueUsers: number;
}

export interface UserPixelCooldown {
  userId: string;
  lastPixelTime: string;
  cooldownMinutes: number;
}

const CANVAS_ID = 'main-canvas';

// Load canvas data from Supabase
async function loadCanvas(): Promise<PixelCanvas> {
  try {
    // Get canvas metadata
    const { data: canvasData, error: canvasError } = await supabaseAdmin
      .from('pixel_canvas')
      .select('*')
      .eq('id', CANVAS_ID)
      .maybeSingle();

    // Check if table doesn't exist (PGRST205)
    if (canvasError && canvasError.code === 'PGRST205') {
      console.error('⚠️ Pixel canvas tables not found. Please run the SQL migration in Supabase.');
      // Return empty canvas as fallback
      return {
        id: CANVAS_ID,
        width: 200,
        height: 200,
        pixels: [],
        lastUpdated: new Date().toISOString(),
        totalPixels: 0,
        uniqueUsers: 0
      };
    }

    if (canvasError && canvasError.code !== 'PGRST116') {
      console.error('Error loading canvas metadata:', canvasError);
    }

    // Fetch all pixels in batches (Supabase has server-side 1000 row limit)
    // We need to paginate to get all pixels
    let allPixels: any[] = [];
    let currentPage = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: pageData, error: pageError } = await supabaseAdmin
        .from('pixel_placements')
        .select('*')
        .eq('canvas_id', CANVAS_ID)
        .order('placed_at', { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      // Check if table doesn't exist (PGRST205)
      if (pageError && pageError.code === 'PGRST205') {
        console.error('⚠️ Pixel canvas tables not found. Please run the SQL migration in Supabase.');
        // Return empty canvas as fallback
        return {
          id: CANVAS_ID,
          width: 200,
          height: 200,
          pixels: [],
          lastUpdated: new Date().toISOString(),
          totalPixels: 0,
          uniqueUsers: 0
        };
      }

      if (pageError) {
        console.error(`Error loading pixels page ${currentPage}:`, pageError);
        break;
      }

      if (pageData && pageData.length > 0) {
        allPixels = allPixels.concat(pageData);
        currentPage++;
        // If we got less than pageSize, we've reached the end
        if (pageData.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    const pixelsData = allPixels;
    const count = allPixels.length;

    // Initialize canvas if it doesn't exist
    if (!canvasData) {
      const { data: newCanvas } = await supabaseAdmin
        .from('pixel_canvas')
        .insert({
          id: CANVAS_ID,
          width: 200,
          height: 200,
          total_pixels: 0,
          unique_users: 0
        })
        .select()
        .single();

      if (newCanvas) {
        return {
          id: CANVAS_ID,
          width: newCanvas.width,
          height: newCanvas.height,
          pixels: [],
          lastUpdated: newCanvas.last_updated || new Date().toISOString(),
          totalPixels: 0,
          uniqueUsers: 0
        };
      }
    }

    const pixels: Pixel[] = (pixelsData || []).map((p: any) => ({
      x: p.x,
      y: p.y,
      color: p.color,
      userId: p.user_id,
      username: p.username,
      timestamp: p.placed_at || p.created_at
    }));

    const uniqueUsers = new Set(pixels.map(p => p.userId)).size;

    return {
      id: canvasData?.id || CANVAS_ID,
      width: canvasData?.width || 200,
      height: canvasData?.height || 200,
      pixels,
      lastUpdated: canvasData?.last_updated || new Date().toISOString(),
      totalPixels: pixels.length,
      uniqueUsers
    };
  } catch (error) {
    console.error('Error loading canvas:', error);
    return {
      id: CANVAS_ID,
      width: 200,
      height: 200,
      pixels: [],
      lastUpdated: new Date().toISOString(),
      totalPixels: 0,
      uniqueUsers: 0
    };
  }
}

// Save canvas metadata to Supabase
async function saveCanvas(canvas: PixelCanvas): Promise<void> {
  try {
    await supabaseAdmin
      .from('pixel_canvas')
      .upsert({
        id: canvas.id,
        width: canvas.width,
        height: canvas.height,
        last_updated: canvas.lastUpdated,
        total_pixels: canvas.totalPixels,
        unique_users: canvas.uniqueUsers,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
  } catch (error) {
    console.error('Error saving canvas:', error);
  }
}

// Load user cooldowns from Supabase
async function loadCooldowns(): Promise<UserPixelCooldown[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('pixel_cooldowns')
      .select('*');

    // Check if table doesn't exist (PGRST205) - return empty array
    if (error && error.code === 'PGRST205') {
      return [];
    }

    if (error) {
      console.error('Error loading cooldowns:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      userId: c.user_id,
      lastPixelTime: c.last_pixel_time,
      cooldownMinutes: c.cooldown_minutes
    }));
  } catch (error) {
    console.error('Error loading cooldowns:', error);
    return [];
  }
}

// Save user cooldown to Supabase
async function saveCooldown(cooldown: UserPixelCooldown): Promise<void> {
  try {
    await supabaseAdmin
      .from('pixel_cooldowns')
      .upsert({
        id: `cd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: cooldown.userId,
        last_pixel_time: cooldown.lastPixelTime,
        cooldown_minutes: cooldown.cooldownMinutes,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
  } catch (error) {
    console.error('Error saving cooldown:', error);
  }
}

// Get canvas data
export async function getCanvas(): Promise<PixelCanvas> {
  return await loadCanvas();
}

// Place a pixel
export async function placePixel(
  x: number,
  y: number,
  color: string,
  userId: string,
  username: string
): Promise<{ success: boolean; message: string; cooldownRemaining?: number }> {
  try {
    const canvas = await loadCanvas();
    const cooldowns = await loadCooldowns();
    
    // Validate coordinates
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      return { success: false, message: 'Invalid coordinates' };
    }
    
    // Validate color (hex format) - accept both 3 and 6 digit hex
    // Normalize to 6 digits if needed
    let normalizedColor = color;
    if (/^#[0-9A-F]{3}$/i.test(color)) {
      // Convert 3-digit hex to 6-digit (e.g., #000 -> #000000)
      normalizedColor = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    if (!/^#[0-9A-F]{6}$/i.test(normalizedColor)) {
      return { success: false, message: 'Invalid color format' };
    }
    color = normalizedColor;
    
    // Check cooldown - 0 seconds (no cooldown)
    const userCooldown = cooldowns.find(c => c.userId === userId);
    const cooldownSeconds = 0; // 0 seconds cooldown (disabled)
    
    if (userCooldown) {
      const lastPixelTime = new Date(userCooldown.lastPixelTime);
      const now = new Date();
      const timeDiff = now.getTime() - lastPixelTime.getTime();
      const secondsPassed = timeDiff / 1000;
      
      if (secondsPassed < cooldownSeconds) {
        const remainingSeconds = Math.ceil(cooldownSeconds - secondsPassed);
        return { 
          success: false, 
          message: `Please wait ${remainingSeconds} more second(s) before placing another pixel`,
          cooldownRemaining: Math.ceil(remainingSeconds / 60) // Convert to minutes for display
        };
      }
    }
    
    // Check if pixel already exists at this position
    const { data: existingPixel, error: checkError } = await supabaseAdmin
      .from('pixel_placements')
      .select('id')
      .eq('canvas_id', CANVAS_ID)
      .eq('x', x)
      .eq('y', y)
      .maybeSingle();

    // Check if table doesn't exist
    if (checkError && checkError.code === 'PGRST205') {
      return { success: false, message: 'Pixel canvas database tables not found. Please run the SQL migration in Supabase.' };
    }

    // Generate ID if needed (use timestamp + random for uniqueness)
    const pixelId = existingPixel?.id || `px_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Upsert pixel placement
    const { error: pixelError } = await supabaseAdmin
      .from('pixel_placements')
      .upsert({
        id: pixelId,
        canvas_id: CANVAS_ID,
        x,
        y,
        color,
        user_id: userId,
        username,
        placed_at: now,
        updated_at: now
      }, {
        onConflict: 'canvas_id,x,y'
      });

    if (pixelError) {
      if (pixelError.code === 'PGRST205') {
        return { success: false, message: 'Pixel canvas database tables not found. Please run the SQL migration in Supabase.' };
      }
      console.error('Error placing pixel:', pixelError);
      return { success: false, message: 'Failed to place pixel' };
    }

    // Recalculate canvas stats
    const { data: allPixels } = await supabaseAdmin
      .from('pixel_placements')
      .select('user_id')
      .eq('canvas_id', CANVAS_ID);

    const totalPixels = allPixels?.length || 0;
    const uniqueUsers = new Set(allPixels?.map((p: any) => p.user_id) || []).size;

    // Update canvas metadata
    await saveCanvas({
      ...canvas,
      lastUpdated: now,
      totalPixels,
      uniqueUsers
    });
    
    // Update user cooldown - 0 seconds (ignore errors if table doesn't exist)
    try {
      await saveCooldown({
        userId,
        lastPixelTime: now,
        cooldownMinutes: 0 // 0 seconds = 0 minutes (no cooldown)
      });
    } catch (cooldownError: any) {
      // Silently ignore if table doesn't exist - cooldown isn't critical
      if (cooldownError?.code !== 'PGRST205') {
        console.error('Error saving cooldown:', cooldownError);
      }
    }
    
    return { success: true, message: 'Pixel placed successfully!' };
  } catch (error) {
    console.error('Error in placePixel:', error);
    return { success: false, message: 'Failed to place pixel' };
  }
}

// Get user's cooldown status
export async function getUserCooldownStatus(userId: string): Promise<{ canPlace: boolean; remainingMinutes?: number; remainingSeconds?: number }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('pixel_cooldowns')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Check if table doesn't exist (PGRST205) - allow placing
    if (error && error.code === 'PGRST205') {
      return { canPlace: true };
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading cooldown:', error);
    }

    if (!data) {
      return { canPlace: true };
    }

    const lastPixelTime = new Date(data.last_pixel_time);
    const now = new Date();
    const timeDiff = now.getTime() - lastPixelTime.getTime();
    const secondsPassed = timeDiff / 1000;
    const cooldownSeconds = 0; // 0 seconds cooldown (disabled)
    
    if (secondsPassed >= cooldownSeconds) {
      return { canPlace: true };
    }
    
    const remainingSeconds = Math.ceil(cooldownSeconds - secondsPassed);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return { canPlace: false, remainingMinutes, remainingSeconds };
  } catch (error) {
    console.error('Error in getUserCooldownStatus:', error);
    return { canPlace: true };
  }
}

// Get canvas as 2D array for easier rendering
export async function getCanvasAsGrid(): Promise<string[][]> {
  const canvas = await loadCanvas();
  const grid: string[][] = [];
  
  // Initialize grid with white background
  for (let y = 0; y < canvas.height; y++) {
    grid[y] = [];
    for (let x = 0; x < canvas.width; x++) {
      grid[y][x] = '#FFFFFF'; // White background
    }
  }
  
  // Fill with pixels
  canvas.pixels.forEach(pixel => {
    if (pixel.x >= 0 && pixel.x < canvas.width && pixel.y >= 0 && pixel.y < canvas.height) {
      grid[pixel.y][pixel.x] = pixel.color;
    }
  });
  
  return grid;
}

// Clear canvas (admin function)
export async function clearCanvas(): Promise<void> {
  try {
    await supabaseAdmin
      .from('pixel_placements')
      .delete()
      .eq('canvas_id', CANVAS_ID);

    await supabaseAdmin
      .from('pixel_canvas')
      .update({
        total_pixels: 0,
        unique_users: 0,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', CANVAS_ID);
  } catch (error) {
    console.error('Error clearing canvas:', error);
  }
}

// Get canvas statistics
export async function getCanvasStats(): Promise<{
  totalPixels: number;
  uniqueUsers: number;
  lastUpdated: string;
  canvasSize: string;
}> {
  const canvas = await loadCanvas();
  return {
    totalPixels: canvas.totalPixels,
    uniqueUsers: canvas.uniqueUsers,
    lastUpdated: canvas.lastUpdated,
    canvasSize: `${canvas.width}x${canvas.height}`
  };
}
