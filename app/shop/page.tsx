'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ExternalLink, Star } from 'lucide-react';
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
    
    // Price filter
    if (priceFilter !== 'all') {
      if (!game.price) return false;
      
      const price = parseFloat(game.price.replace(/[^0-9.]/g, ''));
      
      switch (priceFilter) {
        case 'under5':
          return price < 5;
        case 'under10':
          return price < 10;
        case 'under25':
          return price < 25;
        case 'under50':
          return price < 50;
        case 'discounted':
          return !!(game.originalPrice && game.originalPrice !== game.price);
        default:
          return true;
      }
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

          {/* Price Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Price & Deals</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPriceFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  priceFilter === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                All Prices
              </button>
              <button
                onClick={() => setPriceFilter('discounted')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  priceFilter === 'discounted'
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                On Sale
              </button>
              <button
                onClick={() => setPriceFilter('under5')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  priceFilter === 'under5'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Under $5
              </button>
              <button
                onClick={() => setPriceFilter('under10')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  priceFilter === 'under10'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Under $10
              </button>
              <button
                onClick={() => setPriceFilter('under25')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  priceFilter === 'under25'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Under $25
              </button>
              <button
                onClick={() => setPriceFilter('under50')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  priceFilter === 'under50'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Under $50
              </button>
            </div>
          </div>
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
                {game.imageUrl.startsWith('https://') ? (
                  // External Amazon images - use regular img tag with CORS handling
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = '/placeholder-game.jpg';
                      console.error('Failed to load image:', game.imageUrl);
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', game.name);
                    }}
                  />
                ) : (
                  // Local images - use Next.js Image component
                  <Image
                    src={game.imageUrl}
                    alt={game.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = '/placeholder-game.jpg';
                    }}
                  />
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

                {/* Rating */}
                {game.rating && (
                  <div className="flex items-center space-x-1 mb-3">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium text-gray-700">{game.rating}</span>
                  </div>
                )}

                {/* Price */}
                {game.price && (
                  <div className="mb-3">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-gray-900">{game.price}</span>
                      {game.originalPrice && game.originalPrice !== game.price && (
                        <span className="text-sm text-red-600 font-medium line-through">{game.originalPrice}</span>
                      )}
                    </div>
                    {game.originalPrice && game.originalPrice !== game.price && (
                      <span className="text-xs text-green-600 font-medium">
                        Save {calculateDiscount(game.originalPrice, game.price)}
                      </span>
                    )}
                  </div>
                )}

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

