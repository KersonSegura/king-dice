'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, User, Dice6, Clock, Plus } from 'lucide-react';
import SuggestGameModal from './SuggestGameModal';
import { useAuth } from '@/contexts/AuthContext';
import { closeChatOnNavigation } from '@/lib/closeChat';

interface SearchResult {
  id: string;
  username?: string;
  email?: string;
  avatar?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  createdAt?: string;
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
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [dropdownMetrics, setDropdownMetrics] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const updateDropdownPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const viewportWidth = window.innerWidth;
    const mobile = viewportWidth < 640;
    setIsMobileLayout(mobile);

    if (!mobile) {
      setDropdownMetrics({ left: 0, width: 0 });
      return;
    }

    if (!searchRef.current) {
      return;
    }

    const parentRect = searchRef.current.getBoundingClientRect();
    const desiredWidth = Math.min(384, viewportWidth - 24);
    const targetLeft = (viewportWidth - desiredWidth) / 2 - parentRect.left;
    const minLeft = -parentRect.left;
    const maxLeft = viewportWidth - desiredWidth - parentRect.left;
    const calculatedLeft = Math.min(Math.max(targetLeft, minLeft), maxLeft);

    setDropdownMetrics({ left: calculatedLeft, width: desiredWidth });
  }, []);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // On mobile, collapse the search bar if there's no query
        if (typeof window !== 'undefined' && window.innerWidth < 768 && !query) {
          setIsExpanded(false);
        }
      }
    }

    if (isOpen || isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isExpanded, query]);

  useEffect(() => {
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    return () => window.removeEventListener('resize', updateDropdownPosition);
  }, [updateDropdownPosition]);

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen, updateDropdownPosition]);


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
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all&limit=20`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[SearchBar] API response:', data);
          console.log('[SearchBar] Users:', data.users?.length || 0);
          console.log('[SearchBar] Games:', data.games?.length || 0);
          
          // Format results - prioritize users first, then games
          const formattedResults: SearchResult[] = [
            ...(data.users || []).map((user: any) => ({
              ...user,
              type: 'user' as const
            })),
            ...(data.games || []).map((game: any) => ({
              ...game,
              type: 'game' as const
            }))
          ];
          
          // Sort: users first, then games (within each type, maintain original order)
          formattedResults.sort((a, b) => {
            if (a.type === 'user' && b.type === 'game') return -1;
            if (a.type === 'game' && b.type === 'user') return 1;
            return 0;
          });
          
          console.log('[SearchBar] Formatted results:', formattedResults.length, '- Users:', formattedResults.filter(r => r.type === 'user').length, 'Games:', formattedResults.filter(r => r.type === 'game').length);
          
          // Log first few user results for debugging
          const userResults = formattedResults.filter(r => r.type === 'user');
          if (userResults.length > 0) {
            console.log('[SearchBar] Sample user results:', userResults.slice(0, 3).map(u => ({ username: u.username, id: u.id })));
          }
          
          setResults(formattedResults);
          setHasSearched(true);
        } else {
          const errorText = await response.text();
          console.error('Search API error:', response.status, response.statusText, errorText);
          setResults([]);
          setHasSearched(true);
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
    setIsExpanded(false);
    closeChatOnNavigation();
  };

  const handleSuggestGame = () => {
    setShowSuggestModal(true);
    setIsOpen(false);
  };

  const handleIconClick = () => {
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleInputBlur = () => {
    // Don't collapse if there's a query or if dropdown is open
    if (!query && !isOpen) {
      // Small delay to allow click events on dropdown to register
      setTimeout(() => {
        if (!query) {
          setIsExpanded(false);
        }
      }, 200);
    }
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

  const dropdownStyle = isMobileLayout && dropdownMetrics.width
    ? { width: `${dropdownMetrics.width}px`, left: `${dropdownMetrics.left}px` }
    : undefined;

  return (
    <div className={`relative ${isExpanded ? 'flex-1' : 'flex-shrink-0'} w-full sm:max-w-xs md:flex-1 md:max-w-sm lg:max-w-md xl:max-w-lg mx-2 sm:mx-3 md:mx-4`} ref={searchRef}>
      {/* Icon-only button for small screens */}
      <button
        onClick={handleIconClick}
        className={`md:hidden p-2 text-gray-600 hover:text-primary-500 transition-colors rounded-lg hover:bg-gray-100 ${isExpanded ? 'hidden' : 'block'}`}
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Expanded search bar - visible on md+ screens or when expanded on mobile */}
      <div className={`relative ${isExpanded ? 'block' : 'hidden'} md:block`}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={isExpanded && typeof window !== 'undefined' && window.innerWidth < 768 ? "Search..." : "Search users and games..."}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            setIsExpanded(true);
            closeChatOnNavigation();
          }}
          onBlur={handleInputBlur}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={() => {
                handleClear();
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setIsExpanded(false);
                }
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto sm:left-0 sm:w-full" style={dropdownStyle}>
          {loading ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {(() => {
                const userResults = results.filter(r => r.type === 'user');
                const gameResults = results.filter(r => r.type === 'game');
                const hasUsers = userResults.length > 0;
                const hasGames = gameResults.length > 0;
                
                return (
                  <>
                    {hasUsers && (
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Users</p>
                      </div>
                    )}
                    {userResults.map((result, index) => (
                      <Link
                        key={`user-${result.id}`}
                        href={`/profile/${result.username}`}
                        onClick={handleResultClick}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex-shrink-0">
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
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 whitespace-normal break-words">
                              {result.username}
                            </p>
                            {result.isVerified && (
                              <span className="text-blue-500 text-xs">✓</span>
                            )}
                            {result.isAdmin && (
                              <span className="text-red-500 text-xs bg-red-100 px-1 rounded">ADMIN</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <User className="w-3 h-3" />
                            <span>User</span>
                            {result.createdAt && (
                              <>
                                <span>•</span>
                                <span>{formatTime(result.createdAt)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {hasGames && (
                      <div className={`px-4 py-2 ${hasUsers ? 'border-t border-gray-200' : ''}`}>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Board Games</p>
                      </div>
                    )}
                    {gameResults.map((result, index) => (
                      <Link
                        key={`game-${result.id}`}
                        href={`/game/${result.id}`}
                        onClick={handleResultClick}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex-shrink-0">
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
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 whitespace-normal break-words">
                              {result.name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
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
                          </div>
                        </div>
                      </Link>
                    ))}
                  </>
                );
              })()}
            </div>
          ) : hasSearched ? (
            <div className="px-4 py-6 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
              <p className="text-sm mb-2">No results found for "{query}"</p>
              <p className="text-xs text-gray-400 mb-4">Try searching for users or board games</p>
              
              {/* Suggest Game Button */}
              <button
                onClick={handleSuggestGame}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#fbae17] text-white text-sm rounded-lg hover:bg-[#fbae17]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Suggest "{query}" as a game</span>
              </button>
            </div>
          ) : null}
        </div>
      )}
      
      {/* Suggest Game Modal */}
      <SuggestGameModal
        isOpen={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        gameName={query}
        suggestedBy={user?.username || 'Anonymous User'}
        userId={user?.id || null}
      />
    </div>
  );
}



