// Utility functions for capturing canvas snapshots

export interface CanvasSnapshot {
  id: string;
  week: string;
  imageData: string;
  timestamp: string;
  canvasData: any;
}

export async function captureCanvasSnapshot(canvas: HTMLCanvasElement): Promise<string> {
  // Convert canvas to base64 image
  return canvas.toDataURL('image/png');
}

export async function saveWeeklySnapshot(canvas: HTMLCanvasElement, canvasData: any): Promise<boolean> {
  try {
    const imageData = await captureCanvasSnapshot(canvas);
    
    const response = await fetch('/api/pixel-canvas/snapshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData,
        canvasData
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Weekly snapshot saved:', result.message);
      return true;
    } else {
      console.error('Failed to save weekly snapshot');
      return false;
    }
  } catch (error) {
    console.error('Error saving weekly snapshot:', error);
    return false;
  }
}

export function shouldTakeWeeklySnapshot(): boolean {
  // Check if we should take a weekly snapshot
  // This could be based on time, user activity, or other criteria
  const lastSnapshot = localStorage.getItem('lastWeeklySnapshot');
  if (!lastSnapshot) return true;
  
  const lastSnapshotDate = new Date(lastSnapshot);
  const now = new Date();
  const daysSinceLastSnapshot = (now.getTime() - lastSnapshotDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Take snapshot if it's been more than 7 days
  return daysSinceLastSnapshot >= 7;
}

export function markWeeklySnapshotTaken(): void {
  localStorage.setItem('lastWeeklySnapshot', new Date().toISOString());
}
