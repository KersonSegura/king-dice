'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Force re-render when chat state changes
  const [renderKey, setRenderKey] = useState(0);

  // Robust scroll detection
  useEffect(() => {
    const toggleVisibility = () => {
      if (typeof window === 'undefined') return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setIsVisible(scrollTop > 300);
    };

    // Only run on client side
    if (typeof window === 'undefined') return;

    // Initial check immediately
    toggleVisibility();
    
    // Multiple checks to ensure it works
    const timeoutId1 = setTimeout(toggleVisibility, 50);
    const timeoutId2 = setTimeout(toggleVisibility, 200);
    const timeoutId3 = setTimeout(toggleVisibility, 500);
    
    // Add scroll listener
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
    };
  }, []);

  // Listen for chat state changes via custom event
  useEffect(() => {
    const handleChatStateChange = (event: CustomEvent) => {
      const { isChatOpen: newIsChatOpen } = event.detail;
      setIsChatOpen(newIsChatOpen);
      setRenderKey(prev => prev + 1);
    };

    // Listen for custom event from FloatingChat
    window.addEventListener('chatStateChanged', handleChatStateChange as EventListener);
    
    return () => {
      window.removeEventListener('chatStateChanged', handleChatStateChange as EventListener);
    };
  }, []);

  // Fast smooth scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  const buttonClasses = `fixed z-[35] text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
    isChatOpen 
      ? 'bottom-4 right-[26rem]' // Left of the chat (chat is 24rem wide + 2rem margin)
      : 'bottom-20 right-4 sm:bottom-4 sm:right-20' // Mobile: above chat, Desktop: left of chat
  }`;

  return (
    <button
      key={renderKey}
      onClick={scrollToTop}
      className={buttonClasses}
      style={{ backgroundColor: '#fbae17' }}
      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#e09915'}
      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#fbae17'}
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}