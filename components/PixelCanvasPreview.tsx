'use client';

import { useState, useEffect, useRef } from 'react';
import { Square, Users, Clock } from 'lucide-react';

interface CanvasData {
  id: string;
  width: number;
  height: number;
  pixels: Array<{
    x: number;
    y: number;
    color: string;
    userId: string;
    username: string;
    timestamp: string;
  }>;
  lastUpdated: string;
  totalPixels: number;
  uniqueUsers: number;
  grid: string[][];
}

interface CanvasStats {
  totalPixels: number;
  uniqueUsers: number;
  lastUpdated: string;
  canvasSize: string;
}

export default function PixelCanvasPreview() {
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [stats, setStats] = useState<CanvasStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch canvas data
  useEffect(() => {
    const fetchCanvasData = async () => {
      try {
        const response = await fetch('/api/pixel-canvas');
        if (response.ok) {
          const data = await response.json();
          setCanvasData(data.canvas);
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching canvas data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCanvasData();
  }, []);

  const pixelSize = 4; // Smaller pixels for preview

  // Draw canvas
  const drawCanvas = () => {
    if (!canvasRef.current || !canvasData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasData.width * pixelSize;
    canvas.height = canvasData.height * pixelSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    // Draw vertical lines
    for (let x = 0; x <= canvasData.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * pixelSize, 0);
      ctx.lineTo(x * pixelSize, canvas.height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= canvasData.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * pixelSize);
      ctx.lineTo(canvas.width, y * pixelSize);
      ctx.stroke();
    }

    // Draw pixels
    canvasData.grid.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color && color !== '#FFFFFF' && color !== '#ffffff' && color !== '') {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      });
    });
  };

  // Redraw canvas when data changes
  useEffect(() => {
    drawCanvas();
  }, [canvasData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading canvas...</p>
        </div>
      </div>
    );
  }

  if (!canvasData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Unable to load canvas data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Canvas Preview */}
      <div className="bg-gray-100 p-4 rounded-lg inline-block mx-auto">
        <canvas
          ref={canvasRef}
          className="border border-gray-300"
          style={{
            imageRendering: 'pixelated',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>
    </div>
  );
}
