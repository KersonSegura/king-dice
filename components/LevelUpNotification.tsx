'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface LevelUpNotificationProps {
  isVisible: boolean;
  level: number;
  onClose: () => void;
}

export default function LevelUpNotification({ isVisible, level, onClose }: LevelUpNotificationProps) {
  const t = useTranslations('levelUp');
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
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex flex-col items-center ${
          isAnimating 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-90'
        }`}
      >
        {/* Level Up Image - display at natural size, max to fit viewport */}
        <div className="relative flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/LevelUp/Level${level}.png`}
            alt={t('levelAchieved', { level })}
            className="drop-shadow-2xl max-w-[90vw] max-h-[70vh] w-auto h-auto object-contain"
            style={{ display: 'block' }}
          />
          
          {/* Close Button - explicit circle via fixed size + borderRadius 50% */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close level up notification"
            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 hover:bg-red-600 text-white text-xl font-bold transition-colors duration-200 shadow-lg flex items-center justify-center p-0 border-0"
            style={{
              width: 32,
              height: 32,
              minWidth: 32,
              minHeight: 32,
              borderRadius: '50%',
              overflow: 'hidden',
            }}
          >
            ×
          </button>
        </div>
        
        {/* Celebration Text */}
        <div className="text-center mt-4 px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
            {t('levelAchieved', { level })}
          </h2>
          <p className="text-base sm:text-lg text-yellow-200 drop-shadow-md mt-2">
            {t('newItemsUnlocked')}
          </p>
        </div>
      </div>
    </div>
  );
}
