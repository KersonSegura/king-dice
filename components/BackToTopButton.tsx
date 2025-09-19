'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { useChatState } from '@/contexts/ChatStateContext';

export default function BackToTopButton() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { isChatOpen, selectedChat } = useChatState();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollTop(scrollTop > 300);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
      className={`fixed bottom-4 bg-primary-500 hover:bg-primary-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-40 hover:scale-110 ${
        !isChatOpen ? 'right-20' : // Next to chat button when closed
        isChatOpen && !selectedChat ? 'right-[22rem]' : // Previous position when chat menu open
        'right-[26rem]' // Further left when specific chat window open
      }`}
      aria-label="Back to top"
    >
      <ArrowUp className="w-6 h-6" />
    </button>
  );
}
