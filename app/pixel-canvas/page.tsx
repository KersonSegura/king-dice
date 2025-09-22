'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
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
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

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
          setChatMessages(data.chat.messages || []);
          setOnlineUsers(data.chat.participants?.length || 0);
          
          // Join the chat if authenticated
          if (isAuthenticated && user && socket) {
            // Join user to chat room
            await fetch('/api/pixel-canvas/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id })
            });
            
            // Join socket room
            socket.emit('join-chat', 'pixel-canvas-public');
          }
        }
      } catch (error) {
        console.error('Error initializing Pixel Canvas chat:', error);
      }
    };

    initializeChat();
  }, [isAuthenticated, user, socket]);

  // Socket event listeners
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

    const handleOnlineUsers = (users: any[]) => {
      setOnlineUsers(users.length);
    };

    const handleUserStatus = (data: { userId: string; isOnline: boolean; user: any }) => {
      if (data.isOnline) {
        setOnlineUsers(prev => prev + 1);
      } else {
        setOnlineUsers(prev => Math.max(0, prev - 1));
      }
    };

    const handleChatUserCount = (data: { chatId: string; userCount: number }) => {
      if (data.chatId === 'pixel-canvas-public') {
        setOnlineUsers(data.userCount);
      }
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

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Check for daily reset and set up midnight reset timer
  useEffect(() => {
    // Set up a timer to check for midnight reset
    const checkForReset = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // If it's midnight (00:00), trigger a chat refresh
      if (hours === 0 && minutes === 0) {
        console.log('🕐 Midnight detected - refreshing Pixel Canvas chat messages');
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
            console.error('Error refreshing Pixel Canvas chat after reset:', error);
          }
        }, 1000); // Wait 1 second after midnight
      }
    };

    // Check every minute
    const resetTimer = setInterval(checkForReset, 60000);

    return () => clearInterval(resetTimer);
  }, []);

  const handleSendMessage = () => {
    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }

    if (!socket || !isConnected) {
      alert('Chat is not connected. Please try again.');
      return;
    }

    if (newMessage.trim()) {
      socket.emit('send-message', {
        chatId: 'pixel-canvas-public',
        content: newMessage.trim(),
        senderId: user.id,
        type: 'text'
      });
      setNewMessage('');
      
      // Stop typing indicator
      if (isTyping) {
        socket.emit('typing-stop', {
          chatId: 'pixel-canvas-public',
          userId: user.id
        });
        setIsTyping(false);
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
    
    if (!isAuthenticated || !user || !socket) return;

    // Start typing indicator
    if (!isTyping && e.target.value.length > 0) {
      socket.emit('typing-start', {
        chatId: 'pixel-canvas-public',
        userId: user.id,
        username: user.username
      });
      setIsTyping(true);
    }

    // Stop typing indicator if message is empty
    if (isTyping && e.target.value.length === 0) {
      socket.emit('typing-stop', {
        chatId: 'pixel-canvas-public',
        userId: user.id
      });
      setIsTyping(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Live Chat</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{onlineUsers} online</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{chatMessages.length} messages</span>
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
                      placeholder={isConnected ? "Type your message..." : "Connecting..."}
                      disabled={!isConnected}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !isConnected}
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
                
                {isAuthenticated && !isConnected && (
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
