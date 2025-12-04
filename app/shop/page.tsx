'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import { boardGames, getGamesByCategory, getCategories, type BoardGame } from '@/data/board-games';

// Amazon Associates disclosure - required by Amazon
// Updated to clarify that prices are the same for consumers
const AMAZON_DISCLOSURE = "As Amazon Associates, we earn from qualifying purchases. The prices shown are the same for you - there is no additional cost when purchasing through our links.";

// Helper function to calculate discount percentage
function calculateDiscount(originalPrice: string, currentPrice: string): string {
  const original = parseFloat(originalPrice.replace(/[^0-9.]/g, ''));
  const current = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
  if (original <= current) return '';
  const discount = ((original - current) / original) * 100;
  return `${discount.toFixed(0)}%`;
}

type PriceFilter = 'all' | 'under5' | 'under10' | 'under25' | 'under50' | 'discounted';

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  
  const categories = getCategories();
  
  // Filter games by category and price
  const filteredGames = boardGames.filter((game) => {
    // Category filter
    if (selectedCategory && game.category !== selectedCategory) {
      return false;
    }
    
    // Price filter - Note: We can't filter by price without showing prices
    // which violates Amazon's terms. So we'll disable price filters for now.
    // Once PA-API is available, we can re-enable this functionality.
    // For now, price filters are disabled to comply with Amazon's terms.
    if (priceFilter !== 'all') {
      // Price filtering disabled to comply with Amazon Associates terms
      // Users can still filter by category
      return false; // Disable all price filters
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-900" />
            <h1 className="text-3xl font-bold text-gray-900">Shop</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Category</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-primary-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Price Filter - Disabled to comply with Amazon Associates terms */}
          {/* Price filters require showing prices, which violates Amazon's terms without PA-API */}
          {/* Once PA-API is available, we can re-enable price filtering */}
          {/* 
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Price & Deals</h3>
            <div className="flex flex-wrap gap-2">
              <button>...</button>
            </div>
          </div>
          */}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Game Image */}
              <div className="relative w-full h-64 bg-gray-200 overflow-hidden">
                {game.imageUrl && game.imageUrl.startsWith('https://') ? (
                  // External Amazon images - use regular img tag with CORS handling
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback to inline SVG placeholder if image fails to load
                      const target = e.currentTarget as HTMLImageElement;
                      const svgPlaceholder = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#e5e7e9"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${game.name}</text></svg>`;
                      target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPlaceholder)}`;
                      console.error('Failed to load image:', game.imageUrl);
                    }}
                  />
                ) : (
                  // Local images or missing images - show placeholder directly
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <div className="text-center p-4">
                      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2">
                        <rect width="200" height="200" fill="#e5e7e9" rx="8"/>
                        <text x="50%" y="50%" fontFamily="Arial, sans-serif" fontSize="14" fill="#9ca3af" textAnchor="middle" dominantBaseline="middle">
                          {game.name}
                        </text>
                      </svg>
                      <p className="text-xs text-gray-500">Image coming soon</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Game Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{game.name}</h3>

                {/* Game Details */}
                <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500">
                  {game.players && (
                    <span className="bg-gray-100 px-2 py-1 rounded">{game.players} players</span>
                  )}
                  {game.playTime && (
                    <span className="bg-gray-100 px-2 py-1 rounded">{game.playTime}</span>
                  )}
                </div>

                {/* Amazon Link Button - Must open in new tab per Amazon guidelines */}
                <a
                  href={game.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Buy on Amazon</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No games found in this category.</p>
          </div>
        )}

        {/* Amazon Associates Disclosure - Required (at bottom but visible) */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  Amazon Associates Disclosure
                </h3>
                <p className="text-sm text-blue-700">
                  {AMAZON_DISCLOSURE}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

