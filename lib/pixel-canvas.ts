import fs from 'fs';
import path from 'path';

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

// File paths
const dataDir = path.join(process.cwd(), 'data');
const canvasFile = path.join(dataDir, 'pixel-canvas.json');
const cooldownsFile = path.join(dataDir, 'pixel-cooldowns.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize canvas if it doesn't exist
if (!fs.existsSync(canvasFile)) {
  const initialCanvas: PixelCanvas = {
    id: 'main-canvas',
    width: 200,
    height: 200,
    pixels: [],
    lastUpdated: new Date().toISOString(),
    totalPixels: 0,
    uniqueUsers: 0
  };
  fs.writeFileSync(canvasFile, JSON.stringify(initialCanvas, null, 2));
}

// Initialize cooldowns file if it doesn't exist
if (!fs.existsSync(cooldownsFile)) {
  fs.writeFileSync(cooldownsFile, JSON.stringify([], null, 2));
}

// Load canvas data
function loadCanvas(): PixelCanvas {
  try {
    const data = fs.readFileSync(canvasFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading canvas:', error);
    return {
      id: 'main-canvas',
      width: 200,
      height: 200,
      pixels: [],
      lastUpdated: new Date().toISOString(),
      totalPixels: 0,
      uniqueUsers: 0
    };
  }
}

// Save canvas data
function saveCanvas(canvas: PixelCanvas): void {
  try {
    fs.writeFileSync(canvasFile, JSON.stringify(canvas, null, 2));
  } catch (error) {
    console.error('Error saving canvas:', error);
  }
}

// Load user cooldowns
function loadCooldowns(): UserPixelCooldown[] {
  try {
    const data = fs.readFileSync(cooldownsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading cooldowns:', error);
    return [];
  }
}

// Save user cooldowns
function saveCooldowns(cooldowns: UserPixelCooldown[]): void {
  try {
    fs.writeFileSync(cooldownsFile, JSON.stringify(cooldowns, null, 2));
  } catch (error) {
    console.error('Error saving cooldowns:', error);
  }
}

// Get canvas data
export function getCanvas(): PixelCanvas {
  return loadCanvas();
}

// Place a pixel
export function placePixel(
  x: number,
  y: number,
  color: string,
  userId: string,
  username: string
): { success: boolean; message: string; cooldownRemaining?: number } {
  const canvas = loadCanvas();
  const cooldowns = loadCooldowns();
  
  // Validate coordinates
  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
    return { success: false, message: 'Invalid coordinates' };
  }
  
  // Validate color (hex format)
  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    return { success: false, message: 'Invalid color format' };
  }
  
  // Check cooldown - 30 seconds
  const userCooldown = cooldowns.find(c => c.userId === userId);
  const cooldownSeconds = 30; // 30 seconds cooldown
  
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
  
  // Find existing pixel at this position
  const existingPixelIndex = canvas.pixels.findIndex(p => p.x === x && p.y === y);
  
  if (existingPixelIndex !== -1) {
    // Update existing pixel
    canvas.pixels[existingPixelIndex] = {
      x,
      y,
      color,
      userId,
      username,
      timestamp: new Date().toISOString()
    };
  } else {
    // Add new pixel
    canvas.pixels.push({
      x,
      y,
      color,
      userId,
      username,
      timestamp: new Date().toISOString()
    });
  }
  
  // Update canvas stats
  canvas.lastUpdated = new Date().toISOString();
  canvas.totalPixels = canvas.pixels.length;
  canvas.uniqueUsers = new Set(canvas.pixels.map(p => p.userId)).size;
  
  // Save canvas
  saveCanvas(canvas);
  
  // Update user cooldown - 30 seconds
  if (userCooldown) {
    userCooldown.lastPixelTime = new Date().toISOString();
  } else {
    cooldowns.push({
      userId,
      lastPixelTime: new Date().toISOString(),
      cooldownMinutes: 0.5 // 30 seconds = 0.5 minutes
    });
  }
  saveCooldowns(cooldowns);
  
  return { success: true, message: 'Pixel placed successfully!' };
}

// Get user's cooldown status
export function getUserCooldownStatus(userId: string): { canPlace: boolean; remainingMinutes?: number; remainingSeconds?: number } {
  const cooldowns = loadCooldowns();
  const userCooldown = cooldowns.find(c => c.userId === userId);
  
  if (!userCooldown) {
    return { canPlace: true };
  }
  
  const lastPixelTime = new Date(userCooldown.lastPixelTime);
  const now = new Date();
  const timeDiff = now.getTime() - lastPixelTime.getTime();
  const secondsPassed = timeDiff / 1000;
  const cooldownSeconds = 30;
  
  if (secondsPassed >= cooldownSeconds) {
    return { canPlace: true };
  }
  
  const remainingSeconds = Math.ceil(cooldownSeconds - secondsPassed);
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  return { canPlace: false, remainingMinutes, remainingSeconds };
}

// Get canvas as 2D array for easier rendering
export function getCanvasAsGrid(): string[][] {
  const canvas = loadCanvas();
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
export function clearCanvas(): void {
  const canvas = loadCanvas();
  canvas.pixels = [];
  canvas.lastUpdated = new Date().toISOString();
  canvas.totalPixels = 0;
  canvas.uniqueUsers = 0;
  saveCanvas(canvas);
}

// Get canvas statistics
export function getCanvasStats(): {
  totalPixels: number;
  uniqueUsers: number;
  lastUpdated: string;
  canvasSize: string;
} {
  const canvas = loadCanvas();
  return {
    totalPixels: canvas.totalPixels,
    uniqueUsers: canvas.uniqueUsers,
    lastUpdated: canvas.lastUpdated,
    canvasSize: `${canvas.width}x${canvas.height}`
  };
}
