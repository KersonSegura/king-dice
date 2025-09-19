'use client';

import React, { createContext, useContext, useState } from 'react';

interface Chat {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'bot';
  participants: any[];
  createdAt: string;
  updatedAt: string;
}

interface ChatStateContextType {
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  selectedChat: Chat | null;
  setSelectedChat: (chat: Chat | null) => void;
}

const ChatStateContext = createContext<ChatStateContextType>({
  isChatOpen: false,
  setIsChatOpen: () => {},
  selectedChat: null,
  setSelectedChat: () => {},
});

export const useChatState = () => {
  const context = useContext(ChatStateContext);
  if (!context) {
    throw new Error('useChatState must be used within a ChatStateProvider');
  }
  return context;
};

export const ChatStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  return (
    <ChatStateContext.Provider value={{ isChatOpen, setIsChatOpen, selectedChat, setSelectedChat }}>
      {children}
    </ChatStateContext.Provider>
  );
};
