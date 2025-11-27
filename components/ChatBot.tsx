'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Loader2 } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  embedded?: boolean; // New prop to hide header when embedded
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose, currentUser, embedded = false }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    isBot: boolean;
    timestamp: Date;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = useSocket();

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change, but only if user hasn't manually scrolled up
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  // Load previous bot messages from localStorage on open
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      const storageKey = `dicebot-messages-${currentUser.id}`;
      const savedMessages = localStorage.getItem(storageKey);
      
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
          console.log('Loaded', messagesWithDates.length, 'previous bot messages');
          
          // Scroll to bottom after messages are loaded
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        } catch (error) {
          console.error('Error loading bot messages:', error);
          // Add welcome message if loading fails
          setMessages([{
            id: 'welcome',
            text: "Hello! I'm Dice-Bot! 🎲 Your AI assistant 🤖\n\nI'm here to help with board games and King Dice related questions.\n\nWhat can I help you with today?",
            isBot: true,
            timestamp: new Date()
          }]);
        }
      } else {
        // Add welcome message for new users
        setMessages([{
          id: 'welcome',
          text: "Hello! I'm Dice-Bot! 🎲 Your AI assistant 🤖\n\nI'm here to help with board games and King Dice related questions.\n\nWhat can I help you with today?",
          isBot: true,
          timestamp: new Date()
        }]);
      }
    } else if (isOpen && !currentUser?.id) {
      // Show sign-in message for unauthenticated users
      setMessages([{
        id: 'signin',
        text: "Hello! 👋 I'm Dice-Bot, your AI assistant for board games! 🎲\n\nTo chat with me, please sign in or create an account. It's free and only takes a moment!\n\nOnce you're signed in, I can help you with:\n• Board game rules and strategies\n• Game recommendations\n• King Dice platform features\n• And much more!\n\nSign in to get started! 🚀",
        isBot: true,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, currentUser?.id]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    // Check if user is authenticated - show fake bot message if not
    if (!currentUser?.id) {
      const userMessage = {
        id: Date.now().toString(),
        text: message,
        isBot: false,
        timestamp: new Date()
      };

      const signInMessage = {
        id: (Date.now() + 1).toString(),
        text: "Hello! 👋 I'm Dice-Bot, your AI assistant for board games! 🎲\n\nTo chat with me, please sign in or create an account. It's free and only takes a moment!\n\nOnce you're signed in, I can help you with:\n• Board game rules and strategies\n• Game recommendations\n• King Dice platform features\n• And much more!\n\nSign in to get started! 🚀",
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage, signInMessage]);
      setMessage('');
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      text: message,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle authentication errors with fake bot message
        if (errorData.requiresAuth || response.status === 401) {
          const signInMessage = {
            id: (Date.now() + 1).toString(),
            text: "Hello! 👋 I'm Dice-Bot, your AI assistant for board games! 🎲\n\nTo chat with me, please sign in or create an account. It's free and only takes a moment!\n\nOnce you're signed in, I can help you with:\n• Board game rules and strategies\n• Game recommendations\n• King Dice platform features\n• And much more!\n\nSign in to get started! 🚀",
            isBot: true,
            timestamp: new Date()
          };
          const updatedMessages = [...messages, userMessage, signInMessage];
          setMessages(updatedMessages);
          if (currentUser?.id) {
            const storageKey = `dicebot-messages-${currentUser.id}`;
            localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
          }
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorData.message || errorData.error || 'Failed to get bot response');
      }
      
      const data = await response.json();
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response || data.message || "Sorry, I couldn't generate a response.",
        isBot: true,
        timestamp: new Date()
      };

      const updatedMessages = [...messages, userMessage, botMessage];
      setMessages(updatedMessages);
      
      // Save to localStorage for persistence
      if (currentUser?.id) {
        const storageKey = `dicebot-messages-${currentUser.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
        console.log('Saved bot conversation to localStorage');
      }
    } catch (error: any) {
      console.error('Error sending message to bot:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: error?.message || "Sorry, I'm having trouble connecting right now. Please try again later!",
        isBot: true,
        timestamp: new Date()
      };
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
      
      // Save even error messages for continuity
      if (currentUser?.id) {
        const storageKey = `dicebot-messages-${currentUser.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={embedded ? "h-full bg-white flex flex-col overflow-hidden" : "fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"}
      style={!embedded ? { height: '500px', maxHeight: '500px' } : {}}
    >
      {/* Header - only show if not embedded */}
      {!embedded && (
        <div className="bg-[#fbae17] text-white p-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full border-2 border-white flex-shrink-0 overflow-hidden bg-white">
              <img
                src="/DiceBotIcon.svg"
                alt="Dice-Bot"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-semibold">Dice-Bot</span>
              <p className="text-xs text-yellow-100">AI Assistant - Always online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Messages - Fixed height scrollable container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-full" 
        style={{ 
          scrollBehavior: 'smooth'
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} items-end space-x-2`}
          >
            {/* Avatar for bot */}
         {msg.isBot && (
           <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden bg-white">
             <img
               src="/DiceBotIcon.svg"
               alt="Dice-Bot"
               className="w-full h-full object-cover"
             />
           </div>
         )}
            
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.isBot
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-[#fbae17] text-white'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">
                {msg.text}
              </div>
              <div className={`text-xs mt-1 ${
                msg.isBot ? 'text-gray-500' : 'text-yellow-100'
              }`}>
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>

            {/* Avatar for user */}
            {!msg.isBot && (
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden">
                <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-semibold text-sm">
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser?.username?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about board games..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbae17] focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            className="px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#e0990e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
