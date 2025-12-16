'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ExternalLink, Search } from 'lucide-react';

// Amazon Associates disclosure - required by Amazon
// Updated to clarify that prices are the same for consumers
const AMAZON_DISCLOSURE = "As Amazon Associates, we earn from qualifying purchases. The prices shown are the same for you - there is no additional cost when purchasing through our links.";

interface Category {
  id: number;
  nameEn: string;
  nameEs?: string;
}

interface ShopItem {
  id?: number;
  title: string;
  imageUrl?: string;
  link?: string;
  order?: number;
  uniqueKey?: string;
  game?: {
    id: number;
    nameEn?: string;
    nameEs?: string;
  };
  categories?: Category[];
}


export default function ShopPage() {
  const [allShopItems, setAllShopItems] = useState<ShopItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAllShopItems() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all shop items directly from the dedicated API endpoint
        const response = await fetch('/api/shop-items');
        
        if (!response.ok) {
          throw new Error('Failed to fetch shop items');
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        // Transform shop items with unique keys
        const shopItemsWithKeys: ShopItem[] = (data.shopItems || []).map((item: ShopItem) => ({
          ...item,
          uniqueKey: item.id ? `shop-${item.id}` : `shop-${item.title}`
        }));

        setAllShopItems(shopItemsWithKeys);
        setCategories(data.categories || []);
        
        // Debug logging
        console.log('[SHOP PAGE] Loaded', shopItemsWithKeys.length, 'shop items');
        console.log('[SHOP PAGE] Loaded', (data.categories || []).length, 'categories:', (data.categories || []).map((c: Category) => c.nameEn));
      } catch (err) {
        console.error('Error fetching shop items:', err);
        setError('Failed to load shop items. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchAllShopItems();
  }, []);

  // Filter shop items based on search and category
  const filteredShopItems = allShopItems.filter((item) => {
    // Search filter - search in title and game name
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const matchesTitle = item.title?.toLowerCase().includes(searchLower);
      const matchesGameName = item.game?.nameEn?.toLowerCase().includes(searchLower) || 
                             item.game?.nameEs?.toLowerCase().includes(searchLower);
      
      if (!matchesTitle && !matchesGameName) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== null) {
      const hasCategory = item.categories?.some((cat) => cat.id === selectedCategory);
      if (!hasCategory) {
        return false;
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

        {/* Search Bar and Filters */}
        {!loading && !error && (
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search shop items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Category Filters */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Filter by Category</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-[#ffb905] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  All Categories
                </button>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-[#ffb905] text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {category.nameEn}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic">No categories available</p>
                )}
              </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-600">
              Showing {filteredShopItems.length} of {allShopItems.length} items
            </div>
          </div>
        )}

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
              {filteredShopItems.map((item) => (
                <div key={item.uniqueKey || item.id || `shop-item-${item.title}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                  <div className="relative w-full aspect-square bg-white overflow-hidden flex items-center justify-center">
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
                      <div className="w-full h-full flex items-center justify-center bg-white">
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
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">{item.title}</h3>
                    <a
                      href={item.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="w-full inline-flex items-center justify-center bg-[#fbae17] hover:bg-[#e09915] text-white font-medium py-1.5 px-3 rounded-lg transition-colors space-x-1.5 text-xs mt-auto"
                    >
                      <span>Buy on Amazon</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredShopItems.length === 0 && allShopItems.length > 0 && (
              <div className="text-center py-12">
                <img
                  src="/ShopIcon.svg"
                  alt="Shop Icon"
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                />
                <p className="text-gray-600">No shop items match your search criteria.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="mt-4 text-primary-500 hover:text-primary-600 underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Empty State - No items at all */}
            {filteredShopItems.length === 0 && allShopItems.length === 0 && (
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

