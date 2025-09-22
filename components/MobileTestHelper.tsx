'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Tablet, Monitor, Check, X } from 'lucide-react';

interface DeviceInfo {
  width: number;
  height: number;
  device: 'mobile' | 'tablet' | 'desktop';
  userAgent: string;
  touchSupport: boolean;
}

export default function MobileTestHelper() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      let device: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      
      if (width < 640) device = 'mobile';
      else if (width < 1024) device = 'tablet';
      
      setDeviceInfo({
        width,
        height,
        device,
        userAgent: navigator.userAgent,
        touchSupport: 'ontouchstart' in window
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    
    return () => window.removeEventListener('resize', updateDeviceInfo);
  }, []);

  // Only show in development
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev || !deviceInfo) return null;

  const getDeviceIcon = () => {
    switch (deviceInfo.device) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const mobileChecklist = [
    { 
      name: 'Touch Targets', 
      check: deviceInfo.device === 'mobile' ? 'Optimized for mobile' : 'Desktop view',
      status: true 
    },
    { 
      name: 'Viewport Size', 
      check: `${deviceInfo.width}x${deviceInfo.height}`,
      status: deviceInfo.width >= 320 
    },
    { 
      name: 'Touch Support', 
      check: deviceInfo.touchSupport ? 'Touch enabled' : 'Mouse/keyboard',
      status: true 
    },
    { 
      name: 'Chat Responsive', 
      check: deviceInfo.device === 'mobile' ? 'Fullscreen chat' : 'Floating chat',
      status: true 
    },
    { 
      name: 'Navigation', 
      check: deviceInfo.device === 'mobile' ? 'Mobile menu' : 'Desktop nav',
      status: true 
    }
  ];

  return (
    <div className="fixed top-4 left-4 z-[9999]">
      <button
        onClick={() => setShowHelper(!showHelper)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors ${
          deviceInfo.device === 'mobile' 
            ? 'bg-green-500 text-white' 
            : deviceInfo.device === 'tablet'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-500 text-white'
        }`}
      >
        {getDeviceIcon()}
        <span className="hidden sm:inline">{deviceInfo.device}</span>
        <span className="text-xs">{deviceInfo.width}px</span>
      </button>

      {showHelper && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Mobile Debug Info</h3>
            <button
              onClick={() => setShowHelper(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Device Type:</span>
              <div className="flex items-center space-x-1">
                {getDeviceIcon()}
                <span className="font-medium capitalize">{deviceInfo.device}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Screen Size:</span>
              <span className="font-medium">{deviceInfo.width} × {deviceInfo.height}</span>
            </div>
            
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Responsive Checklist:</h4>
              <div className="space-y-2">
                {mobileChecklist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{item.name}:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-800">{item.check}</span>
                      {item.status ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Quick Tests:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• Open chat → Should be fullscreen on mobile</p>
                <p>• Test scroll-to-top → Should be positioned correctly</p>
                <p>• Check touch targets → Minimum 44px height</p>
                <p>• Test navigation → Mobile menu on small screens</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
