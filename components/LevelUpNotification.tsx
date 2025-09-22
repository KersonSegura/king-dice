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
    <div 
      className="fixed inset-0 z-[9999]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Level Up Image Container */}
      <div 
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out ${
          isAnimating 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-90'
        }`}
      >
        {/* Level Up Image */}
        <div className="relative">
          <Image
            src={`/LevelUp/Level${level}.png`}
            alt={`Level ${level} Achieved!`}
            width={400}
            height={400}
            className="drop-shadow-2xl w-80 h-80 sm:w-96 sm:h-96 md:w-[400px] md:h-[400px]"
            priority
          />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-base sm:text-lg font-bold transition-colors duration-200 shadow-lg"
            aria-label="Close level up notification"
          >
            ×
          </button>
        </div>
        
        {/* Celebration Text */}
        <div className="text-center mt-4 px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
            Level {level} Achieved!
          </h2>
          <p className="text-base sm:text-lg text-yellow-200 drop-shadow-md mt-2">
            New items unlocked!
          </p>
        </div>
      </div>
    </div>
  );
}
