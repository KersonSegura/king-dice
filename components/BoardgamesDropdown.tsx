'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

export default function BoardgamesDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Add a small delay before closing to prevent flickering
    const timeout = setTimeout(() => {
      setIsOpen(false);
    }, 150);
    setHoverTimeout(timeout);
  };

  const boardgamePages = [
    {
      name: 'All Games',
      href: '/all-games',
      icon: '/AllIcon.svg',
      description: 'Browse our board game collection'
    },
    {
      name: 'Hot Games',
      href: '/hot-games',
      icon: '/FireIcon.svg',
      description: 'Currently trending and popular games'
    },
    {
      name: 'Top Ranked',
      href: '/top-ranked',
      icon: '/TrophyIcon.svg',
      description: 'Highest rated games by the community'
    }
  ];

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Boardgames Button */}
      <button
        className="flex items-center space-x-2 text-dark-700 hover:text-primary-500 transition-all duration-200 font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
      >
        <Image
          src="/BoardGamesIcon.svg"
          alt="Board Games"
          width={24}
          height={24}
          className="w-6 h-6"
        />
        <span>Board Games</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
          {boardgamePages.map((page, index) => (
            <Link
              key={page.name}
              href={page.href}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center justify-center">
                {page.icon ? (
                  <Image
                    src={page.icon}
                    alt={page.name}
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                  {page.name}
                </p>
                <p className="text-xs text-gray-500 group-hover:text-gray-600">
                  {page.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
