'use client';

import { useState, useRef, useEffect } from 'react';

interface ModernTooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  bgColor?: string;
  textColor?: string;
}

export default function ModernTooltip({ 
  children, 
  content, 
  position = 'top',
  className = '',
  bgColor = 'bg-gray-900',
  textColor = 'text-white'
}: ModernTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      // Find the actual button element inside the wrapper
      const buttonElement = triggerRef.current.querySelector('button') || triggerRef.current;
      const rect = buttonElement.getBoundingClientRect();
      const tooltipOffset = 8;
      
      console.log('Button element positioning:', {
        isButton: buttonElement.tagName === 'BUTTON',
        rect,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      });
      
      switch (position) {
        case 'top':
          setTooltipPosition({
            top: rect.top - tooltipOffset,
            left: rect.left + rect.width / 2
          });
          break;
        case 'bottom':
          setTooltipPosition({
            top: rect.bottom + tooltipOffset,
            left: rect.left + rect.width / 2
          });
          break;
        case 'left':
          setTooltipPosition({
            top: rect.top + rect.height / 2,
            left: rect.left - tooltipOffset
          });
          break;
        case 'right':
          setTooltipPosition({
            top: rect.top + rect.height / 2,
            left: rect.right + tooltipOffset
          });
          break;
      }
    }
  }, [isVisible, position]);

  const showTooltip = () => {
    setIsVisible(true); // Show immediately
  };

  const hideTooltip = () => {
    setIsVisible(false); // Hide immediately
  };

  // Get the actual color value for the arrow
  const getArrowColor = () => {
    if (bgColor.includes('yellow') || bgColor.includes('#fbae17')) return '#fbae17';
    return '#111827'; // gray-900
  };

  const arrowColor = getArrowColor();

  return (
    <>
      <div 
        ref={triggerRef}
        className={`inline-block ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>
      
      {/* Fixed positioned tooltip that can escape container bounds */}
      {isVisible && (
        <div
          className={`fixed z-[1000] px-3 py-2 text-sm font-medium ${textColor} ${bgColor} rounded-lg shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-150 ease-out`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: position === 'top' 
              ? 'translateX(-50%) translateY(-100%)' 
              : position === 'bottom'
                ? 'translateX(-50%)'
                : position === 'left' 
                  ? 'translateX(-100%) translateY(-50%)'
                  : 'translateY(-50%)',
            opacity: isVisible ? 1 : 0
          }}
          role="tooltip"
        >
          {content}
          
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${
              position === 'top' ? 'top-full left-1/2 transform -translate-x-1/2' :
              position === 'bottom' ? 'bottom-full left-1/2 transform -translate-x-1/2' :
              position === 'left' ? 'left-full top-1/2 transform -translate-y-1/2' :
              'right-full top-1/2 transform -translate-y-1/2'
            }`}
            style={{
              ...(position === 'top' && { borderTopColor: arrowColor }),
              ...(position === 'bottom' && { borderBottomColor: arrowColor }),
              ...(position === 'left' && { borderLeftColor: arrowColor }),
              ...(position === 'right' && { borderRightColor: arrowColor })
            }}
          />
        </div>
      )}
    </>
  );
}
