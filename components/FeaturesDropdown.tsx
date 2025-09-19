'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FeaturesDropdown() {
  const { isAuthenticated } = useAuth();
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

  const features = [
    ...(isAuthenticated ? [{
      name: 'My Dice',
      href: '/my-dice',
      icon: '/MyDiceIcon.svg',
      color: '#fbae17',
      hoverColor: '#e0990f'
    }] : []),
    {
      name: 'Catan Maps',
      href: '/catan-map-generator',
      icon: '/CatanIcon.svg',
      color: '#fbae17',
      hoverColor: '#e0990f'
    },
    {
      name: 'Pixel Canvas',
      href: '/pixel-canvas',
      icon: null, // Custom icon
      color: '#fbae17',
      hoverColor: '#e0990f'
    },
    {
      name: 'Boardle',
      href: '/boardle',
      icon: '/BoardleIcon.svg',
      color: '#fbae17',
      hoverColor: '#e0990f'
    },
    {
      name: 'Digital Corner',
      href: '/digital-corner',
      icon: '/PCIcon.svg',
      color: '#fbae17',
      hoverColor: '#e0990f'
    }
  ];

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Features Button */}
      <button
        className="hidden md:flex items-center space-x-2 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium hover:opacity-90"
        style={{ backgroundColor: '#fbae17' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0990f'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fbae17'}
      >
        <Star className="w-5 h-5" fill="white" />
        <span>Features</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
          {features.map((feature, index) => (
            <Link
              key={feature.name}
              href={feature.href}
              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: feature.color }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = feature.hoverColor}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = feature.color}
              >
                {feature.icon ? (
                  <Image
                    src={feature.icon}
                    alt={feature.name}
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                ) : (
                  <div className="w-4 h-4 bg-white rounded-sm"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                  {feature.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
