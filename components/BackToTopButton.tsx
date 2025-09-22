'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useChatState } from '@/contexts/ChatStateContext';

export default function BackToTopButton() {
  const [showScrollTop, setShowScrollTop] = useState(false); // Start hidden, show when scrolled
  const { isChatOpen } = useChatState();

  useEffect(() => {
    const getScrollPosition = () => {
      // Check all possible scroll sources
      const windowScroll = window.pageYOffset;
      const documentScroll = document.documentElement.scrollTop;
      const bodyScroll = document.body.scrollTop;
      const scrollingElement = document.scrollingElement?.scrollTop || 0;
      
      // Return the maximum value found
      return Math.max(windowScroll, documentScroll, bodyScroll, scrollingElement);
    };

    const handleScroll = () => {
      const scrollTop = getScrollPosition();
      const shouldShow = scrollTop > 300;
      
      console.log('Scroll detection:', {
        window: window.pageYOffset,
        documentElement: document.documentElement.scrollTop,
        body: document.body.scrollTop,
        scrollingElement: document.scrollingElement?.scrollTop,
        maxScroll: scrollTop,
        shouldShow,
        threshold: '> 300px'
      });
      
      // Force state update even if it seems the same
      setShowScrollTop(shouldShow);
    };

    // Initial check
    handleScroll();
    
    // Throttled scroll handler for better performance
    let scrollTimer: NodeJS.Timeout | null = null;
    const throttledScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(handleScroll, 10); // Small delay to throttle
    };

    // Listen to scroll events on multiple elements
    window.addEventListener('scroll', throttledScroll, { passive: true });
    document.addEventListener('scroll', throttledScroll, { passive: true });
    document.body.addEventListener('scroll', throttledScroll, { passive: true });
    
    // Recheck after content loads
    const recheckAfterLoad = () => {
      console.log('Rechecking scroll after content load...');
      handleScroll();
    };
    
    setTimeout(recheckAfterLoad, 500);
    setTimeout(recheckAfterLoad, 1500);
    setTimeout(recheckAfterLoad, 3000);
    
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      document.removeEventListener('scroll', throttledScroll);
      document.body.removeEventListener('scroll', throttledScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, []);

  const scrollToTop = () => {
    console.log('Scroll to top clicked!');
    
    // Get scroll position from the correct element (body vs documentElement)
    const startPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    const startTime = performance.now();
    const duration = 800; // 800ms for smooth but fast scroll
    
    console.log('Starting scroll from position:', startPosition);
    
    // Debug: Check if we're actually scrolled
    if (startPosition === 0) {
      console.warn('WARNING: Trying to scroll from position 0! User might not be scrolled down.');
      console.log('Current page state:', {
        windowPageYOffset: window.pageYOffset,
        documentElementScrollTop: document.documentElement.scrollTop,
        bodyScrollTop: document.body.scrollTop,
        documentScrollingElement: document.scrollingElement?.scrollTop
      });
      return; // Don't scroll if already at top
    }
    
    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const ease = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      const currentPosition = startPosition * (1 - ease);
      
      window.scrollTo(0, currentPosition);
      document.body.scrollTop = currentPosition;
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      } else {
        console.log('Scroll animation completed');
      }
    };
    
    requestAnimationFrame(animateScroll);
  };

  if (!showScrollTop) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Button clicked, calling scrollToTop');
        scrollToTop();
      }}
      className={`fixed text-white p-3 sm:p-4 rounded-full shadow-lg transition-all duration-300 z-50 hover:scale-110 ${
        isChatOpen 
          ? 'bottom-20 sm:bottom-4 right-4 sm:right-[26rem]' 
          : 'bottom-20 sm:bottom-4 right-4 sm:right-[5.5rem]'
      }`}
      style={{ backgroundColor: '#fbae17' }}
      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e09915'}
      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#fbae17'}
      aria-label="Back to top"
      type="button"
    >
      <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6" />
    </button>
  );
}
