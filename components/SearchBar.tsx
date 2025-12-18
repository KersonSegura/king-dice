'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, User, Dice6, Clock, Plus, UserPlus, UserMinus, MessageCircle } from 'lucide-react';
import SuggestGameModal from './SuggestGameModal';
import LoadingLogo from './LoadingLogo';
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
  isFollowing?: boolean;
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
  const [followStatuses, setFollowStatuses] = useState<Record<string, boolean>>({});
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [creatingChats, setCreatingChats] = useState<Set<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Load recent searches from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed);
          }
        } catch (e) {
          console.error('Error parsing recent searches:', e);
        }
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) return;
    
    const trimmed = searchQuery.trim();
    setRecentSearches(prev => {
      // Remove if already exists, then add to beginning
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 15); // Keep max 15 recent searches
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      }
      
      return updated;
    });
  };

  // Remove a recent search
  const removeRecentSearch = (searchQuery: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setRecentSearches(prev => {
      const updated = prev.filter(s => s !== searchQuery);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      }
      
      return updated;
    });
  };

  // Handle clicking on a recent search
  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
    setIsOpen(true);
    // Trigger search by setting query (will trigger the search useEffect)
  };

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
      setFollowStatuses({});
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
            console.log('[SearchBar] Sample user results:', userResults.slice(0, 3).map(u => ({ 
              username: u.username, 
              id: u.id, 
              isFollowing: u.isFollowing 
            })));
          }
          
          setResults(formattedResults);
          // Initialize follow statuses from API results - this is the source of truth
          const initialFollowStatuses: Record<string, boolean> = {};
          formattedResults.forEach((result) => {
            if (result.type === 'user' && result.id) {
              // Use the isFollowing value from the API as the source of truth
              const apiFollowingStatus = result.isFollowing === true;
              initialFollowStatuses[result.id] = apiFollowingStatus;
              console.log(`[SearchBar] User ${result.username} (${result.id}): isFollowing=${apiFollowingStatus} (from API)`);
            }
          });
          // Update follow statuses - replace for users in current results, keep others
          setFollowStatuses(prev => {
            const updated = { ...prev };
            // Overwrite follow status for users in current search results
            Object.keys(initialFollowStatuses).forEach(userId => {
              updated[userId] = initialFollowStatuses[userId];
            });
            return updated;
          });
          setHasSearched(true);
          
          // Save to recent searches
          saveRecentSearch(query);
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
    setFollowStatuses({});
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
    <div className={`relative flex-1 min-w-0 md:flex-1 md:max-w-sm lg:max-w-md xl:max-w-lg mx-1 sm:mx-3 md:mx-4`} ref={searchRef}>
      {/* Search bar - always visible on mobile, never just an icon */}
      <div className="relative block">
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
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search Results Dropdown - Show recent searches when empty, results when typing */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto sm:left-0 sm:w-full" style={dropdownStyle}>
          {query.length < 2 ? (
            // Show recent searches when input is empty or less than 2 characters
            recentSearches.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="text-xs font-semibold text-gray-500 uppercase">Recent Searches</p>
                    </div>
                  </div>
                </div>
                {recentSearches.map((searchQuery, index) => (
                  <div
                    key={`recent-${index}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <button
                      onClick={() => handleRecentSearchClick(searchQuery)}
                      className="flex items-center space-x-3 flex-1 min-w-0 text-left"
                    >
                      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{searchQuery}</span>
                    </button>
                    <button
                      onClick={(e) => removeRecentSearch(searchQuery, e)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove from recent searches"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No recent searches</p>
                <p className="text-xs text-gray-400 mt-1">Start typing to search for users and games</p>
              </div>
            )
          ) : loading ? (
            <div className="px-4 py-3 text-center text-gray-500">
              <LoadingLogo size={28} text="Searching..." className="flex flex-col items-center justify-center py-2" />
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
                    {userResults.map((result, index) => {
                      // Prioritize state (for real-time updates) but fall back to API result (source of truth)
                      const isFollowing = followStatuses[result.id] !== undefined 
                        ? followStatuses[result.id] 
                        : (result.isFollowing === true);
                      const isUpdating = updatingUsers.has(result.id);
                      
                      const handleFollowClick = async (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (!user || isUpdating) return;
                        if (result.id === user.id) return; // Can't follow yourself
                        
                        setUpdatingUsers(prev => new Set(prev).add(result.id));
                        try {
                          const action = isFollowing ? 'unfollow' : 'follow';
                          const response = await fetch('/api/follow', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action,
                              followerId: user.id,
                              followingId: result.id
                            })
                          });
                          
                          if (response.ok) {
                            const newStatus = !isFollowing;
                            setFollowStatuses(prev => ({ ...prev, [result.id]: newStatus }));
                            // Update the result in the results array
                            setResults(prev => prev.map(r => 
                              r.id === result.id && r.type === 'user' 
                                ? { ...r, isFollowing: newStatus }
                                : r
                            ));
                          }
                        } catch (error) {
                          console.error('Error updating follow status:', error);
                        } finally {
                          setUpdatingUsers(prev => {
                            const next = new Set(prev);
                            next.delete(result.id);
                            return next;
                          });
                        }
                      };
                      
                      const handleChatClick = async (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (!user || creatingChats.has(result.id)) {
                          console.log('[SearchBar] Chat click blocked:', { hasUser: !!user, isCreating: creatingChats.has(result.id) });
                          return;
                        }
                        if (result.id === user.id) {
                          console.log('[SearchBar] Cannot chat with yourself');
                          return;
                        }
                        
                        console.log('[SearchBar] Starting chat with user:', result.username, result.id);
                        setCreatingChats(prev => new Set(prev).add(result.id));
                        try {
                          // Create or get existing direct chat
                          const response = await fetch('/api/chats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              type: 'direct',
                              participants: [user.id, result.id],
                              createdBy: user.id
                            })
                          });
                          
                          if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            console.error('[SearchBar] Chat API error:', response.status, errorData);
                            return;
                          }
                          
                          const data = await response.json();
                          console.log('[SearchBar] Chat created/found:', data);
                          
                          // Format participants to match expected structure
                          const formattedParticipants = (data.chat.participants || []).map((p: any) => {
                            // Handle both nested user structure and flat structure
                            if (p.user) {
                              return {
                                id: p.user.id || p.user_id,
                                username: p.user.username,
                                avatar: p.user.avatar,
                                isVerified: p.user.is_verified || p.user.isVerified || false,
                                isAdmin: p.user.is_admin || p.user.isAdmin || false,
                                joinedAt: p.joined_at || p.joinedAt,
                                lastReadAt: p.last_read_at || p.lastReadAt
                              };
                            } else {
                              return p;
                            }
                          });
                          
                          const chat = {
                            id: data.chat.id,
                            name: data.chat.name || result.username,
                            type: 'direct' as const,
                            participants: formattedParticipants,
                            createdAt: data.chat.createdAt || data.chat.created_at || new Date().toISOString(),
                            updatedAt: data.chat.updatedAt || data.chat.updated_at || new Date().toISOString()
                          };
                          
                          console.log('[SearchBar] Dispatching chat event:', chat);
                          // Dispatch custom event to open chat
                          const openChatEvent = new CustomEvent('openChatWithUser', {
                            detail: { chat },
                            bubbles: true
                          });
                          window.dispatchEvent(openChatEvent);
                          console.log('[SearchBar] Chat event dispatched');
                          
                          // Close search dropdown
                          setIsOpen(false);
                          setQuery('');
                          setIsExpanded(false);
                        } catch (error) {
                          console.error('[SearchBar] Error starting chat:', error);
                        } finally {
                          setCreatingChats(prev => {
                            const next = new Set(prev);
                            next.delete(result.id);
                            return next;
                          });
                        }
                      };
                      
                      return (
                        <div
                          key={`user-${result.id}`}
                  className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                        >
                          <Link
                            href={`/profile/${result.username}`}
                            onClick={handleResultClick}
                            className="flex items-center space-x-3 flex-1 min-w-0"
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
                                {isFollowing ? (
                                  <span>Following</span>
                                ) : (
                                  <span>User</span>
                                )}
                              </div>
                            </div>
                          </Link>
                          {user && result.id !== user.id && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={handleChatClick}
                                disabled={creatingChats.has(result.id)}
                                className={`flex-shrink-0 p-1.5 rounded-full text-xs font-medium transition-all ${
                                  creatingChats.has(result.id)
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : 'cursor-pointer hover:opacity-90'
                                } bg-blue-500 text-white hover:bg-blue-600`}
                                title="Start a chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleFollowClick}
                                disabled={isUpdating}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                  isUpdating 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : 'cursor-pointer hover:opacity-90'
                                } ${
                                  isFollowing
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-[#fbae17] text-white hover:bg-[#fbae17]/90'
                                }`}
                              >
                                {isFollowing ? (
                                  <>
                                    <UserMinus className="w-3 h-3 inline mr-1" />
                                    Unfollow
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-3 h-3 inline mr-1" />
                                    Follow
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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



