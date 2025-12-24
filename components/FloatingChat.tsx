'use client';

// FloatingChat component for managing chat interface
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Users, Search, Plus, Bot, ArrowLeft, MoreVertical, Trash2, Ban, Flag, LogOut, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatState } from '@/contexts/ChatStateContext';
import { closeMenusOnChatOpen } from '@/lib/closeChat';
import ChatList from './ChatList';
import Chat from './Chat';
import ChatBot from './ChatBot';
import GroupChatModal from './GroupChatModal';
import ViewMembersModal from './ViewMembersModal';
import LoadingLogo from './LoadingLogo';
import { useTranslations } from 'next-intl';

// Color palette for group chats - enough colors to minimize repeats
const GROUP_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#64748b', // slate-500
];

// Function to assign a consistent color to a group chat based on its ID
function getGroupChatColor(chatId: string): string {
  // Simple hash function to convert chat ID to a number
  let hash = 0;
  for (let i = 0; i < chatId.length; i++) {
    const char = chatId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % GROUP_COLORS.length;
  return GROUP_COLORS[index];
}

// Custom User Search Component
function CustomChatList({ 
  onSelectChat, 
  onCreateGroup, 
  onStartDirectChat, 
  onStartBotChat,
  user,
  refreshTrigger,
  chatsWithUnread,
  onChatOpened,
  onStartGroupChatWithUser,
  setChatsWithUnread
}: {
  onSelectChat: (chat: any) => void;
  onCreateGroup: () => void;
  onStartDirectChat: () => void;
  onStartBotChat: () => void;
  user: any;
  refreshTrigger?: number;
  chatsWithUnread?: Map<string, number>;
  onChatOpened?: (chatId: string) => void;
  onStartGroupChatWithUser?: (targetUser: any) => void;
  setChatsWithUnread?: (updater: (prev: Map<string, number>) => Map<string, number>) => void;
}) {
  const t = useTranslations('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [existingChats, setExistingChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load cached chats instantly from localStorage
  const loadCachedChats = (): any[] => {
    if (typeof window === 'undefined' || !user?.id) return [];
    try {
      const cacheKey = `chats_cache_${user.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { chats, timestamp } = JSON.parse(cached);
        // Cache is valid for 5 minutes
        const cacheAge = Date.now() - timestamp;
        if (cacheAge < 5 * 60 * 1000) {
          return chats || [];
        }
      }
    } catch (error) {
      console.error('Error loading cached chats:', error);
    }
    return [];
  };

  // Save chats to localStorage cache
  const saveCachedChats = (chats: any[]) => {
    if (typeof window === 'undefined' || !user?.id) return;
    try {
      const cacheKey = `chats_cache_${user.id}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        chats,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving cached chats:', error);
    }
  };

  // Search for users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out current user from results
        const filteredUsers = (data.users || []).filter((u: any) => u.id !== user?.id);
        setSearchResults(filteredUsers);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing chats - optimized with caching for instant display
  const fetchExistingChats = async (showCached = true) => {
    if (!user?.id) return;
    
    // Show cached chats instantly on first load
    if (showCached && isInitialLoad) {
      const cachedChats = loadCachedChats();
      if (cachedChats.length > 0) {
        setExistingChats(cachedChats);
        setIsInitialLoad(false);
        // Initialize unread counts from cache
        if (setChatsWithUnread) {
          const unreadMap = new Map<string, number>();
          cachedChats.forEach((chat: any) => {
            if (chat.unreadCount > 0) {
              unreadMap.set(chat.id, chat.unreadCount);
            }
          });
          setChatsWithUnread(prev => {
            const merged = new Map(prev);
            unreadMap.forEach((count, chatId) => {
              merged.set(chatId, count);
            });
            return merged;
          });
        }
      }
    }
    
    // Fetch fresh data in background
    try {
      const response = await fetch(`/api/chats?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const chats = data.chats || [];
        setExistingChats(chats);
        saveCachedChats(chats); // Cache the fresh data
        setIsInitialLoad(false);
        
        // Initialize unread counts from API response
        if (setChatsWithUnread) {
          const unreadMap = new Map<string, number>();
          chats.forEach((chat: any) => {
            if (chat.unreadCount > 0) {
              unreadMap.set(chat.id, chat.unreadCount);
            }
          });
          // Merge with existing real-time updates
          setChatsWithUnread(prev => {
            const merged = new Map(prev);
            unreadMap.forEach((count, chatId) => {
              merged.set(chatId, count);
            });
            return merged;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      // Keep cached chats visible if fetch fails
      if (existingChats.length === 0) {
        const cachedChats = loadCachedChats();
        if (cachedChats.length > 0) {
          setExistingChats(cachedChats);
        }
      }
      setIsInitialLoad(false);
    }
  };

  // Load existing chats on mount and when refreshTrigger changes
  useEffect(() => {
    // Load cached chats immediately, then fetch fresh data
    fetchExistingChats(true);
  }, [user?.id, refreshTrigger]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  // Start a direct chat with a user
  const startChatWithUser = async (targetUser: any) => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct',
          participants: [user?.id, targetUser.id],
          createdBy: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Create chat object for our interface
        const chat = {
          id: data.chat.id,
          name: targetUser.username,
          type: 'direct' as const,
          participants: data.chat.participants,
          createdAt: data.chat.createdAt || data.chat.created_at || new Date().toISOString(),
          updatedAt: data.chat.updatedAt || data.chat.updated_at || new Date().toISOString()
        };
        // Refresh the chat list to include the new chat
        fetchExistingChats();
        onSelectChat(chat);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  // Create a group with a user - opens modal with user pre-selected
  const createGroupWithUser = (targetUser: any) => {
    if (onStartGroupChatWithUser) {
      onStartGroupChatWithUser(targetUser);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return t('justNow');
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays === 1) {
      return t('yesterday');
    } else if (diffInDays < 7) {
      return `${diffInDays}d`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('searchForUsers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
            {/* Dice-Bot Chat - Always show first */}
            <div
              onClick={onStartBotChat}
              className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white border-2 border-gray-200">
                  <img
                    src="/DiceBotIcon.svg"
                    alt="Dice-Bot"
                    className="w-8 h-8"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t('diceBotName')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t('aiAssistant')}
                  </p>
                </div>
              </div>
            </div>

        {/* Skeleton Loading - Show while initial load and no cached data */}
        {!hasSearched && isInitialLoad && existingChats.length === 0 && (
          <div className="border-b border-gray-100">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('recentChats')}
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border-b border-gray-50 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Existing Chats */}
        {!hasSearched && existingChats.length > 0 && (
          <div className="border-b border-gray-100">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t('recentChats')}
            </div>
            {existingChats.slice(0, 5).map((chat) => {
              // Get unread count from chat data or from real-time updates
              const unreadCount = chatsWithUnread?.get(chat.id) || chat.unreadCount || 0;
              return (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat);
                  // Remove from unread map when opened
                  if (onChatOpened) {
                    onChatOpened(chat.id);
                  }
                }}
                className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors relative"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    {chat.type === 'group' ? (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: getGroupChatColor(chat.id) }}
                      >
                        <Users className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {chat.participants && chat.participants.length > 0 ? (
                          chat.participants.find((p: any) => p.id !== user?.id)?.avatar ? (
                            <img
                              src={chat.participants.find((p: any) => p.id !== user?.id)?.avatar}
                              alt={chat.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            chat.name.charAt(0).toUpperCase()
                          )
                        ) : (
                          chat.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {chat.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {chat.type === 'group' && (
                        <span className="text-xs text-green-600">
                          {chat.participants?.length || 0} {t('members')}
                        </span>
                      )}
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">
                          {chat.type === 'group' && chat.lastMessage.sender ? (
                            <>
                              <span className="font-medium">{chat.lastMessage.sender.username}:</span>{' '}
                              {chat.lastMessage.content}
                            </>
                          ) : (
                            chat.lastMessage.content
                          )}
                        </p>
                      )}
                      {!chat.lastMessage && (
                        <p className="text-sm text-gray-400 italic">
                          {t('noMessagesYet')}
                        </p>
                      )}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 min-w-[28px] h-7 bg-blue-500 text-white text-sm font-bold rounded-full flex items-center justify-center px-2">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}

        {/* User Search Results */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingLogo size={36} text={t('searching')} />
          </div>
        ) : !hasSearched ? (
          <div className="p-8 text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{t('searchToStartChatting')}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t('typeUsername')}
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{t('noUsersFound')}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t('tryDifferentSearch')}
            </p>
          </div>
        ) : (
          searchResults.map((foundUser) => (
            <div
              key={foundUser.id}
              className="p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {foundUser.avatar ? (
                    <img
                      src={foundUser.avatar}
                      alt={foundUser.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    foundUser.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => startChatWithUser(foundUser)}
                >
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {foundUser.username}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {foundUser.isVerified && (
                      <span className="text-xs text-blue-500">✓ {t('verified')}</span>
                    )}
                    {foundUser.isAdmin && (
                      <span className="text-xs text-red-500">{t('admin')}</span>
                    )}
                    <p className="text-sm text-gray-500">
                      {t('clickToStartChat')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    createGroupWithUser(foundUser);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title={t('createGroupWithUser')}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function FloatingChat() {
  const { user, isAuthenticated } = useAuth();
  const contextChatState = useChatState();
  const t = useTranslations('chat');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStartDirectChat, setShowStartDirectChat] = useState(false);
  const [showAutoTooltip, setShowAutoTooltip] = useState(false);
  const [iconState, setIconState] = useState<'message' | 'bot'>('message');
  const [hasShownTooltip, setHasShownTooltip] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [chatListRefreshTrigger, setChatListRefreshTrigger] = useState(0);
  const [initialGroupUser, setInitialGroupUser] = useState<any>(null);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showViewMembers, setShowViewMembers] = useState(false);
  const [chatsWithUnread, setChatsWithUnread] = useState<Map<string, number>>(new Map());

  // Prefetch chats on mount for instant access (even when chat is closed)
  useEffect(() => {
    if (user?.id && typeof window !== 'undefined') {
      // Prefetch chats in background - use cached version if available
      const cacheKey = `chats_cache_${user.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        // Only prefetch if no cache exists - this ensures instant loading when user opens chat
        fetch(`/api/chats?userId=${user.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.chats) {
              localStorage.setItem(cacheKey, JSON.stringify({
                chats: data.chats,
                timestamp: Date.now()
              }));
            }
          })
          .catch(err => console.error('Error prefetching chats:', err));
      }
    }
  }, [user?.id]);

  // Dispatch custom event for BackToTopButton to listen to
  useEffect(() => {
    const event = new CustomEvent('chatStateChanged', {
      detail: { isChatOpen, selectedChat }
    });
    window.dispatchEvent(event);
  }, [isChatOpen, selectedChat]);

  // Listen for navigation events to close chat on mobile
  useEffect(() => {
    const handleCloseChat = () => {
      // Only close on mobile devices
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        if (isChatOpen) {
          setIsChatOpen(false);
          setSelectedChat(null);
        }
      }
    };

    window.addEventListener('closeChatOnNavigation', handleCloseChat);
    
    return () => {
      window.removeEventListener('closeChatOnNavigation', handleCloseChat);
    };
  }, [isChatOpen]);

  // Listen for custom event to open chat with a specific user
  useEffect(() => {
    const handleOpenChatWithUser = (event: CustomEvent) => {
      const { chat } = event.detail;
      console.log('[FloatingChat] Received openChatWithUser event:', event);
      if (chat) {
        console.log('[FloatingChat] Opening chat menu with user:', chat);
        // Set the selected chat first, then open the menu
        // This ensures the chat is ready when the menu opens
        setSelectedChat(chat);
        setIsChatOpen(true);
        // Close menus when opening chat on mobile
        closeMenusOnChatOpen();
        // Refresh the chat list to ensure it's up to date
        setChatListRefreshTrigger(prev => prev + 1);
      } else {
        console.warn('[FloatingChat] Received event but no chat data:', event.detail);
      }
    };

    console.log('[FloatingChat] Setting up openChatWithUser event listener');
    window.addEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);
    
    return () => {
      console.log('[FloatingChat] Removing openChatWithUser event listener');
      window.removeEventListener('openChatWithUser', handleOpenChatWithUser as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // setChatListRefreshTrigger is a stable state setter, doesn't need to be in deps

  // Dispatch event to close menus when chat opens on mobile
  useEffect(() => {
    if (isChatOpen && typeof window !== 'undefined' && window.innerWidth < 768) {
      closeMenusOnChatOpen();
    }
  }, [isChatOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Handler functions for dropdown menu
  const handleDeleteChat = async (chatId: string) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/chats?chatId=${chatId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSelectedChat(null);
        setIsChatOpen(false);
        // Refresh the chat list by triggering a reload
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat');
    }
  };

  const handleBlockUser = async (userId: string) => {
    if (!confirm('Are you sure you want to block this user? They will not be able to send you messages.')) {
      return;
    }

    if (!user?.id) return;

    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'block',
          friendId: userId
        })
      });

      if (response.ok) {
        alert('User blocked successfully');
        // Close the chat and refresh
        setSelectedChat(null);
        setIsChatOpen(false);
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user');
    }
  };

  const handleReportUser = async (userId: string, chatId: string) => {
    const reason = prompt('Please provide a reason for reporting this user:');
    if (!reason || !reason.trim()) {
      return;
    }

    if (!user?.id) return;

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: 'user',
          contentId: userId,
          reporterId: user.id,
          reason: 'other',
          description: `Reported user from chat ${chatId}. Reason: ${reason}`
        })
      });

      if (response.ok) {
        alert('User reported successfully. Thank you for helping keep our community safe.');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to report user');
      }
    } catch (error) {
      console.error('Error reporting user:', error);
      alert('Failed to report user');
    }
  };

  const handleLeaveGroup = async (chatId: string) => {
    if (!confirm('Are you sure you want to leave this group? You will no longer receive messages from this group.')) {
      return;
    }

    if (!user?.id) return;

    try {
      const response = await fetch('/api/chats/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          userId: user.id
        })
      });

      if (response.ok) {
        // Close the chat and refresh the chat list
        setSelectedChat(null);
        setIsChatOpen(false);
        setChatListRefreshTrigger(prev => prev + 1);
        // Optionally reload to ensure everything is updated
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      alert('Failed to leave group');
    }
  };

  // Icon animation effect - ALWAYS call this hook
  useEffect(() => {
    if (!isChatOpen && isAuthenticated) {
      const interval = setInterval(() => {
        setIconState(prev => prev === 'message' ? 'bot' : 'message');
      }, 2000); // Change icon every 2 seconds

      return () => clearInterval(interval);
    } else {
      setIconState('message');
    }
  }, [isChatOpen, isAuthenticated]);

  // Auto tooltip that appears once per session - ALWAYS call this hook
  useEffect(() => {
    if (!isChatOpen && isAuthenticated && !hasShownTooltip) {
      const tooltipTimer = setTimeout(() => {
        setShowAutoTooltip(true);
        setHasShownTooltip(true);
        
        // Hide tooltip after 10 seconds
        setTimeout(() => {
          setShowAutoTooltip(false);
        }, 10000);
      }, 5000); // Show tooltip after 5 seconds of page load

      return () => clearTimeout(tooltipTimer);
    }
  }, [isChatOpen, isAuthenticated, hasShownTooltip]);

  // Play message notification sound
  const playMessageSound = () => {
    try {
      const audio = new Audio('/Sound/MessageReceivedAudio.mp3');
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    } catch (error) {
      console.log('Error creating audio:', error);
    }
  };

  // Fetch unread messages count and set up real-time subscriptions - ALWAYS call this hook
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/messages/unread?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          const newUnreadCount = data.unreadCount || 0;
          
          // Play sound if unread count increased (and chat is not open)
          if (newUnreadCount > previousUnreadCount && previousUnreadCount >= 0 && !isChatOpen) {
            playMessageSound();
          }
          
          setPreviousUnreadCount(unreadCount);
          setUnreadCount(newUnreadCount);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    // Initial fetch
    fetchUnreadCount();
    
    // Set up real-time subscriptions for notifications (messages and group additions)
    (async () => {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase-browser');
      const supabase = await getSupabaseBrowserClient();

      // Subscribe to new notifications for this user
      const notificationsChannel = supabase
        .channel(`chat-notifications-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, async (payload) => {
          const notification: any = payload.new;
          
          // Handle message notifications
          if (notification.type === 'message') {
            // Refresh unread count immediately
            await fetchUnreadCount();
            
            // Add chat to unread map if this is not the currently selected chat
            const notificationChatId = notification.entity_id || notification.entityId;
            const isCurrentChat = selectedChat?.id === notificationChatId;
            if (notificationChatId && !isCurrentChat) {
              setChatsWithUnread(prev => {
                const next = new Map(prev);
                const currentCount = next.get(notificationChatId) || 0;
                next.set(notificationChatId, currentCount + 1);
                return next;
              });
              
              // Only play sound if chat is not open
              if (!isChatOpen) {
                playMessageSound();
              }
            }
          }
          
          // Handle group addition notifications
          if (notification.type === 'system' && notification.entity_type === 'chat' && !isChatOpen) {
            // User was added to a group - show notification and play sound
            playMessageSound();
            
            // Refresh chat list to show the new group
            setChatListRefreshTrigger(prev => prev + 1);
          }
        })
        .subscribe();

      // Also subscribe to messages table directly for faster updates
      // We'll subscribe to all messages and filter in JavaScript
      const messagesChannel = supabase
        .channel(`messages-realtime-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, async (payload) => {
          const newMessage: any = payload.new;
          
          // Handle both camelCase and snake_case
          const senderId = newMessage.senderId || newMessage.sender_id;
          const chatId = newMessage.chatId || newMessage.chat_id;
          
          // Check if this message is in a chat where user is a participant
          // and message is not from current user
          if (senderId !== user.id && chatId) {
            // Check if user is a participant in this chat (try both naming conventions)
            let participant = null;
            
            // Try camelCase first
            const { data: participantCamel } = await supabase
              .from('chat_participants')
              .select('id')
              .eq('chatId', chatId)
              .eq('userId', user.id)
              .maybeSingle();
            
            if (participantCamel) {
              participant = participantCamel;
            } else {
              // Try snake_case
              const { data: participantSnake } = await supabase
                .from('chat_participants')
                .select('id')
                .eq('chat_id', chatId)
                .eq('user_id', user.id)
                .maybeSingle();
              
              if (participantSnake) {
                participant = participantSnake;
              }
            }
            
            if (participant) {
              // User is a participant - always refresh unread count
              // (if chat is open, messages are marked as read, so count decreases)
              // (if chat is not open, count increases)
              await fetchUnreadCount();
              
              // Add chat to unread map if this is not the currently selected chat
              const isCurrentChat = selectedChat?.id === chatId;
              if (!isCurrentChat) {
                // Increment unread count for this chat
                setChatsWithUnread(prev => {
                  const next = new Map(prev);
                  const currentCount = next.get(chatId) || 0;
                  next.set(chatId, currentCount + 1);
                  return next;
                });
                
                // Only play sound if chat is not open
                if (!isChatOpen) {
                  playMessageSound();
                }
              }
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(messagesChannel);
      };
    })();

    // Refresh unread count every 30 seconds as fallback
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.id, unreadCount, previousUnreadCount, isChatOpen]);

  // Update unread count when chat is opened or closed
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const updateUnreadCount = async () => {
        try {
          const response = await fetch(`/api/messages/unread?userId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            setUnreadCount(data.unreadCount || 0);
          }
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };
      
      updateUnreadCount();
    }
  }, [isChatOpen, isAuthenticated, user?.id]);

  // Early return AFTER all hooks
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleCreateGroup = () => {
    setShowCreateGroup(true);
  };

  const handleCreateGroupChat = async (groupName: string, selectedUsers: any[]) => {
    try {
      const participants = [user?.id, ...selectedUsers.map(u => u.id)];
      
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: groupName,
          participants,
          createdBy: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        const chat = {
          id: data.chat.id,
          name: data.chat.name,
          type: 'group' as const,
          participants: data.chat.participants,
          createdAt: data.chat.createdAt || data.chat.created_at || new Date().toISOString(),
          updatedAt: data.chat.updatedAt || data.chat.updated_at || new Date().toISOString()
        };
        setSelectedChat(chat);
        setShowCreateGroup(false);
        // Refresh chat list in CustomChatList if it's visible
        // The chat list will refresh when the component re-renders
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
    }
  };

  const handleAddParticipants = async (userIds: string[]) => {
    if (!selectedChat || selectedChat.type !== 'group') return;
    
    try {
      const response = await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chatId: selectedChat.id,
          userIds,
          currentUserId: user?.id
        })
      });

      if (response.ok) {
        // Refresh the chat to get updated participants
        const chatResponse = await fetch(`/api/chats?userId=${user?.id}`);
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          const updatedChat = chatData.chats.find((c: any) => c.id === selectedChat.id);
          if (updatedChat) {
            setSelectedChat(updatedChat);
          }
        }
        setShowAddPeople(false);
        setChatListRefreshTrigger(prev => prev + 1);
      } else {
        const errorData = await response.json();
        console.error('Error adding participants:', errorData);
        alert(errorData.error || 'Failed to add participants');
      }
    } catch (error) {
      console.error('Error adding participants:', error);
      alert('Failed to add participants');
    }
  };

  const handleStartDirectChat = () => {
    setShowStartDirectChat(true);
  };

  const handleSelectChat = (chat: any) => {
    setSelectedChat(chat);
    // Remove from unread map when chat is opened
    setChatsWithUnread(prev => {
      const next = new Map(prev);
      next.delete(chat.id);
      return next;
    });
  };

  // Refresh chat list when going back to the list
  const handleBackToChatList = () => {
    setSelectedChat(null);
    setChatListRefreshTrigger(prev => prev + 1);
  };

  // Add Dice-Bot as a default chat option
  const handleStartBotChat = () => {
    const botChat = {
      id: 'dice-bot',
      name: t('diceBotName'),
      type: 'bot' as const,
      participants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSelectedChat(botChat);
  };

  return (
    <>
      {/* Floating Chat Button - Always render but hide when chat is open */}
      <button
        onClick={() => {
          console.log('Chat button clicked! Current state:', { isChatOpen, selectedChat });
          setIsChatOpen(true);
          // Close menus when opening chat on mobile
          closeMenusOnChatOpen();
        }}
        className={`fixed bottom-4 right-4 z-40 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 ${
          isChatOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } ${
          unreadCount > 0 
            ? 'bg-[#fbae17] hover:bg-[#e09915]' 
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        <div className="relative w-6 h-6">
          <MessageCircle 
            className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${
              iconState === 'message' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`} 
          />
          <div 
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
              iconState === 'bot' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <img
              src="/DiceBotIconSmallWhite.svg"
              alt="Dice-Bot"
              className="w-6 h-6"
            />
          </div>
        </div>
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Chat Interface - Only render when chat is open */}
      {isChatOpen && (
        <div 
          className="bg-white shadow-xl border border-gray-200 
          fixed top-16 left-0 right-0 w-full sm:fixed sm:top-20 sm:left-auto sm:right-4 sm:w-96 sm:rounded-lg
          transform transition-transform duration-300 ease-in-out z-40 flex flex-col overflow-hidden desktop-chat-height mobile-chat-full-height"
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b sm:rounded-t-lg text-white" style={{ backgroundColor: '#fbae17' }}>
            <div className="flex items-center space-x-3">
              {selectedChat && (
                <button
                  onClick={handleBackToChatList}
                  className="text-white hover:text-gray-200"
                  title={t('backToSearch')}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              
              {selectedChat && (
                <>
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    {selectedChat.type === 'bot' ? (
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border-2 border-white">
                        <img
                          src="/DiceBotIcon.svg"
                          alt="Dice-Bot"
                          className="w-6 h-6"
                        />
                      </div>
                    ) : selectedChat.type === 'group' ? (
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: getGroupChatColor(selectedChat.id) }}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {selectedChat.participants && selectedChat.participants.length > 0 ? (
                          selectedChat.participants.find((p: any) => p.id !== user?.id)?.avatar ? (
                            <img
                              src={selectedChat.participants.find((p: any) => p.id !== user?.id)?.avatar}
                              alt={selectedChat.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            selectedChat.name.charAt(0).toUpperCase()
                          )
                        ) : (
                          selectedChat.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Username */}
                  <h3 className="font-semibold text-white">
                    {selectedChat.name}
                  </h3>
                </>
              )}
              
              {!selectedChat && (
                <h3 className="font-semibold text-white">Chat</h3>
              )}
            </div>
            
            <div className="flex items-center gap-3 relative">
              {/* Create Group Chat Button - Show when no chat is selected */}
              {!selectedChat && (
                <button
                  onClick={handleCreateGroup}
                  className="flex items-center justify-center text-white hover:text-gray-200 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                  title="Create Group Chat"
                >
                  <Users className="w-5 h-5" />
                </button>
              )}
              
              {/* Add People Button - Show when viewing a group chat */}
              {selectedChat && selectedChat.type === 'group' && (
                <button
                  onClick={() => setShowAddPeople(true)}
                  className="flex items-center justify-center text-white hover:text-gray-200 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                  title={t('addPeople')}
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
              
              {selectedChat && selectedChat.type !== 'bot' && (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(!showDropdown);
                    }}
                    className="flex items-center justify-center text-white hover:text-gray-200 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                    title={t('moreOptions')}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      {selectedChat.type === 'direct' && (
                        <>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setShowDropdown(false);
                              const otherUser = selectedChat.participants?.find((p: any) => p.id !== user?.id);
                              if (otherUser) {
                                await handleBlockUser(otherUser.id);
                              }
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Ban className="w-4 h-4" />
                            <span>Block User</span>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setShowDropdown(false);
                              const otherUser = selectedChat.participants?.find((p: any) => p.id !== user?.id);
                              if (otherUser) {
                                await handleReportUser(otherUser.id, selectedChat.id);
                              }
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Flag className="w-4 h-4" />
                            <span>Report User</span>
                          </button>
                        </>
                      )}
                      {selectedChat.type === 'group' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDropdown(false);
                              setShowViewMembers(true);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Members</span>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setShowDropdown(false);
                              await handleLeaveGroup(selectedChat.id);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-2"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Leave the group</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          await handleDeleteChat(selectedChat.id);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Chat</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => {
                  setIsChatOpen(false);
                  setSelectedChat(null);
                  setShowDropdown(false);
                }}
                className="flex items-center justify-center text-white hover:text-gray-200 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 min-h-0 overflow-hidden" style={{ height: '100%', maxHeight: '100%' }}>
            {selectedChat ? (
              selectedChat.type === 'bot' ? (
                <div className="h-full flex flex-col min-h-0 overflow-hidden" style={{ height: '100%', maxHeight: '100%' }}>
                  <ChatBot 
                    isOpen={true}
                    onClose={handleBackToChatList}
                    currentUser={user}
                    embedded={true}
                  />
                </div>
              ) : (
                <Chat 
                  chatId={selectedChat.id}
                  chatName={selectedChat.name}
                  chatType={selectedChat.type}
                  participants={selectedChat.participants}
                  onClose={handleBackToChatList}
                  onMessageSent={() => setChatListRefreshTrigger(prev => prev + 1)}
                />
              )
            ) : (
              <CustomChatList 
                onSelectChat={handleSelectChat}
                onCreateGroup={handleCreateGroup}
                onStartDirectChat={handleStartDirectChat}
                onStartBotChat={handleStartBotChat}
                user={user}
                refreshTrigger={chatListRefreshTrigger}
                chatsWithUnread={chatsWithUnread}
                setChatsWithUnread={setChatsWithUnread}
                onChatOpened={(chatId) => {
                  // Remove from unread map when chat is opened
                  setChatsWithUnread(prev => {
                    const next = new Map(prev);
                    next.delete(chatId);
                    return next;
                  });
                }}
                onStartGroupChatWithUser={(targetUser) => {
                  setInitialGroupUser(targetUser);
                  setShowCreateGroup(true);
                }}
              />
            )}
          </div>

        </div>
      )}

      {/* Auto Tooltip - appears once per session */}
      {!isChatOpen && showAutoTooltip && (
        <div className="fixed bottom-4 right-20 sm:bottom-20 sm:right-4 z-50 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm rounded-lg shadow-lg w-96 tooltip-bounce">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium mb-1 flex items-center space-x-2">
                <img
                  src="/DiceBotIconSmallWhite.svg"
                  alt="Dice-Bot"
                  className="w-4 h-4"
                />
                <span>{t('askDiceBot')}</span>
              </div>
              <div className="text-xs opacity-90 whitespace-pre-line">
                {t('askDiceBotDescription')}
              </div>
            </div>
            <button
              onClick={() => setShowAutoTooltip(false)}
              className="ml-2 text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Mobile: Arrow pointing right, Desktop: Arrow pointing up */}
          <div className="absolute bottom-1/2 -right-2 sm:bottom-auto sm:-right-2 sm:top-full sm:right-6 w-0 h-0 border-t-4 border-b-4 border-l-4 sm:border-l-4 sm:border-r-4 sm:border-t-4 border-transparent border-l-blue-600 sm:border-t-blue-600 transform translate-y-1/2 sm:translate-y-0"></div>
        </div>
      )}

      {/* Group Chat Creation Modal */}
      <GroupChatModal
        isOpen={showCreateGroup}
        onClose={() => {
          setShowCreateGroup(false);
          setInitialGroupUser(null);
        }}
        onCreateGroup={handleCreateGroupChat}
        currentUser={user}
        initialUser={initialGroupUser}
      />
      
      {/* Add People to Group Modal */}
      <GroupChatModal
        isOpen={showAddPeople}
        onClose={() => {
          setShowAddPeople(false);
        }}
        onCreateGroup={handleCreateGroupChat}
        currentUser={user}
        existingChatId={selectedChat?.id}
        existingParticipants={selectedChat?.participants || []}
        onAddParticipants={handleAddParticipants}
      />
      
      {/* View Members Modal */}
      <ViewMembersModal
        isOpen={showViewMembers}
        onClose={() => setShowViewMembers(false)}
        members={selectedChat?.participants || []}
        groupName={selectedChat?.name || 'Group'}
      />
    </>
  );
}