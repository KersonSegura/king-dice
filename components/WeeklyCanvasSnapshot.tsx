'use client';

import { useState, useEffect, useRef } from 'react';
import { Square, Calendar, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface WeeklySnapshot {
  id: string;
  week: string;
  imageData: string; // Base64 encoded canvas image
  timestamp: string;
}

export default function WeeklyCanvasSnapshot() {
  const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextSnapshotTime, setNextSnapshotTime] = useState<string>('');
  
  // Zoom functionality
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  
  // Touch handling for mobile
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [lastTouchCenter, setLastTouchCenter] = useState<{ x: number; y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Get minimum zoom level based on device type
  const getMinZoom = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? 1.0 : 0.5; // 100% for mobile, 50% for desktop
  };

  // Constrain pan to keep canvas visible within container bounds
  const constrainPan = (newPanX: number, newPanY: number, currentZoomLevel = zoomLevel) => {
    if (!containerRef.current) return { x: newPanX, y: newPanY };
    
    // Calculate actual canvas dimensions at current zoom (assuming 300x300 base size)
    const baseCanvasSize = 300;
    const canvasWidth = baseCanvasSize * currentZoomLevel;
    const canvasHeight = baseCanvasSize * currentZoomLevel;
    
    // Get container dimensions (accounting for padding)
    const containerRect = containerRef.current.getBoundingClientRect();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    // Different padding for mobile vs desktop
    const padding = isMobile ? 48 : 48; // p-6 = 24px each side = 48px total
    const containerWidth = containerRect.width - padding;
    const containerHeight = containerRect.height - padding;
    
    // Calculate how much the canvas extends beyond the container
    const excessWidth = Math.max(0, canvasWidth - containerWidth);
    const excessHeight = Math.max(0, canvasHeight - containerHeight);
    
    // Calculate pan limits
    // When canvas is larger than container, limit pan to keep canvas edges visible
    // When canvas is smaller than container, center it (pan = 0)
    const minX = excessWidth > 0 ? -excessWidth / 2 : 0;
    const maxX = excessWidth > 0 ? excessWidth / 2 : 0;
    const minY = excessHeight > 0 ? -excessHeight / 2 : 0;
    const maxY = excessHeight > 0 ? excessHeight / 2 : 0;
    
    
    return {
      x: Math.max(minX, Math.min(maxX, newPanX)),
      y: Math.max(minY, Math.min(maxY, newPanY))
    };
  };

  // Zoom control functions - only work on mobile
  const handleZoomIn = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobile) return; // Disable zoom on desktop
    setZoomLevel(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobile) return; // Disable zoom on desktop
    setZoomLevel(prev => Math.max(prev - 0.5, getMinZoom()));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      const newPanX = e.clientX - dragStart.x;
      const newPanY = e.clientY - dragStart.y;
      const constrained = constrainPan(newPanX, newPanY);
      setPanX(constrained.x);
      setPanY(constrained.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return null;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touches: TouchList) => {
    if (touches.length === 0) return null;
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - start drag
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY });
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom (mobile only)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (!isMobile) return; // Disable pinch zoom on desktop
      
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      if (distance && center) {
        setLastTouchDistance(distance);
        setLastTouchCenter(center);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging) {
      // Single touch drag
      const touch = e.touches[0];
      const newPanX = touch.clientX - dragStart.x;
      const newPanY = touch.clientY - dragStart.y;
      const constrained = constrainPan(newPanX, newPanY);
      setPanX(constrained.x);
      setPanY(constrained.y);
    } else if (e.touches.length === 2 && lastTouchDistance && lastTouchCenter) {
      // Two finger pinch zoom (mobile only)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (!isMobile) return; // Disable pinch zoom on desktop
      
      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      
      if (currentDistance && currentCenter) {
        const scale = currentDistance / lastTouchDistance;
        const delta = scale > 1 ? 0.1 : -0.1;
        const newZoomLevel = Math.max(getMinZoom(), Math.min(5, zoomLevel + delta));
        setZoomLevel(newZoomLevel);
        
        setLastTouchDistance(currentDistance);
        setLastTouchCenter(currentCenter);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 0) {
      // All touches ended
      setIsDragging(false);
      setLastTouchDistance(null);
      setLastTouchCenter(null);
    }
  };

  // Wheel zoom - disabled on desktop
  const handleWheel = (e: React.WheelEvent) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobile) return; // Disable wheel zoom on desktop
    
    if (isHovering) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoomLevel = Math.max(getMinZoom(), Math.min(5, zoomLevel + delta));
      setZoomLevel(newZoomLevel);
    }
  };

  useEffect(() => {
    const fetchWeeklySnapshot = async () => {
      try {
        // Add cache busting to ensure we get the latest snapshot
        const response = await fetch(`/api/pixel-canvas/snapshot?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          // Silent success for snapshot fetch
          setSnapshot(data.snapshot);
        } else {
          console.error('Failed to fetch weekly snapshot');
        }
      } catch (error) {
        console.error('Error fetching weekly snapshot:', error);
      } finally {
        setLoading(false);
      }
    };

    // Calculate next Sunday at midnight
    const calculateNextSnapshot = () => {
      const now = new Date();
      const nextSunday = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7;
      
      if (daysUntilSunday === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
        // If it's Sunday at midnight, next snapshot is in 7 days
        nextSunday.setDate(now.getDate() + 7);
      } else if (daysUntilSunday === 0) {
        // If it's Sunday but not midnight, next snapshot is today at midnight
        nextSunday.setDate(now.getDate());
      } else {
        // Next Sunday
        nextSunday.setDate(now.getDate() + daysUntilSunday);
      }
      
      nextSunday.setHours(0, 0, 0, 0);
      setNextSnapshotTime(nextSunday.toLocaleDateString());
    };

    fetchWeeklySnapshot();
    calculateNextSnapshot();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Loading...</h3>
          </div>
          <div className="bg-gray-200 rounded-lg h-48 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-[500px] sm:h-[700px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Our Canvas Last Week</h3>
        </div>
        {nextSnapshotTime && (
          <div className="text-xs text-gray-500">
            Next: {nextSnapshotTime}
          </div>
        )}
      </div>
      
      {/* Zoom Controls - Hidden on desktop (normal view) */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 sm:hidden">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="bg-gray-100 rounded-lg p-2 flex-1 flex items-center justify-center overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {snapshot?.imageData ? (
          <div 
            className="inline-block origin-center"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
              transformOrigin: 'center center'
            }}
          >
            <img 
              src={snapshot.imageData} 
              alt="Canvas from last week"
              className="rounded border border-gray-300"
              style={{ 
                imageRendering: 'pixelated',
                width: '300px',
                height: '300px',
                objectFit: 'contain'
              }}
            />
          </div>
        ) : (
          <div className="bg-gray-200 rounded border border-gray-300 h-48 w-48 flex items-center justify-center">
            <span className="text-gray-500 text-sm">No snapshot yet</span>
          </div>
        )}
      </div>
    </div>
  );
}
