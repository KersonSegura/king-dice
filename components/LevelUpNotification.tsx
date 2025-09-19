'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LevelUpNotificationProps {
  isVisible: boolean;
  level: number;
  onClose: () => void;
}

export default function LevelUpNotification({ isVisible, level, onClose }: LevelUpNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Start animation after a brief delay
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Level Up Image Container */}
      <div 
        className={`relative transform transition-all duration-700 ease-out ${
          isAnimating 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-full opacity-0 scale-95'
        }`}
      >
        {/* Level Up Image */}
        <div className="relative">
          <Image
            src={`/LevelUp/Level${level}.png`}
            alt={`Level ${level} Achieved!`}
            width={400}
            height={400}
            className="drop-shadow-2xl"
            priority
          />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-lg font-bold transition-colors duration-200 shadow-lg"
            aria-label="Close level up notification"
          >
            ×
          </button>
        </div>
        
        {/* Celebration Text */}
        <div className="text-center mt-4">
          <h2 className="text-3xl font-bold text-white drop-shadow-lg">
            Level {level} Achieved!
          </h2>
          <p className="text-lg text-yellow-200 drop-shadow-md mt-2">
            New items unlocked!
          </p>
        </div>
      </div>
    </div>
  );
}
