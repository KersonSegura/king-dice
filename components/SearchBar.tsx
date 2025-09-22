'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, User, Dice6, Clock } from 'lucide-react';

interface SearchResult {
  id: string;
  username?: string;
  email?: string;
  avatar?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  name?: string;
  year?: number;
  players?: string;
  duration?: string;
  image?: string;
  type: 'user' | 'game';
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
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

  // Search function with debouncing
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all&limit=8`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Format results
          const formattedResults: SearchResult[] = [
            ...data.users.map((user: any) => ({
              ...user,
              type: 'user' as const
            })),
            ...data.games.map((game: any) => ({
              ...game,
              type: 'game' as const
            }))
          ];
          
          setResults(formattedResults);
          setHasSearched(true);
        } else {
          console.error('Search API error:', response.status, response.statusText);
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleResultClick = () => {
    setIsOpen(false);
    setQuery('');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative flex-1 max-w-md mx-2 sm:mx-4" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search users and games..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.type === 'user' ? `/profile/${result.id}` : `/game/${result.id}`}
                  onClick={handleResultClick}
                  className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-shrink-0">
                    {result.type === 'user' ? (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                        {result.avatar ? (
                          <Image
                            src={result.avatar}
                            alt={result.username || 'User'}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <Dice6 className="w-4 h-4 text-white" />
                        )}
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center overflow-hidden">
                        {result.image ? (
                          <Image
                            src={result.image}
                            alt={result.name || 'Board Game'}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <Dice6 className="w-4 h-4 text-white" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.type === 'user' ? result.username : result.name}
                      </p>
                      {result.type === 'user' && result.isVerified && (
                        <span className="text-blue-500 text-xs">✓</span>
                      )}
                      {result.type === 'user' && result.isAdmin && (
                        <span className="text-red-500 text-xs bg-red-100 px-1 rounded">ADMIN</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {result.type === 'user' ? (
                        <>
                          <User className="w-3 h-3" />
                          <span>User</span>
                          {result.createdAt && (
                            <>
                              <span>•</span>
                              <span>{formatTime(result.createdAt)}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <Dice6 className="w-3 h-3" />
                          <span>Board Game</span>
                          {result.year && (
                            <>
                              <span>•</span>
                              <span>{result.year}</span>
                            </>
                          )}
                          {result.players && (
                            <>
                              <span>•</span>
                              <span>{result.players} players</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : hasSearched ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Try searching for users or board games</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
