'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Users, Search, Plus, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChatState } from '@/contexts/ChatStateContext';
import ChatList from './ChatList';
import Chat from './Chat';
import ChatBot from './ChatBot';

export default function FloatingChat() {
  const { user, isAuthenticated } = useAuth();
  const { isChatOpen, setIsChatOpen, selectedChat, setSelectedChat } = useChatState();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-4 right-4 z-50">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="relative text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 bg-blue-500 hover:bg-blue-600"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        ) : (
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 h-96">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
              <h3 className="font-semibold text-gray-900">
                {selectedChat ? selectedChat.name : 'Chats'}
              </h3>
              <button
                onClick={() => {
                  setIsChatOpen(false);
                  setSelectedChat(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="h-80">
              {selectedChat ? (
                selectedChat.type === 'bot' ? (
                  <ChatBot />
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
                <ChatList onSelectChat={setSelectedChat} />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
