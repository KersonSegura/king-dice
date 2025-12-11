'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

// Amazon Associates disclosure - required by Amazon
// Updated to clarify that prices are the same for consumers
const AMAZON_DISCLOSURE = "As Amazon Associates, we earn from qualifying purchases. The prices shown are the same for you - there is no additional cost when purchasing through our links.";

interface ShopItem {
  id?: number;
  title: string;
  imageUrl?: string;
  link?: string;
  order?: number;
  uniqueKey?: string;
}

interface Game {
  id: number;
  nameEn?: string;
  shopItems?: ShopItem[];
}

export default function ShopPage() {
  const [shopItems, setShopItems] = useState<(ShopItem & { uniqueKey?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllShopItems() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all games with their shop items
        // We'll need to fetch multiple pages since the API paginates
        const allGames: Game[] = [];
        let page = 1;
        const limit = 100; // Fetch larger batches
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(`/api/boardgames?page=${page}&limit=${limit}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch games');
          }

          const data = await response.json();
          
          if (data.games && data.games.length > 0) {
            allGames.push(...data.games);
            // If we got fewer results than the limit, we've reached the end
            if (data.games.length < limit) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        }

        // Extract all shop items from all games
        const allShopItems: (ShopItem & { uniqueKey?: string })[] = [];
        allGames.forEach((game) => {
          if (game.shopItems && game.shopItems.length > 0) {
            // Add shop items with their order and game context
            game.shopItems.forEach((item, itemIdx) => {
              allShopItems.push({
                ...item,
                // Preserve order if it exists, otherwise use 999
                order: item.order ?? 999,
                // Create unique key for React
                uniqueKey: item.id ? `shop-${item.id}` : `shop-${game.id}-${itemIdx}`
              });
            });
          }
        });

        // Sort by order (ascending)
        allShopItems.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        setShopItems(allShopItems);
      } catch (err) {
        console.error('Error fetching shop items:', err);
        setError('Failed to load shop items. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchAllShopItems();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <img
              src="/ShopIcon.svg"
              alt="Shop Icon"
              className="w-8 h-8"
              style={{
                filter: 'brightness(0) saturate(100%) invert(67%) sepia(93%) saturate(1352%) hue-rotate(1deg) brightness(102%) contrast(101%)'
              }}
            />
            <h1 className="text-3xl font-bold text-gray-900">Shop</h1>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <p className="mt-4 text-gray-600">Loading shop items...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg max-w-md mx-auto">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Shop Cards Grid */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
              {shopItems.map((item) => (
                <div key={item.uniqueKey || item.id || `shop-item-${item.title}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative w-full aspect-square bg-gray-200 overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      item.imageUrl.startsWith('https://m.media-amazon.com') ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 400px"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src.startsWith('data:image/svg+xml')) return;
                            const svgPlaceholder = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#e5e7e9"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${item.title}</text></svg>`;
                            target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPlaceholder)}`;
                          }}
                        />
                      ) : (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="max-w-full max-h-full object-contain"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src.startsWith('data:image/svg+xml')) return;
                            const svgPlaceholder = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#e5e7e9"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${item.title}</text></svg>`;
                            target.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPlaceholder)}`;
                          }}
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <div className="text-center p-4">
                          <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2">
                            <rect width="200" height="200" fill="#e5e7e9" rx="8"/>
                            <text x="50%" y="50%" fontFamily="Arial, sans-serif" fontSize="14" fill="#9ca3af" textAnchor="middle" dominantBaseline="middle">
                              {item.title}
                            </text>
                          </svg>
                          <p className="text-xs text-gray-500">Image coming soon</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{item.title}</h3>
                    <a
                      href={item.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="w-full inline-flex items-center justify-center bg-[#fbae17] hover:bg-[#e09915] text-white font-medium py-1.5 px-3 rounded-lg transition-colors space-x-1.5 text-xs"
                    >
                      <span>Buy on Amazon</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {shopItems.length === 0 && (
              <div className="text-center py-12">
                <img
                  src="/ShopIcon.svg"
                  alt="Shop Icon"
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                />
                <p className="text-gray-600">No shop items available at the moment.</p>
              </div>
            )}
          </>
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

