'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Plus, Search, Users, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './Toast';

interface Chat {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: any[];
  lastMessage?: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    sender: {
      id: string;
      username: string;
      avatar: string;
    };
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: any;
}

interface ChatListProps {
  onSelectChat: (chat: Chat) => void;
  onCreateGroup: () => void;
  onStartDirectChat: () => void;
}

export default function ChatList({ onSelectChat, onCreateGroup, onStartDirectChat }: ChatListProps) {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadChats();
    }
  }, [user?.id]);

  const loadChats = async () => {
    try {
      const response = await fetch(`/api/chats?userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats);
      } else {
        showToast('Failed to load chats', 'error');
      }
    } catch (error) {
      console.error('Error loading chats:', error);
      showToast('Failed to load chats', 'error');
    } finally {
      setLoading(false);
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

  const getOtherParticipant = (chat: Chat) => {
    if (chat.type === 'direct') {
      return chat.participants.find(p => p.id !== user?.id);
    }
    return null;
  };

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chat.type === 'direct' && getOtherParticipant(chat)?.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="w-80 bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <div className="flex space-x-2">
              <button
                onClick={onStartDirectChat}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Start Direct Chat"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={onCreateGroup}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Create Group Chat"
              >
                <Users className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="overflow-y-auto max-h-96">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Start a conversation with someone!
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const otherParticipant = getOtherParticipant(chat);
              const displayName = chat.type === 'direct' ? 
                otherParticipant?.username || 'Unknown User' : 
                chat.name;
              
              const displayAvatar = chat.type === 'direct' ? 
                otherParticipant?.avatar : 
                null;

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {displayAvatar ? (
                        <img
                          src={displayAvatar}
                          alt={displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {displayName}
                        </h3>
                        {chat.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatTime(chat.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {chat.type === 'group' && (
                          <Users className="w-3 h-3 text-gray-400" />
                        )}
                        <p className="text-sm text-gray-500 truncate">
                          {chat.lastMessage ? (
                            <>
                              <span className="font-medium">
                                {chat.lastMessage.sender.username}:
                              </span>{' '}
                              {chat.lastMessage.content}
                            </>
                          ) : (
                            'No messages yet'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ToastContainer />
    </>
  );
}
