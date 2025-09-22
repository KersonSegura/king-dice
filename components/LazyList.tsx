'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemsPerPage?: number;
  loadingComponent?: React.ReactNode;
  endMessage?: React.ReactNode;
  className?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  threshold?: number;
}

export default function LazyList<T>({
  items,
  renderItem,
  itemsPerPage = 20,
  loadingComponent,
  endMessage,
  className = '',
  hasMore = false,
  onLoadMore,
  threshold = 200, // Load more when 200px from bottom
}: LazyListProps<T>) {
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Initialize with first page of items
  useEffect(() => {
    const initialItems = items.slice(0, itemsPerPage);
    setVisibleItems(initialItems);
    setCurrentPage(1);
  }, [items, itemsPerPage]);

  // Load more items
  const loadMoreItems = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    
    // If we have onLoadMore prop, call it (for API-based loading)
    if (onLoadMore && hasMore) {
      await onLoadMore();
    } else {
      // Otherwise, load more from existing items array
      const startIndex = currentPage * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const newItems = items.slice(startIndex, endIndex);
      
      if (newItems.length > 0) {
        setVisibleItems(prev => [...prev, ...newItems]);
        setCurrentPage(prev => prev + 1);
      }
    }
    
    setIsLoading(false);
  }, [items, currentPage, itemsPerPage, isLoading, onLoadMore, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          const hasMoreItems = hasMore || (currentPage * itemsPerPage < items.length);
          if (hasMoreItems) {
            loadMoreItems();
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: `${threshold}px`,
      }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [loadMoreItems, isLoading, currentPage, items.length, itemsPerPage, hasMore, threshold]);

  const hasMoreItems = hasMore || (currentPage * itemsPerPage < items.length);
  const displayItems = onLoadMore ? items : visibleItems; // Use all items if API-based

  return (
    <div ref={containerRef} className={className}>
      {/* Render visible items */}
      {displayItems.map((item, index) => (
        <div key={index}>
          {renderItem(item, index)}
        </div>
      ))}

      {/* Loading indicator */}
      {hasMoreItems && (
        <div
          ref={loadingRef}
          className="flex items-center justify-center py-8"
        >
          {isLoading ? (
            loadingComponent || (
              <div className="flex items-center space-x-2 text-gray-600">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>Loading more...</span>
              </div>
            )
          ) : (
            <div className="text-gray-400 text-sm">Scroll to load more</div>
          )}
        </div>
      )}

      {/* End message */}
      {!hasMoreItems && items.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          {endMessage || (
            <div>
              <div className="text-2xl mb-2">🎯</div>
              <div>You've reached the end!</div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📭</div>
          <div className="text-lg">No items to display</div>
        </div>
      )}
    </div>
  );
}
