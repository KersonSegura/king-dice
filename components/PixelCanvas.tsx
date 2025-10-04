'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Palette, Clock, Users, Square, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Pipette } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { saveWeeklySnapshot, shouldTakeWeeklySnapshot, markWeeklySnapshotTaken } from '@/lib/canvas-snapshot';

interface PixelCanvasProps {
  width?: number;
  height?: number;
  pixelSize?: number;
}

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

const DEFAULT_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A',
  '#808080', '#000080', '#008000', '#800000', '#FFD700', '#C0C0C0'
];

export default function PixelCanvas({
  width = 200,
  height = 200,
  pixelSize = 7
}: PixelCanvasProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [stats, setStats] = useState<CanvasStats | null>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [isPlacing, setIsPlacing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [countdownTimer, setCountdownTimer] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const baseZoom = 1.5; // This is our "normal" size (0% zoom)
  
  // Initialize zoom level based on device type
  const getInitialZoom = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? baseZoom * 0.7 : baseZoom * 0.5; // Start at minimum for each device
  };
  
  const [zoomLevel, setZoomLevel] = useState(getInitialZoom);
  
  // Get minimum zoom level based on device type
  const getMinZoom = () => {
    // Check if it's a mobile device
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? baseZoom * 0.7 : baseZoom * 0.5; // 70% on mobile, 50% on desktop
  };
  
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [isEditingColor, setIsEditingColor] = useState(false);
  const [tempColorCode, setTempColorCode] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isEyedropperMode, setIsEyedropperMode] = useState(false);
  
  // Touch handling for mobile
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [lastTouchCenter, setLastTouchCenter] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const dropperInputRef = useRef<HTMLInputElement>(null);

  // Fetch canvas data
  const fetchCanvasData = useCallback(async () => {
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
  }, []);

  // Check user cooldown
  const checkCooldown = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      const response = await fetch(`/api/pixel-canvas/cooldown?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setCooldownRemaining(data.remainingMinutes);
        setCooldownSeconds(data.cooldownSeconds);
        
        // Start countdown timer if there's a cooldown
        if (data.cooldownSeconds && data.cooldownSeconds > 0) {
          setCountdownTimer(data.cooldownSeconds);
        } else {
          setCountdownTimer(null);
        }
      }
    } catch (error) {
      console.error('Error checking cooldown:', error);
    }
  }, [isAuthenticated, user]);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (countdownTimer && countdownTimer > 0) {
      interval = setInterval(() => {
        setCountdownTimer(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            // Timer finished, check cooldown again
            checkCooldown();
            return null;
          }
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [countdownTimer, checkCooldown]);

  // Place a pixel
  const placePixel = async (x: number, y: number) => {
    if (!isAuthenticated || !user || isPlacing) {
      return;
    }

    setIsPlacing(true);

    try {
      const response = await fetch('/api/pixel-canvas/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x,
          y,
          color: selectedColor,
          userId: user.id,
          username: user.username
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast(data.message, 'success', 3000);
        await fetchCanvasData();
        // Start 30-second countdown immediately
        setCountdownTimer(30);
        // Also check server-side cooldown to ensure sync
        await checkCooldown();
      } else {
        showToast(data.message, 'error');
        if (data.cooldownRemaining) {
          setCooldownRemaining(data.cooldownRemaining);
        }
      }
    } catch (error) {
      console.error('Error placing pixel:', error);
      showToast('Failed to place pixel', 'error');
    } finally {
      setIsPlacing(false);
    }
  };

  // Handle pixel click
  const handlePixelClick = (x: number, y: number) => {
    if (!isAuthenticated || !user) {
      showToast('Please sign in to place pixels', 'error');
      return;
    }

    if (countdownTimer) {
      showToast(`Please wait ${countdownTimer} more second(s)`, 'error');
      return;
    }

    placePixel(x, y);
  };

  // Color editing functions
  const handleColorCodeEdit = () => {
    setIsEditingColor(true);
    setTempColorCode(selectedColor);
  };

  const handleColorCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Always ensure the value starts with #
    if (value && !value.startsWith('#')) {
      value = '#' + value;
    }
    
    setTempColorCode(value);
    
    // Update selected color in real-time if it's a valid hex code
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(value)) {
      setSelectedColor(value);
    }
  };

  const handleColorCodeBlur = () => {
    // Ensure the value has # prefix
    let finalValue = tempColorCode;
    if (finalValue && !finalValue.startsWith('#')) {
      finalValue = '#' + finalValue;
    }
    
    // Validate and finalize the color code when user clicks away
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(finalValue)) {
      setSelectedColor(finalValue);
      setTempColorCode(finalValue);
    } else {
      // Reset to last valid color if invalid
      setTempColorCode(selectedColor);
    }
    setIsEditingColor(false);
  };

  const handleColorCodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      handleColorCodeBlur();
    }
  };

  // Color picker functionality
  const handleColorBarClick = () => {
    setShowColorPicker(!showColorPicker);
  };

  const handleDropperClick = async () => {
    if (isEyedropperMode) {
      // Deactivate eyedropper mode
      setIsEyedropperMode(false);
      return;
    }

    try {
      // Check if Eyedropper API is supported
      if ('EyeDropper' in window) {
        // Use native Eyedropper API (Chrome 95+)
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        
        if (result && result.sRGBHex) {
          setSelectedColor(result.sRGBHex);
          setTempColorCode(result.sRGBHex);
          showToast('Color picked from screen!', 'success');
        }
      } else {
        // Fallback to screen capture for browsers without Eyedropper API
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        // Create a hidden video element to capture the screen
        const video = document.createElement('video');
        video.srcObject = stream;
        video.style.position = 'fixed';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100vw';
        video.style.height = '100vh';
        video.style.zIndex = '9999';
        video.style.pointerEvents = 'none';
        video.style.opacity = '0';
        video.style.visibility = 'hidden';
        document.body.appendChild(video);
        
        video.play();
        
        // Wait for video to be ready
        video.addEventListener('loadedmetadata', () => {
          // Create overlay for color picking
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100vw';
          overlay.style.height = '100vh';
          overlay.style.zIndex = '10000';
          overlay.style.cursor = 'crosshair';
          overlay.style.backgroundColor = 'rgba(0,0,0,0.05)';
          document.body.appendChild(overlay);
          
          // Create magnifier
          const magnifier = document.createElement('canvas');
          magnifier.width = 120;
          magnifier.height = 120;
          magnifier.style.position = 'fixed';
          magnifier.style.zIndex = '10001';
          magnifier.style.border = '3px solid #333';
          magnifier.style.borderRadius = '8px';
          magnifier.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          magnifier.style.pointerEvents = 'none';
          document.body.appendChild(magnifier);
          
          const magnifierCtx = magnifier.getContext('2d');
          
          // Handle mouse move for magnifier
          const handleMouseMove = (e: MouseEvent) => {
            if (magnifierCtx) {
              // Position magnifier centered on cursor
              magnifier.style.left = `${e.clientX - 60}px`;
              magnifier.style.top = `${e.clientY - 60}px`;
              
              // Draw magnified area (4x zoom)
              magnifierCtx.clearRect(0, 0, 120, 120);
              magnifierCtx.imageSmoothingEnabled = false;
              magnifierCtx.drawImage(
                video,
                e.clientX - 15, e.clientY - 15, 30, 30,
                0, 0, 120, 120
              );
              
              // Draw crosshair at center
              magnifierCtx.strokeStyle = '#ff0000';
              magnifierCtx.lineWidth = 2;
              magnifierCtx.beginPath();
              magnifierCtx.moveTo(60, 50);
              magnifierCtx.lineTo(60, 70);
              magnifierCtx.moveTo(50, 60);
              magnifierCtx.lineTo(70, 60);
              magnifierCtx.stroke();
            }
          };
          
          // Handle click to pick color
          const handleClick = (e: MouseEvent) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = 1;
              canvas.height = 1;
              ctx.drawImage(video, e.clientX, e.clientY, 1, 1, 0, 0, 1, 1);
              const imageData = ctx.getImageData(0, 0, 1, 1);
              const data = imageData.data;
              const r = data[0];
              const g = data[1];
              const b = data[2];
              const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
              
              setSelectedColor(color);
              setTempColorCode(color);
              showToast('Color picked from screen!', 'success');
            }
            
            // Clean up
            stream.getTracks().forEach(track => track.stop());
            document.body.removeChild(video);
            document.body.removeChild(overlay);
            document.body.removeChild(magnifier);
            overlay.removeEventListener('mousemove', handleMouseMove);
            overlay.removeEventListener('click', handleClick);
          };
          
          overlay.addEventListener('mousemove', handleMouseMove);
          overlay.addEventListener('click', handleClick);
          
          // Handle escape key to cancel
          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              stream.getTracks().forEach(track => track.stop());
              document.body.removeChild(video);
              document.body.removeChild(overlay);
              document.body.removeChild(magnifier);
              overlay.removeEventListener('mousemove', handleMouseMove);
              overlay.removeEventListener('click', handleClick);
              document.removeEventListener('keydown', handleKeyDown);
            }
          };
          
          document.addEventListener('keydown', handleKeyDown);
        });
      }
      
    } catch (error) {
      console.error('Error with eyedropper:', error);
      showToast('Eyedropper not supported or denied', 'error');
    }
  };

  const getColorFromPixel = (x: number, y: number): string => {
    if (!canvasRef.current) return selectedColor;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return selectedColor;
    
    // Get the pixel data
    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    const r = data[0];
    const g = data[1];
    const b = data[2];
    const a = data[3];
    
    // Convert to hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };


  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setTempColorCode(color);
  };

  // Zoom controls (relative to base zoom)
  const handleZoomIn = () => {
    const newZoomLevel = Math.min(zoomLevel + 0.5, baseZoom * 3.33); // Max 500% (3.33x base)
    setZoomLevel(newZoomLevel);
  };

  const handleZoomOut = () => {
    const newZoomLevel = Math.max(zoomLevel - 0.5, getMinZoom());
    setZoomLevel(newZoomLevel);
  };

  // Helper function to center canvas at a specific zoom level
  const centerCanvas = (zoomLevel: number) => {
    if (canvasData && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width - 32;
      const containerHeight = containerRect.height - 32;
      
      const canvasWidth = canvasData.width * pixelSize * zoomLevel;
      const canvasHeight = canvasData.height * pixelSize * zoomLevel;
      
      // Center the canvas in the container
      const centerX = (containerWidth - canvasWidth) / 2;
      const centerY = (containerHeight - canvasHeight) / 2;
      
      // Apply constraints but don't force centering if it would go out of bounds
      const constrained = constrainPan(centerX, centerY, zoomLevel);
      setPanX(constrained.x);
      setPanY(constrained.y);
    }
  };

  const handleResetView = () => {
    setZoomLevel(getMinZoom()); // Reset to minimum zoom (80% on mobile, 50% on desktop)
    // Reset pan to center (canvas is now centered by CSS)
    setPanX(0);
    setPanY(0);
  };

  // Helper function to constrain pan values to keep canvas visible within container bounds
  const constrainPan = (newPanX: number, newPanY: number, currentZoomLevel = zoomLevel) => {
    if (!canvasData || !containerRef.current) return { x: newPanX, y: newPanY };
    
    // Calculate actual canvas dimensions at current zoom
    const canvasWidth = canvasData.width * pixelSize * currentZoomLevel;
    const canvasHeight = canvasData.height * pixelSize * currentZoomLevel;
    
    // Get container dimensions (accounting for padding)
    const containerRect = containerRef.current.getBoundingClientRect();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    // Different padding for mobile vs desktop
    const padding = isMobile ? 32 : 32; // p-4 = 16px each side = 32px total
    const containerWidth = containerRect.width - padding;
    const containerHeight = containerRect.height - padding;
    
    // Calculate how much the canvas extends beyond the container
    const excessWidth = Math.max(0, canvasWidth - containerWidth);
    const excessHeight = Math.max(0, canvasHeight - containerHeight);
    
     // No constraints - allow free panning in all directions
     // You can pan the canvas anywhere you want
     const minX = -excessWidth;
     const maxX = containerWidth;
     const minY = -excessHeight;
     const maxY = containerHeight;
    
    
    return {
      x: Math.max(minX, Math.min(maxX, newPanX)),
      y: Math.max(minY, Math.min(maxY, newPanY))
    };
  };



  // Pan controls - simplified like WeeklyCanvasSnapshot
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

  // Touch event handlers for mobile
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
    // e.preventDefault(); // Removed to avoid passive event listener error
    
    if (e.touches.length === 1) {
      // Single touch - start drag
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY });
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      if (distance && center) {
        setLastTouchDistance(distance);
        setLastTouchCenter(center);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // e.preventDefault(); // Removed to avoid passive event listener error
    
    if (e.touches.length === 1 && isDragging) {
      // Single touch drag
      const touch = e.touches[0];
      const newPanX = touch.clientX - dragStart.x;
      const newPanY = touch.clientY - dragStart.y;
      const constrained = constrainPan(newPanX, newPanY);
      
      
      setPanX(constrained.x);
      setPanY(constrained.y);
    } else if (e.touches.length === 2 && lastTouchDistance && lastTouchCenter) {
      // Two finger pinch zoom
      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      
      if (currentDistance && currentCenter) {
        const scale = currentDistance / lastTouchDistance;
        const delta = scale > 1 ? 0.1 : -0.1;
        const newZoomLevel = Math.max(getMinZoom(), Math.min(baseZoom * 3.33, zoomLevel + delta));
        
        if (newZoomLevel !== zoomLevel && canvasData && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const centerX = currentCenter.x - containerRect.left;
          const centerY = currentCenter.y - containerRect.top;
          
          const containerCenterX = containerRect.width / 2;
          const containerCenterY = containerRect.height / 2;
          
          const canvasX = (centerX - containerCenterX - panX) / (pixelSize * zoomLevel);
          const canvasY = (centerY - containerCenterY - panY) / (pixelSize * zoomLevel);
          
          setZoomLevel(newZoomLevel);
          
          const newPanX = centerX - containerCenterX - (canvasX * pixelSize * newZoomLevel);
          const newPanY = centerY - containerCenterY - (canvasY * pixelSize * newZoomLevel);
          
          const constrained = constrainPan(newPanX, newPanY, newZoomLevel);
          setPanX(constrained.x);
          setPanY(constrained.y);
        }
        
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

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) {
      // Handle pixel placement on click
      if (canvasData && canvasRef.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const x = Math.floor((e.clientX - rect.left) * scaleX / pixelSize);
        const y = Math.floor((e.clientY - rect.top) * scaleY / pixelSize);
        
        if (x >= 0 && x < canvasData.width && y >= 0 && y < canvasData.height) {
          handlePixelClick(x, y);
        }
      }
    }
    setIsDragging(false);
  };

  // Draw canvas
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !canvasData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasData.width * pixelSize;
    canvas.height = canvasData.height * pixelSize;

    // Enable crisp pixel rendering
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pixels first
    canvasData.grid.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color && color !== '') {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      });
    });

    // Draw crisp grid lines
    ctx.strokeStyle = 'rgba(156, 163, 175, 0.4)'; // More subtle gray
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
  }, [canvasData, pixelSize]);



  // Mouse enter/leave handlers for canvas container
  const handleMouseEnter = () => {
    setIsHoveringCanvas(true);
  };

  const handleMouseLeave = () => {
    setIsHoveringCanvas(false);
  };

  // Update cooldown timer
  useEffect(() => {
    if (cooldownRemaining && cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(prev => prev ? prev - 1 : null);
      }, 60000);

      return () => clearTimeout(timer);
    } else if (cooldownRemaining === 0) {
      setCooldownRemaining(null);
      checkCooldown();
    }
  }, [cooldownRemaining, checkCooldown]);

  // Auto-refresh canvas data every 5 seconds
  useEffect(() => {
    fetchCanvasData();
    checkCooldown();

    const interval = setInterval(() => {
      fetchCanvasData();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchCanvasData, checkCooldown]);

  // Redraw canvas when data changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Take weekly snapshot if needed
  const takeWeeklySnapshot = useCallback(async () => {
    if (shouldTakeWeeklySnapshot() && canvasRef.current && canvasData) {
      try {
        const success = await saveWeeklySnapshot(canvasRef.current, canvasData);
        if (success) {
          markWeeklySnapshotTaken();
          // Silent success for weekly snapshot
        }
      } catch (error) {
        console.error('Error taking weekly snapshot:', error);
      }
    }
  }, [canvasData]);

  // Check for weekly snapshot when canvas data changes
  useEffect(() => {
    if (canvasData) {
      takeWeeklySnapshot();
    }
  }, [canvasData, takeWeeklySnapshot]);

  // Initialize canvas when it loads
  useEffect(() => {
    if (canvasData && containerRef.current && !isInitialized) {
      // Canvas is now centered by CSS, just initialize pan to center
      setPanX(0);
      setPanY(0);
      setIsInitialized(true);
    }
  }, [canvasData, isInitialized]);

  // Document-level wheel listener to properly prevent default
  useEffect(() => {
    const handleDocumentWheel = (e: WheelEvent) => {
      if (isHoveringCanvas) {
        e.preventDefault();
        e.stopPropagation();
        
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoomLevel = Math.max(getMinZoom(), Math.min(baseZoom * 3.33, zoomLevel + delta));
        
        if (newZoomLevel !== zoomLevel && canvasData && containerRef.current) {
          // Get mouse position relative to the canvas container
          const containerRect = containerRef.current.getBoundingClientRect();
          const mouseX = e.clientX - containerRect.left;
          const mouseY = e.clientY - containerRect.top;
          
          // Get container center (since canvas is centered with flexbox)
          const containerCenterX = containerRect.width / 2;
          const containerCenterY = containerRect.height / 2;
          
          // Calculate the point on the canvas that the mouse is hovering over
          // Account for the canvas being centered in the container
          const canvasX = (mouseX - containerCenterX - panX) / (pixelSize * zoomLevel);
          const canvasY = (mouseY - containerCenterY - panY) / (pixelSize * zoomLevel);
          
          // Update zoom level
          setZoomLevel(newZoomLevel);
          
          // Adjust pan to keep the same point under the mouse
          const newPanX = mouseX - containerCenterX - (canvasX * pixelSize * newZoomLevel);
          const newPanY = mouseY - containerCenterY - (canvasY * pixelSize * newZoomLevel);
          
          // Apply constraints
          const constrained = constrainPan(newPanX, newPanY, newZoomLevel);
          setPanX(constrained.x);
          setPanY(constrained.y);
        }
      }
    };

    document.addEventListener('wheel', handleDocumentWheel, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', handleDocumentWheel);
    };
  }, [isHoveringCanvas, zoomLevel, panX, panY]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading canvas...</span>
      </div>
    );
  }

  if (!canvasData) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Failed to load canvas</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="text-center mb-6">
        {/* Title */}
        <div className="flex items-center justify-center space-x-2 mb-3">
          <Square className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900">Community Pixel Canvas</h2>
        </div>
        
        {/* Stats - Second Line */}
        {stats && (
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 flex-wrap gap-2">
            <div className="flex items-center space-x-1">
              <Square className="w-4 h-4" />
              <span>{width * height} pixels</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{stats.uniqueUsers} users</span>
            </div>
          </div>
        )}
      </div>


      {/* Cooldown Status - DISABLED FOR TESTING */}
      {false && isAuthenticated && cooldownRemaining && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Cooldown: {cooldownRemaining} minute(s) remaining</span>
          </div>
        </div>
      )}

              <div className="flex flex-col xl:flex-row gap-6">
          {/* Canvas */}
          <div className="flex-1 min-w-0">
          {/* Zoom Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomOut}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 min-w-[60px] text-center">
                {Math.round((zoomLevel / baseZoom) * 100)}%
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
            
            {/* Cooldown Status */}
            {isAuthenticated && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>
                  {countdownTimer ? (
                    `${countdownTimer}s cooldown`
                  ) : 'Ready to paint'}
                </span>
              </div>
            )}
          </div>

          {/* Canvas Container */}
          <div 
            ref={containerRef}
            className="bg-gray-100 p-4 rounded-lg overflow-hidden flex items-center justify-center h-[400px] sm:h-[700px]"
            style={{ 
              width: '100%', 
              position: 'relative',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none', // Prevent default touch behaviors
              userSelect: 'none', // Prevent text selection
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div 
              className="inline-block origin-center"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                transformOrigin: 'center center'
              }}
            >
              <canvas
                ref={canvasRef}
                className={`border border-gray-300 ${isEyedropperMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
                style={{
                  imageRendering: '-moz-crisp-edges',
                  imageRendering: '-webkit-crisp-edges',
                  imageRendering: 'crisp-edges',
                  imageRendering: 'pixelated',
                  maxWidth: '100%',
                  height: 'auto',
                  cursor: isEyedropperMode ? 'crosshair' : 'pointer',
                  touchAction: 'none', // Prevent default touch behaviors
                  userSelect: 'none', // Prevent text selection
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>
          </div>
        </div>


        {/* Color Picker */}
        <div className="xl:w-80">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <Palette className="w-5 h-5 mr-2 text-blue-500" />
              Color Palette
            </h3>
            
            {/* Color Grid */}
            <div className="grid grid-cols-6 gap-3 mb-6">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-10 h-10 rounded-xl border-2 transition-all duration-200 hover:scale-110 hover:shadow-md ${
                    selectedColor === color 
                      ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setSelectedColor(color);
                    setTempColorCode(color);
                  }}
                  title={color}
                />
              ))}
            </div>
            
            {/* Color Picker */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Color Picker
                </label>
                <div className="relative">
                  <button
                    data-dropper-button
                    onClick={handleDropperClick}
                    className={`px-3 py-2 rounded-xl border-2 transition-colors flex items-center justify-center ${
                      isEyedropperMode 
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                    title={isEyedropperMode ? "Click to deactivate eyedropper" : "Pick color from anywhere on screen"}
                  >
                    <Pipette className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Clickable color bar that opens React Colorful */}
              <div
                onClick={handleColorBarClick}
                className="w-full h-12 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors flex items-center justify-center mb-4"
                style={{ backgroundColor: selectedColor }}
                title="Click to open advanced color picker"
              >
                <span className="text-white font-semibold text-sm drop-shadow-lg">
                  {selectedColor}
                </span>
              </div>
              
              {showColorPicker && (
                <div className="mb-4 p-4 bg-white rounded-xl border-2 border-gray-200">
                  <HexColorPicker
                    color={selectedColor}
                    onChange={handleColorChange}
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {isEyedropperMode && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">
                    🔍 Eyedropper Active
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Click anywhere on your screen to pick colors. Press ESC to cancel.
                  </p>
                </div>
              )}
              
            </div>
            
            {/* Selected Color Display */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-4">
                <div
                  className="w-16 h-16 rounded-xl border-2 border-gray-300 shadow-sm"
                  style={{ backgroundColor: selectedColor }}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Selected Color</p>
                  {isEditingColor ? (
                    <input
                      type="text"
                      value={tempColorCode}
                      onChange={handleColorCodeChange}
                      onBlur={handleColorCodeBlur}
                      onKeyDown={handleColorCodeKeyPress}
                      className="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none w-full"
                      placeholder="000000"
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="text-xs text-gray-600 font-mono bg-white px-2 py-1 rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={handleColorCodeEdit}
                      title="Click to edit color code"
                    >
                      {selectedColor}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Hint Section */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Hints:</p>
                              <ul className="space-y-1">
                  <li>• The cooldown to paint a new pixel is<br /><strong>30 seconds.</strong></li>
                  <li>• Single click on any pixel to place your color.</li>
                  <li>• Click and drag to move the camera around.</li>
                  <li className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 mt-2">
                    <strong>💬 Use the Live Chat below to cooperate with other artists and coordinate your pixel art!</strong>
                  </li>
                </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}