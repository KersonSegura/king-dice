'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, MoreVertical, Users, X } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import EmojiPicker from './EmojiPicker';
import ChatBot from './ChatBot';
import { useToast } from './Toast';

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    username: string;
    avatar: string;
    isVerified: boolean;
    isAdmin: boolean;
  };
  type: string;
  replyToId?: string;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      username: string;
      avatar: string;
    };
  };
  createdAt: string;
}

interface ChatProps {
  chatId: string;
  chatName: string;
  chatType: 'direct' | 'group' | 'bot';
  participants: any[];
  onClose: () => void;
  onMessageSent?: () => void; // Callback to refresh chat list
}

export default function Chat({ chatId, chatName, chatType, participants, onClose, onMessageSent }: ChatProps) {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();

  // If it's a bot chat, render the ChatBot component
  if (chatType === 'bot') {
    return (
      <div className="h-96 bg-white rounded-lg shadow-lg">
        <ChatBot
          isOpen={true}
          onClose={onClose}
          currentUser={user}
        />
      </div>
    );
  }

  // TypeScript assertion: after the bot check, chatType can only be 'direct' | 'group'
  const regularChatType = chatType as 'direct' | 'group';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helpers for game mentions (@GameName -> link to /game/:id)
  const GAME_MENTION_REGEX = /@([A-Za-z0-9][A-Za-z0-9 \-\']{0,50})/g;

  const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');

  const resolveGameMentions = async (text: string): Promise<string> => {
    // Find unique mentions
    const matches = Array.from(text.matchAll(GAME_MENTION_REGEX)).map(m => m[1].trim());
    const uniqueNames = Array.from(new Set(matches)).filter(Boolean);

    if (uniqueNames.length === 0) return text;

    let resolvedText = text;

    for (const name of uniqueNames) {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(name)}&type=games&limit=1`);
        if (!response.ok) continue;
        const data = await response.json();
        const game = (data.games || [])[0];
        if (game?.id) {
          // Replace all occurrences of the mention with a markdown-style link
          const mentionPattern = new RegExp(`@${escapeRegExp(name)}`, 'g');
          resolvedText = resolvedText.replace(
            mentionPattern,
            `[@${name}](/game/${game.id})`
          );
        }
      } catch (error) {
        console.error('Error resolving game mention:', name, error);
      }
    }

    return resolvedText;
  };

  const renderContent = (content: string) => {
    const parts: React.ReactNode[] = [];
    const linkRegex = /\[([^\]]+)\]\((\/game\/[^\)]+)\)/g;
    let lastIndex = 0;
    let match;

    // Convert markdown links to anchor tags, keep other text as-is
    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      parts.push(
        <a
          key={`${match[2]}-${match.index}`}
          href={match[2]}
          className="underline text-blue-600 hover:text-blue-700 break-words"
          target="_blank"
          rel="noreferrer"
        >
          {match[1]}
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts;
  };

  // Load messages and mark as read
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/messages?chatId=${chatId}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
          
          // Mark messages as read when chat is opened
          if (user?.id) {
            try {
              await fetch('/api/messages/unread', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, chatId })
              });
            } catch (readError) {
              console.error('Error marking messages as read:', readError);
              // Don't show error to user - this is not critical
            }
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        showToast('Failed to load messages', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [chatId, showToast, user?.id]);

  // Real-time message updates using Supabase
  useEffect(() => {
    if (!chatId || !user?.id) return;

    let channel: any;
    let active = true;

    (async () => {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase-browser');
      const supabaseClient = await getSupabaseBrowserClient();

      // Subscribe to new messages in this chat
      channel = supabaseClient
        .channel(`chat-messages-${chatId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chatId=eq.${chatId}`
        }, async (payload) => {
          if (!active) return;
          
          const newMessage: any = payload.new;
          const messageChatId = newMessage.chatId || newMessage.chat_id;
          const messageSenderId = newMessage.senderId || newMessage.sender_id;

          // Only add if it's not from current user (current user's messages are handled optimistically)
          // or if it's a different message than what we already have
          if (messageChatId === chatId) {
            // Check if message already exists (avoid duplicates)
            // Also check for optimistic messages with same content from same sender
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMessage.id);
              if (exists) return prev;
              
              // Check if there's an optimistic message with same content that we should replace
              const optimisticIndex = prev.findIndex(m => 
                m.id.startsWith('temp-') && 
                m.senderId === messageSenderId && 
                m.content === newMessage.content &&
                Math.abs(new Date(m.createdAt).getTime() - new Date(newMessage.createdAt || newMessage.created_at).getTime()) < 5000
              );
              
              if (optimisticIndex !== -1) {
                // Replace optimistic message in place
                const updated = [...prev];
                const fullMessage: Message = {
                  id: newMessage.id,
                  chatId: messageChatId,
                  senderId: messageSenderId,
                  content: newMessage.content,
                  type: newMessage.type || 'text',
                  replyToId: newMessage.replyToId || newMessage.reply_to_id,
                  createdAt: newMessage.createdAt || newMessage.created_at,
                  sender: newMessage.sender || {
                    id: messageSenderId,
                    username: 'Unknown',
                    avatar: '',
                    isVerified: false,
                    isAdmin: false
                  },
                  replyTo: undefined
                };
                updated[optimisticIndex] = fullMessage;
                return updated;
              }
              
              // Fetch sender info if not included
              if (!newMessage.sender && messageSenderId) {
                // Fetch sender info
                (async () => {
                  try {
                    const { data: senderData } = await supabaseClient
                      .from('users')
                      .select('id, username, avatar, isVerified, isAdmin')
                      .eq('id', messageSenderId)
                      .single();

                    if (senderData) {
                      const fullMessage: Message = {
                        id: newMessage.id,
                        chatId: messageChatId,
                        senderId: messageSenderId,
                        content: newMessage.content,
                        type: newMessage.type || 'text',
                        replyToId: newMessage.replyToId || newMessage.reply_to_id,
                        createdAt: newMessage.createdAt || newMessage.created_at,
                        sender: {
                          id: senderData.id,
                          username: senderData.username,
                          avatar: senderData.avatar || '',
                          isVerified: senderData.isVerified || senderData.is_verified || false,
                          isAdmin: senderData.isAdmin || senderData.is_admin || false
                        },
                        replyTo: undefined
                      };
                      
                      setMessages(prevMsgs => {
                        const alreadyExists = prevMsgs.some(m => m.id === fullMessage.id);
                        if (alreadyExists) return prevMsgs;
                        return [...prevMsgs, fullMessage];
                      });
                    }
                  } catch (error) {
                    console.error('Error fetching sender info:', error);
                  }
                })();
                
                return prev;
              }
              
              // If sender info is already in the payload, use it
              const fullMessage: Message = {
                id: newMessage.id,
                chatId: messageChatId,
                senderId: messageSenderId,
                content: newMessage.content,
                type: newMessage.type || 'text',
                replyToId: newMessage.replyToId || newMessage.reply_to_id,
                createdAt: newMessage.createdAt || newMessage.created_at,
                sender: newMessage.sender || {
                  id: messageSenderId,
                  username: 'Unknown',
                  avatar: '',
                  isVerified: false,
                  isAdmin: false
                },
                replyTo: undefined
              };
              
              return [...prev, fullMessage];
            });

            // Mark as read if chat is open and message is from another user
            if (messageSenderId !== user.id) {
              try {
                await fetch('/api/messages/unread', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id, chatId })
                });
                
                // Notify parent to update unread count
                if (onMessageSent) {
                  onMessageSent();
                }
              } catch (error) {
                // Silent fail - not critical
              }
            }
          }
        })
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) {
        (async () => {
          const { getSupabaseBrowserClient } = await import('@/lib/supabase-browser');
          const supabase = await getSupabaseBrowserClient();
          supabase.removeChannel(channel);
        })();
      }
    };
  }, [chatId, user?.id]);

  // Auto-scroll to bottom - immediately when messages load, smooth for new messages
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Scroll immediately on initial load, smooth for subsequent updates
      messagesEndRef.current.scrollIntoView({ behavior: isInitialLoad ? 'auto' : 'smooth' });
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [messages, isInitialLoad]);
  
  // Reset initial load flag when chat changes
  useEffect(() => {
    setIsInitialLoad(true);
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    // Store the message content before clearing
    const messageContent = newMessage.trim();
    
    // Clear input immediately for better UX
    setNewMessage('');
    setReplyingTo(null);

    // Resolve @GameName mentions to links
    const resolvedContent = await resolveGameMentions(messageContent);

    const messageData = {
      chatId,
      senderId: user.id,
      content: resolvedContent,
      type: 'text',
      replyToId: replyingTo?.id
    };

    // Create optimistic message for immediate display
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      chatId,
      senderId: user.id,
      content: resolvedContent,
      type: 'text',
      replyToId: replyingTo?.id,
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        username: user.username || 'You',
        avatar: user.avatar || '',
        isVerified: user.isVerified || false,
        isAdmin: user.isAdmin || false
      },
      replyTo: replyingTo || undefined
    };

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage]);

    // Scroll to bottom immediately
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      // Save message via API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update optimistic message in place to avoid flicker
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === optimisticMessage.id);
          if (index !== -1) {
            // Replace optimistic message with real message in place
            const updated = [...prev];
            updated[index] = data.message;
            return updated;
          }
          // If optimistic message not found, just add the real one (shouldn't happen)
          const exists = prev.some(m => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        
        // Notify parent to refresh chat list
        if (onMessageSent) {
          onMessageSent();
        }
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        const errorData = await response.json().catch(() => ({}));
        showToast(errorData.error || 'Failed to send message', 'error');
        // Restore message to input
        setNewMessage(messageContent);
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
      // Restore message to input
      setNewMessage(messageContent);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (socket && isConnected) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing start
      socket.emit('typing-start', {
        chatId,
        userId: user?.id,
        username: user?.username
      });

      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing-stop', { chatId, userId: user?.id });
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOtherParticipant = () => {
    if (chatType === 'direct') {
      return participants.find(p => p.id !== user?.id);
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'} items-end space-x-2`}
            >
             {/* Avatar for other users */}
             {message.senderId !== user?.id && (
               <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden">
                 {message.sender.username === 'Dice-Bot' ? (
                   <div className="w-full h-full bg-white flex items-center justify-center">
                     <img
                       src="/DiceBotIcon.svg"
                       alt="Dice-Bot"
                       className="w-full h-full object-cover"
                     />
                   </div>
                 ) : (
                   <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                     {message.sender.avatar ? (
                       <img
                         src={message.sender.avatar}
                         alt={message.sender.username}
                         className="w-full h-full object-cover"
                       />
                     ) : (
                       message.sender.username.charAt(0).toUpperCase()
                     )}
                   </div>
                 )}
               </div>
             )}
              
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderId === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {message.replyTo && (
                  <div className={`text-xs mb-1 p-2 rounded ${
                    message.senderId === user?.id ? 'bg-blue-400' : 'bg-gray-200'
                  }`}>
                    <div className="font-semibold">Replying to {message.replyTo.sender.username}</div>
                    <div className="truncate">{message.replyTo.content}</div>
                  </div>
                )}
                <div className="text-sm break-words">{renderContent(message.content)}</div>
                <div className={`text-xs mt-1 ${
                  message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTime(message.createdAt)}
                </div>
              </div>

             {/* Avatar for current user */}
             {message.senderId === user?.id && (
               <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden">
                 <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-semibold text-sm">
                   {user.avatar ? (
                     <img
                       src={user.avatar}
                       alt={user.username}
                       className="w-full h-full object-cover"
                     />
                   ) : (
                     user.username.charAt(0).toUpperCase()
                   )}
                 </div>
               </div>
             )}
            </div>
          ))}
          
          {/* Typing indicator */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm">
                {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Replying to {replyingTo.sender.username}: {replyingTo.content}
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={false}
            />
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)}
      />

      <ToastContainer />
    </>
  );
}
