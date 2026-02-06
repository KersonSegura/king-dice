'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ExternalLink, Search, ChevronLeft, ChevronRight, ChevronDown, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import LoadingScreen from '@/components/LoadingScreen';

// Amazon Associates disclosure - will be translated in component

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

export default function ShopPageClient() {
  const t = useTranslations('common');
  const tShop = useTranslations('shop');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper function to get translated category name
  const getCategoryName = (category: Category): string => {
    if (locale === 'es' && category.nameEs) {
      return category.nameEs;
    }
    return category.nameEn;
  };

  const [allShopItems, setAllShopItems] = useState<ShopItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const categoryModalRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 40;

  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setPageInUrl = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (!page || page <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    // Prevent Next.js from auto-scrolling; we'll do it manually for smooth UX
    router.push(url, { scroll: false });
  };

  const goToPage = (page: number, opts?: { scroll?: boolean }) => {
    const clamped = Math.max(1, Math.min(totalPages || 1, page));
    setCurrentPage(clamped);
    setPageInUrl(clamped);
    if (opts?.scroll !== false) scrollToTop();
  };

  // Close category modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryModalRef.current && !categoryModalRef.current.contains(event.target as Node)) {
        setShowCategoryModal(false);
      }
    }
    if (showCategoryModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryModal]);

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
          uniqueKey: item.id ? `shop-${item.id}` : `shop-${item.title}`,
        }));

        setAllShopItems(shopItemsWithKeys);
        setCategories(data.categories || []);

        // Debug logging
        console.log('[SHOP PAGE] Loaded', shopItemsWithKeys.length, 'shop items');
        console.log(
          '[SHOP PAGE] Loaded',
          (data.categories || []).length,
          'categories:',
          (data.categories || []).map((c: Category) => c.nameEn)
        );
      } catch (err) {
        console.error('Error fetching shop items:', err);
        setError(tShop('errorLoadingItems'));
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
      const matchesGameName =
        item.game?.nameEn?.toLowerCase().includes(searchLower) ||
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredShopItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedShopItems = filteredShopItems.slice(startIndex, endIndex);

  // Initialize/sync current page from URL (?page=)
  useEffect(() => {
    const raw = searchParams?.get('page') || '1';
    const parsed = parseInt(raw, 10);
    const pageFromUrl = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

    // Defer clamping until we know totalPages (after data loads)
    setCurrentPage(pageFromUrl);
  }, [searchParams]);

  // Clamp current page if filters change totalPages (or if URL is out of range)
  useEffect(() => {
    if (!totalPages || totalPages < 1) return;
    if (currentPage > totalPages) {
      goToPage(totalPages, { scroll: false });
      return;
    }
    if (currentPage < 1) {
      goToPage(1, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  // Reset to page 1 when filters change
  useEffect(() => {
    goToPage(1, { scroll: false });
  }, [searchQuery, selectedCategory]);

  // Show full-page loading screen while loading
  if (loading) {
    return <LoadingScreen message={tShop('loading')} subMessage={tShop('loadingItems')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full overflow-x-hidden">
      {/* Header with back button - hidden in embed (mobile has home in nav) */}
      <div className="kd-back-to-home bg-white shadow-sm border-b w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('backToHome')}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 pb-20 w-full min-w-0">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img
              src="/ShopIcon.svg"
              alt="Shop Icon"
              className="w-8 h-8"
              style={{
                filter:
                  'brightness(0) saturate(100%) invert(67%) sepia(93%) saturate(1352%) hue-rotate(1deg) brightness(102%) contrast(101%)',
              }}
            />
            <h1 className="text-3xl font-bold text-gray-900">{tShop('title')}</h1>
          </div>
        </div>

        {/* Search Bar and Filters */}
        {!loading && !error && (
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative w-full min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={tShop('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-0"
              />
            </div>

            {/* Category Filters - 2 buttons with modal */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{tShop('filterByCategory')}</h3>

              <div className="flex flex-col sm:flex-row gap-2 relative w-full min-w-0">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-[#fbae17] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {tShop('allCategories')}
                </button>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-between gap-2 min-w-0 ${
                    selectedCategory !== null
                      ? 'bg-[#fbae17] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {selectedCategory !== null 
                      ? (() => {
                          const category = categories.find((c) => c.id === selectedCategory);
                          return category ? getCategoryName(category) : tShop('selectCategory');
                        })()
                      : tShop('selectCategory')}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Category Modal */}
                {showCategoryModal && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div
                      ref={categoryModalRef}
                      className="bg-white rounded-xl shadow-xl max-w-sm w-full max-h-[70vh] overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4 border-b">
                        <h3 className="font-semibold text-gray-900">{tShop('selectCategory')}</h3>
                        <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      <div className="overflow-y-auto max-h-[calc(70vh-60px)] p-2">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => {
                              setSelectedCategory(category.id);
                              setShowCategoryModal(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors mb-1 ${
                              selectedCategory === category.id
                                ? 'bg-[#fbae17] text-white'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {getCategoryName(category)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-gray-600">
              {tShop('showingItems', {
                start: filteredShopItems.length === 0 ? 0 : startIndex + 1,
                end: Math.min(endIndex, filteredShopItems.length),
                total: filteredShopItems.length,
                filtered: filteredShopItems.length !== allShopItems.length ? ` (${tShop('filteredFrom')} ${allShopItems.length} ${tShop('total')})` : ''
              })}
            </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8 w-full min-w-0">
              {paginatedShopItems.map((item) => (
                <div
                  key={item.uniqueKey || item.id || `shop-item-${item.title}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full min-w-0 w-full"
                >
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
                            const target = e.currentTarget as unknown as HTMLImageElement;
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
                            <rect width="200" height="200" fill="#e5e7e9" rx="8" />
                            <text
                              x="50%"
                              y="50%"
                              fontFamily="Arial, sans-serif"
                              fontSize="14"
                              fill="#9ca3af"
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              {item.title}
                            </text>
                          </svg>
                          <p className="text-xs text-gray-500">{tShop('imageComingSoon')}</p>
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
                      className="w-full inline-flex items-center justify-center bg-[#fbae17] hover:bg-[#fbae17] text-white font-medium py-1.5 px-3 rounded-lg transition-colors space-x-1.5 text-xs mt-auto"
                    >
                      <span>{tShop('buyOnAmazon')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-center mt-8 space-y-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                    aria-label={t('previous')}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage = page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2);

                      if (!showPage) {
                        // Show ellipsis
                        const prevPage = page - 1;
                        const nextPage = page + 1;
                        if (
                          (prevPage === 1 || prevPage === currentPage - 3) &&
                          (nextPage === totalPages || nextPage === currentPage + 3)
                        ) {
                          return (
                            <span key={page} className="px-2 text-gray-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-[#fbae17] text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                    aria-label={t('next')}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  {tShop('page')} {currentPage} {tShop('of')} {totalPages}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredShopItems.length === 0 && allShopItems.length > 0 && (
              <div className="text-center py-12">
                <img src="/ShopIcon.svg" alt="Shop Icon" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">{tShop('noItemsMatch')}</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="mt-4 text-primary-500 hover:text-primary-600 underline"
                >
                  {tShop('clearFilters')}
                </button>
              </div>
            )}

            {/* Empty State - No items at all */}
            {filteredShopItems.length === 0 && allShopItems.length === 0 && (
              <div className="text-center py-12">
                <img src="/ShopIcon.svg" alt="Shop Icon" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">{tShop('noItemsAvailable')}</p>
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
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 mb-1">{tShop('amazonDisclosure')}</h3>
                <p className="text-sm text-blue-700">{tShop('amazonDisclosureText')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


