'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Users, Search, Plus, Bot, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatState } from '@/contexts/ChatStateContext';
import ChatList from './ChatList';
import Chat from './Chat';
import ChatBot from './ChatBot';
import GroupChatModal from './GroupChatModal';

// Custom User Search Component
function CustomChatList({ 
  onSelectChat, 
  onCreateGroup, 
  onStartDirectChat, 
  onStartBotChat,
  user
}: {
  onSelectChat: (chat: any) => void;
  onCreateGroup: () => void;
  onStartDirectChat: () => void;
  onStartBotChat: () => void;
  user: any;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [existingChats, setExistingChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  // Fetch existing chats
  const fetchExistingChats = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/chats?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setExistingChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  // Load existing chats on mount
  useEffect(() => {
    fetchExistingChats();
  }, [user?.id]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
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
          createdAt: data.chat.createdAt || new Date().toISOString(),
          updatedAt: data.chat.updatedAt || new Date().toISOString()
        };
        onSelectChat(chat);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  // Create a group with a user
  const createGroupWithUser = async (targetUser: any) => {
    const groupName = prompt(`Enter group name (with ${targetUser.username}):`);
    if (!groupName?.trim()) return;

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: groupName.trim(),
          participants: [user?.id, targetUser.id],
          createdBy: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Create chat object for our interface
        const chat = {
          id: data.chat.id,
          name: data.chat.name,
          type: 'group',
          participants: data.chat.participants
        };
        onSelectChat(chat);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="h-[452px] flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search for users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
            {/* Create Group Button */}
            <div className="p-4 border-b border-gray-100">
              <button
                onClick={onCreateGroup}
                className="w-full flex items-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500 text-white">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-semibold text-blue-900">
                    Create Group Chat
                  </h3>
                  <p className="text-sm text-blue-700">
                    Start a group conversation
                  </p>
                </div>
                <Plus className="w-5 h-5 text-blue-600" />
              </button>
            </div>

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
                    Dice-Bot
                  </h3>
                  <p className="text-sm text-gray-500">
                    AI Assistant - Always available
                  </p>
                </div>
              </div>
            </div>

        {/* Existing Chats */}
        {!hasSearched && existingChats.length > 0 && (
          <div className="border-b border-gray-100">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Recent Chats
            </div>
            {existingChats.slice(0, 5).map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                    {chat.type === 'group' ? (
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
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
                          {chat.participants?.length || 0} members
                        </span>
                      )}
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">
                          {chat.lastMessage.sender.username}: {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User Search Results */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : !hasSearched ? (
          <div className="p-8 text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Search for users to start chatting</p>
            <p className="text-xs text-gray-400 mt-1">
              Type a username to find people
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No users found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try a different search term
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
                      <span className="text-xs text-blue-500">✓ Verified</span>
                    )}
                    {foundUser.isAdmin && (
                      <span className="text-xs text-red-500">Admin</span>
                    )}
                    <p className="text-sm text-gray-500">
                      Click to start chat
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    createGroupWithUser(foundUser);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Create group with this user"
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
  const { isChatOpen, setIsChatOpen, selectedChat, setSelectedChat } = useChatState();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStartDirectChat, setShowStartDirectChat] = useState(false);
  const [showAutoTooltip, setShowAutoTooltip] = useState(false);
  const [iconState, setIconState] = useState<'message' | 'bot'>('message');
  const [hasShownTooltip, setHasShownTooltip] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);

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

  // Fetch unread messages count - ALWAYS call this hook
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const fetchUnreadCount = async () => {
        try {
          const response = await fetch(`/api/messages/unread?userId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            const newUnreadCount = data.unreadCount || 0;
            
            // Play sound if unread count increased
            if (newUnreadCount > previousUnreadCount && previousUnreadCount >= 0) {
              playMessageSound();
            }
            
            setPreviousUnreadCount(unreadCount);
            setUnreadCount(newUnreadCount);
          }
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };

      fetchUnreadCount();
      
      // Refresh unread count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.id, unreadCount, previousUnreadCount]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0);
    }
  }, [isChatOpen]);

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
          createdAt: data.chat.createdAt,
          updatedAt: data.chat.updatedAt
        };
        setSelectedChat(chat);
        setShowCreateGroup(false);
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
    }
  };

  const handleStartDirectChat = () => {
    setShowStartDirectChat(true);
  };

  const handleSelectChat = (chat: any) => {
    setSelectedChat(chat);
  };

  // Add Dice-Bot as a default chat option
  const handleStartBotChat = () => {
    const botChat = {
      id: 'dice-bot',
      name: 'Dice-Bot',
      type: 'bot' as const,
      participants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSelectedChat(botChat);
  };

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

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-4 sm:right-4" style={{ position: 'fixed', bottom: '1rem', right: '1rem' }}>
        {!isChatOpen ? (
          <div className="relative">
            <button
              onClick={() => setIsChatOpen(true)}
              className={`relative text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 ${
                unreadCount > 0 
                  ? 'bg-[#fbae17] hover:bg-[#e09915]' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              <div className="relative">
                <MessageCircle 
                  className={`w-6 h-6 transition-all duration-300 ${
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
            
            {/* Auto Tooltip - appears once per session */}
            {showAutoTooltip && (
              <div className="absolute bottom-full right-0 mb-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm rounded-lg shadow-lg w-80 tooltip-bounce">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium mb-1 flex items-center space-x-2">
                      <img
                        src="/DiceBotIconSmallWhite.svg"
                        alt="Dice-Bot"
                        className="w-4 h-4"
                      />
                      <span>Ask Dice-Bot!</span>
                    </div>
                    <div className="text-xs opacity-90">
                      Get instant help with board game rules, recommendations, and strategies
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAutoTooltip(false)}
                    className="ml-2 text-white hover:text-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600"></div>
              </div>
            )}
          </div>
                ) : (
                  <div className="bg-white shadow-xl border border-gray-200 
                    fixed inset-4 sm:relative sm:inset-auto sm:w-96 sm:h-[500px] sm:rounded-lg
                    rounded-lg h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] sm:max-w-none">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b rounded-t-lg text-white" style={{ backgroundColor: '#fbae17' }}>
              <div className="flex items-center space-x-3">
                {selectedChat && (
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="text-white hover:text-gray-200"
                    title="Back to search"
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
              
              <button
                onClick={() => {
                  setIsChatOpen(false);
                  setSelectedChat(null);
                }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 h-[calc(100%-4rem)] sm:h-[452px]">
              {selectedChat ? (
                selectedChat.type === 'bot' ? (
                  <div className="h-full">
                    <ChatBot 
                      isOpen={true}
                      onClose={() => setSelectedChat(null)}
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
                    onClose={() => setSelectedChat(null)}
                  />
                )
              ) : (
                <CustomChatList 
                  onSelectChat={handleSelectChat}
                  onCreateGroup={handleCreateGroup}
                  onStartDirectChat={handleStartDirectChat}
                  onStartBotChat={handleStartBotChat}
                  user={user}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Group Chat Creation Modal */}
      <GroupChatModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={handleCreateGroupChat}
        currentUser={user}
      />
    </>
  );
}
