'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useChatState } from '@/contexts/ChatStateContext';

export default function BackToTopButton() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { isChatOpen } = useChatState();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollTop(scrollTop > 300);
    };

    // Initial check
    handleScroll();
    
    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Additional checks for dynamic content loading
    const recheckScroll = () => handleScroll();
    
    // Check after a short delay for dynamic content
    const timeouts = [
      setTimeout(recheckScroll, 100),
      setTimeout(recheckScroll, 500),
      setTimeout(recheckScroll, 1000),
      setTimeout(recheckScroll, 2000)
    ];
    
    // Also listen for resize events (content changes)
    window.addEventListener('resize', recheckScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', recheckScroll);
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!showScrollTop) return null;

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-4 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-40 hover:scale-110 ${
        isChatOpen ? 'right-[26rem]' : 'right-20'
      }`}
      style={{ backgroundColor: '#fbae17' }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#e09915'}
      onMouseLeave={(e) => e.target.style.backgroundColor = '#fbae17'}
      aria-label="Back to top"
    >
      <ArrowUp className="w-6 h-6" />
    </button>
  );
}
