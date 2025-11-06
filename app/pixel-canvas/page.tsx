'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Send, Users, MessageCircle } from 'lucide-react';
import PixelCanvas from '@/components/PixelCanvas';
import LoginModal from '@/components/LoginModal';
import WeeklyCanvasSnapshot from '@/components/WeeklyCanvasSnapshot';
import BackButton from '@/components/BackButton';

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatar?: string;
    title?: string;
    isVerified?: boolean;
    isAdmin?: boolean;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: {
      id: string;
      username: string;
      avatar?: string;
      title?: string;
    };
  };
}

export default function PixelCanvasPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [rtConnected, setRtConnected] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [nextResetTime, setNextResetTime] = useState<Date | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  // Scroll to top when page loads and keep it there
  useEffect(() => {
    // Immediate scroll to top
    window.scrollTo(0, 0);
    // Also scroll after a short delay to override any other scroll behavior
    const scrollTimeout = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    const scrollTimeout2 = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 500);
    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(scrollTimeout2);
    };
  }, []);

  // Redirect to login if not authenticated (but wait for auth to load)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowLoginModal(true);
    } else if (isLoading) {
      setShowLoginModal(false); // Hide modal while loading
    }
  }, [isAuthenticated, isLoading]);

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
  };

  // Initialize chat room and socket events
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Get or create Pixel Canvas chat room
        const response = await fetch('/api/pixel-canvas/chat');
        const data = await response.json();
        
        if (data.success && data.chat) {
          const messages = data.chat.messages || [];
          
          setChatMessages(messages);
          // Don't set onlineUsers from participants - that's historical data, not current viewers
          setChatId(data.chat.id);
          
          // Mark initial load as complete after messages are loaded (longer delay to prevent scroll)
          setTimeout(() => {
            isInitialLoadRef.current = false;
          }, 2000);
          
          // Join the chat if authenticated
          if (isAuthenticated && user) {
            // Join user to chat room
            try {
              await fetch('/api/pixel-canvas/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
              });
            } catch (joinError) {
              // Silent error handling
            }
            
            // optional legacy socket join (no-op if socket server not present)
            if (socket) {
              try { socket.emit && socket.emit('join-chat', 'pixel-canvas-public'); } catch {}
            }
          }
        }
      } catch (error) {
        // Silent error handling
      }
    };

    initializeChat();
  }, [isAuthenticated, user, socket]);

  // Supabase Realtime subscription for new messages and presence tracking
  useEffect(() => {
    if (!chatId) {
      setRtConnected(false);
      return;
    }
    let channel: any;
    let active = true;
    let cleanupChannel: any = null;
    
    (async () => {
      try {
        const supabaseClient = await getSupabaseBrowserClient();
        if (!active) return;
        
        // Store channel reference for cleanup
        const channelName = `pc-chat-${chatId}`;
        
        // Try to remove any existing channel with the same name
        // (This handles React Strict Mode double-mounting in development)
        try {
          const existingChannel = supabaseClient.channel(channelName);
          await existingChannel.unsubscribe();
          await supabaseClient.removeChannel(existingChannel);
        } catch (e) {
          // Channel doesn't exist yet, that's fine
        }
        
        // Track presence for online users
        const presenceState = {
          userId: user?.id || 'anonymous',
          username: user?.username || 'Anonymous',
          joinedAt: new Date().toISOString()
        };
        
        // Use a stable presence key - use user ID if authenticated, otherwise use a session-based key
        const presenceKey = user?.id || `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        channel = supabaseClient
          .channel(channelName, {
            config: {
              broadcast: { self: false }, // Don't broadcast to self to avoid duplicates
              presence: { key: presenceKey }
            }
          })
          .on('presence', { event: 'sync' }, () => {
            if (!active) return;
            const state = channel.presenceState();
            const onlineCount = Object.keys(state).filter(key => key !== 'anonymous').length;
            setOnlineUsers(onlineCount);
          })
          .on('presence', { event: 'join' }, () => {
            if (!active) return;
            const state = channel.presenceState();
            const onlineCount = Object.keys(state).filter(key => key !== 'anonymous').length;
            setOnlineUsers(onlineCount);
          })
          .on('presence', { event: 'leave' }, () => {
            if (!active) return;
            const state = channel.presenceState();
            const onlineCount = Object.keys(state).filter(key => key !== 'anonymous').length;
            setOnlineUsers(onlineCount);
          })
          .on('postgres_changes', {
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `chatId=eq.${chatId}` 
          }, async (payload) => {
            if (!active) return;
            try {
              // Fetch sender information separately since relationship name might be wrong
              const messageData = payload.new;
              let senderData = null;
              
              // Try both camelCase and snake_case for senderId
              const senderId = messageData.senderId || messageData.sender_id;
              
              if (senderId) {
                // Fetch sender from users table - try both column naming conventions
                let sender = null;
                let senderError = null;
                
                // Try snake_case first (most common in Supabase)
                const { data: senderSnake, error: errorSnake } = await supabaseClient
                  .from('users')
                  .select('id, username, avatar, is_verified, is_admin')
                  .eq('id', senderId)
                  .single();
                
                if (!errorSnake && senderSnake) {
                  sender = senderSnake;
                } else {
                  // Try camelCase as fallback
                  const { data: senderCamel, error: errorCamel } = await supabaseClient
                    .from('users')
                    .select('id, username, avatar, isVerified, isAdmin')
                    .eq('id', senderId)
                    .single();
                  
                  if (!errorCamel && senderCamel) {
                    sender = senderCamel;
                  } else {
                    senderError = errorCamel || errorSnake;
                  }
                }
                
                if (!senderError && sender) {
                  senderData = sender;
                }
              }
              
              // Use message data from Realtime payload
              // If sender data wasn't fetched, use current user info as fallback
              const newMessage: ChatMessage = {
                id: messageData.id,
                content: messageData.content,
                createdAt: messageData.createdAt || messageData.created_at,
                sender: senderData ? {
                  id: senderData.id,
                  username: senderData.username,
                  avatar: senderData.avatar,
                  title: (('isAdmin' in senderData && senderData.isAdmin) || ('is_admin' in senderData && senderData.is_admin)) ? 'Admin' : (('isVerified' in senderData && senderData.isVerified) || ('is_verified' in senderData && senderData.is_verified)) ? 'Verified' : undefined,
                  isVerified: ('isVerified' in senderData && senderData.isVerified !== undefined) ? senderData.isVerified : ('is_verified' in senderData && senderData.is_verified !== undefined) ? senderData.is_verified : false,
                  isAdmin: ('isAdmin' in senderData && senderData.isAdmin !== undefined) ? senderData.isAdmin : ('is_admin' in senderData && senderData.is_admin !== undefined) ? senderData.is_admin : false
                } : (user && senderId === user.id) ? {
                  // Fallback to current user if it's their own message
                  id: user.id,
                  username: user.username,
                  avatar: user.avatar || '',
                  isVerified: user.isVerified || false,
                  isAdmin: user.isAdmin || false
                } : {
                  id: senderId || 'unknown',
                  username: 'Unknown',
                  avatar: '',
                  isVerified: false,
                  isAdmin: false
                }
              };
              
              setChatMessages(prev => {
                // Check if message already exists to avoid duplicates
                if (prev.some(msg => msg.id === newMessage.id)) {
                  return prev;
                }
                const updated = [...prev, newMessage];
                // Auto-scroll to bottom after state update (only after initial load)
                if (!isInitialLoadRef.current) {
                  setTimeout(() => {
                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
                return updated;
              });
            } catch (err) {
              // Silent error handling
            }
          })
          .subscribe(async (status) => {
            if (active) {
              setRtConnected(status === 'SUBSCRIBED');
              
              // Track presence once subscribed
              if (status === 'SUBSCRIBED') {
                try {
                  await channel.track(presenceState);
                  
                  // Get initial presence count after a brief delay to allow sync
                  setTimeout(() => {
                    if (!active) return;
                    const state = channel.presenceState();
                    const onlineCount = Object.keys(state).filter(key => key !== 'anonymous').length;
                    setOnlineUsers(onlineCount);
                  }, 500);
                } catch (presenceError) {
                  // Silent error handling
                }
              }
            }
          });
      } catch (err) {
        if (active) {
          setRtConnected(false);
        }
      }
    })();
    
    return () => { 
      active = false;
      if (channel) {
        (async () => {
          try {
            // Untrack presence before leaving
            await channel.untrack();
            
            // Unsubscribe from channel
            await channel.unsubscribe();
            
            const supabaseClient = await getSupabaseBrowserClient();
            await supabaseClient.removeChannel(channel);
            
            // Reset count to 0 when cleaning up
            setOnlineUsers(0);
          } catch (err) {
            // Silent error handling
          }
        })();
      } else {
        // Reset count if no channel exists
        setOnlineUsers(0);
      }
    };
  }, [chatId, user?.id]); // Only re-run if chatId or user.id changes

  // Handle page visibility to track when user leaves
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!chatId || !user) return;
      
      const supabaseClient = await getSupabaseBrowserClient();
      const channel = supabaseClient.channel(`pc-chat-${chatId}`);
      
      // Page visibility change - presence will automatically sync
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [chatId, user]);

  // Socket event listeners (legacy - kept for compatibility but presence is primary)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    };

    const handleMessageSent = (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    };

    const handleUserTyping = (data: { userId: string; username: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingUsers(prev => [...prev.filter(u => u !== data.username), data.username]);
      } else {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }
    };

    // Legacy socket handlers - presence tracking is now primary
    // These are kept for backward compatibility but won't override presence count
    const handleOnlineUsers = (users: any[]) => {
      // Only update if presence hasn't been set yet (fallback)
      // setOnlineUsers(users.length);
    };

    const handleUserStatus = (data: { userId: string; isOnline: boolean; user: any }) => {
      // Presence tracking handles this now
      // if (data.isOnline) {
      //   setOnlineUsers(prev => prev + 1);
      // } else {
      //   setOnlineUsers(prev => Math.max(0, prev - 1));
      // }
    };

    const handleChatUserCount = (data: { chatId: string; userCount: number }) => {
      // Presence tracking handles this now
      // if (data.chatId === 'pixel-canvas-public') {
      //   setOnlineUsers(data.userCount);
      // }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-sent', handleMessageSent);
    socket.on('user-typing', handleUserTyping);
    socket.on('online-users', handleOnlineUsers);
    socket.on('user-status', handleUserStatus);
    socket.on('chat-user-count', handleChatUserCount);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-sent', handleMessageSent);
      socket.off('user-typing', handleUserTyping);
      socket.off('online-users', handleOnlineUsers);
      socket.off('user-status', handleUserStatus);
      socket.off('chat-user-count', handleChatUserCount);
    };
  }, [socket]);

  // Auto-scroll chat to bottom (only after initial load)
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Calculate and set next reset time (midnight UTC)
  useEffect(() => {
    const calculateNextReset = () => {
      const now = new Date();
      
      // Get next midnight UTC
      const nextMidnightUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1, // Tomorrow
        0, 0, 0, 0 // 00:00:00
      ));
      
      setNextResetTime(nextMidnightUTC);
    };
    
    calculateNextReset();
    // Recalculate every minute to keep it accurate
    const interval = setInterval(calculateNextReset, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatResetTime = (utcDate: Date | null) => {
    if (!utcDate) return 'Calculating...';
    
    // Convert UTC time to user's local timezone
    const localTime = utcDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Get timezone offset (getTimezoneOffset returns minutes, positive for timezones behind UTC)
    const offsetMinutes = utcDate.getTimezoneOffset();
    const offsetHours = -offsetMinutes / 60; // Negate to get correct sign (UTC-6 means 6 hours behind)
    const timezoneLabel = offsetHours >= 0 
      ? `UTC+${offsetHours}` 
      : `UTC${offsetHours}`;
    
    return `${localTime} ${timezoneLabel}`;
  };

  // Check for daily reset and set up midnight reset timer
  useEffect(() => {
    // Check if it's midnight UTC (when server resets)
    const checkForReset = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      
      // If it's midnight UTC (00:00), trigger a chat refresh
      if (utcHours === 0 && utcMinutes === 0) {
        // Clear local messages and refetch
        setChatMessages([]);
        
        // Refetch chat data
        setTimeout(async () => {
          try {
            const response = await fetch('/api/pixel-canvas/chat');
            const data = await response.json();
            if (data.success && data.chat) {
              setChatMessages(data.chat.messages || []);
            }
          } catch (error) {
            // Silent error handling for chat refresh
          }
        }, 1000); // Wait 1 second after midnight UTC
      }
    };

    // Check every minute
    const resetTimer = setInterval(checkForReset, 60000);

    return () => clearInterval(resetTimer);
  }, []);

  const handleSendMessage = async () => {
    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }

    if (newMessage.trim() && chatId) {
      const messageContent = newMessage.trim();
      setNewMessage('');
      setIsTyping(false);
      
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, senderId: user.id, content: messageContent, type: 'text' })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          // Restore message on error
          setNewMessage(messageContent);
        } else {
          // Add message to local state immediately (optimistic update)
          if (data.message) {
            const sentMessage: ChatMessage = {
              id: data.message.id,
              content: data.message.content,
              createdAt: data.message.createdAt || data.message.created_at,
              sender: data.message.sender ? {
                id: data.message.sender.id,
                username: data.message.sender.username,
                avatar: data.message.sender.avatar || '',
                title: data.message.sender.isAdmin ? 'Admin' : data.message.sender.isVerified ? 'Verified' : undefined,
                isVerified: data.message.sender.isVerified || false,
                isAdmin: data.message.sender.isAdmin || false
              } : {
                // Fallback to current user if sender info not provided
                id: user.id,
                username: user.username,
                avatar: user.avatar || '',
                isVerified: user.isVerified || false,
                isAdmin: user.isAdmin || false
              }
            };
            
            setChatMessages(prev => {
              // Check if message already exists to avoid duplicates
              if (prev.some(msg => msg.id === sentMessage.id)) {
                return prev;
              }
              const updated = [...prev, sentMessage];
              // Auto-scroll to bottom after state update (only after initial load)
              if (!isInitialLoadRef.current) {
                setTimeout(() => {
                  chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
              return updated;
            });
          }
        }
      } catch (error) {
        // Restore message on error
        setNewMessage(messageContent);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isAuthenticated || !user) return;

    // Start typing indicator
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
    }

    // Stop typing indicator if message is empty
    if (isTyping && e.target.value.length === 0) {
      setIsTyping(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Invalid date';
    
    // Parse the date string - Supabase stores timestamps in UTC
    let date: Date;
    
    // Check if the string has timezone info
    const hasTimezone = dateString.includes('Z') || dateString.includes('+') || 
                       (dateString.includes('-') && dateString.match(/[+-]\d{2}:\d{2}$/));
    
    if (!hasTimezone && dateString.includes('T')) {
      // No timezone info but has 'T' separator - assume UTC from database
      // Append 'Z' to indicate UTC
      date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // toLocaleTimeString automatically converts from UTC to local timezone
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true // Use 12-hour format (2:47 PM instead of 14:47)
    });
  };

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <BackButton />
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Pixel Canvas</h1>
              <p className="text-lg text-gray-600">Create pixel art with the community</p>
            </div>
          </div>
        </div>

        {/* Canvas Component */}
        <PixelCanvas width={200} height={200} pixelSize={7} />

        {/* Two Column Section */}
        <div className="mt-8 flex flex-col lg:flex-row gap-6">
          {/* Left Column - Weekly Canvas Snapshot */}
          <div className="flex-1">
            <WeeklyCanvasSnapshot />
          </div>
          
          {/* Right Column - Live Chat */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 h-[700px] flex flex-col">
              <div className="mb-4">
                {/* Title - First Line */}
                <h2 className="text-xl font-semibold text-gray-900 text-center mb-3">Live Chat</h2>
                
                {/* Stats - Second Line */}
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 flex-wrap gap-2">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{onlineUsers} online</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <span>🕐</span>
                    <span>Resets at midnight</span>
                  </div>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {!isAuthenticated ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Join the conversation!</p>
                      <p className="text-sm">Please log in to see messages and chat with other pixel artists.</p>
                    </div>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">No messages yet</p>
                      <p className="text-sm">Be the first to start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((message) => (
                      <div key={message.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex-shrink-0">
                          {message.sender.avatar ? (
                            <img 
                              src={message.sender.avatar} 
                              alt={`${message.sender.username}'s dice`}
                              className="w-12 h-12 object-cover rounded-full"
                              onError={(e) => {
                                // Fallback to initials if image fails to load
                                const target = e.currentTarget as HTMLImageElement;
                                const fallback = target.nextElementSibling as HTMLElement;
                                target.style.display = 'none';
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-medium"
                            style={{ display: message.sender.avatar ? 'none' : 'flex' }}
                          >
                            {message.sender.username.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {message.sender.username}
                            </span>
                            {message.sender.title && (
                              <span className="text-sm text-gray-500">
                                {message.sender.title}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 font-medium">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                          {message.replyTo && (
                            <div className="bg-gray-100 border-l-4 border-gray-300 pl-3 py-2 mb-2 text-sm rounded">
                              <span className="font-medium text-gray-600">{message.replyTo.sender.username}:</span>
                              <span className="text-gray-600"> {message.replyTo.content}</span>
                            </div>
                          )}
                          <p className="text-gray-800 leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Typing indicators */}
                    {typingUsers.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 italic">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
                      </div>
                    )}
                    
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>
              
              {/* Chat Input */}
              <div className="border-t pt-4">
                {isAuthenticated ? (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleTyping}
                      onKeyPress={handleKeyPress}
                      placeholder={rtConnected ? "Type your message..." : "Connecting..."}
                      disabled={!rtConnected}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !rtConnected}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm mb-2">Please log in to participate in the chat</p>
                    <button 
                      onClick={() => setShowLoginModal(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Sign In
                    </button>
                  </div>
                )}
                
                {isAuthenticated && !rtConnected && (
                  <p className="text-xs text-red-500 mt-2">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                    Chat is currently disconnected
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
}
