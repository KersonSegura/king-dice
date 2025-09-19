'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Loader2 } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose, currentUser }) => {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message when bot opens
      setMessages([{
        id: 'welcome',
        text: "Hello! I'm Dice-Bot! 🎲 Your AI assistant 🤖\n\nI'm here to help with board games and King Dice related questions.\n\nWhat can I help you with today?",
        isBot: true,
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

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
          message: message,
          userId: currentUser?.id
        }),
      });

      const data = await response.json();
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message to bot:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting right now. Please try again later!",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="bg-[#fbae17] text-white p-4 rounded-t-lg flex items-center justify-between">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
      <div className="p-4 border-t border-gray-200">
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
