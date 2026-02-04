'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Plus, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CustomChatList } from './FloatingChat';
import Chat from './Chat';
import ChatBot from './ChatBot';
import GroupChatModal from './GroupChatModal';
import ViewMembersModal from './ViewMembersModal';
import { useTranslations } from 'next-intl';

const GROUP_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7',
  '#22c55e', '#eab308', '#64748b',
];

function getGroupChatColor(chatId: string): string {
  let hash = 0;
  for (let i = 0; i < chatId.length; i++) {
    hash = ((hash << 5) - hash) + chatId.charCodeAt(i);
    hash = hash & hash;
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

export default function ChatPage() {
  const { user, isAuthenticated } = useAuth();
  const t = useTranslations('chat');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showViewMembers, setShowViewMembers] = useState(false);
  const [chatListRefreshTrigger, setChatListRefreshTrigger] = useState(0);
  const [initialGroupUser, setInitialGroupUser] = useState<any>(null);
  const [chatsWithUnread, setChatsWithUnread] = useState<Map<string, number>>(new Map());
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAutoTooltip, setShowAutoTooltip] = useState(false);
  const [hasShownTooltip, setHasShownTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dice-Bot tip modal - appears once when entering chat for the first time
  useEffect(() => {
    if (typeof window === 'undefined' || !isAuthenticated || selectedChat || hasShownTooltip) return;
    const key = 'chatPage_diceBotTipDismissed';
    if (localStorage.getItem(key)) {
      setHasShownTooltip(true);
      return;
    }
    setShowAutoTooltip(true);
    setHasShownTooltip(true);
  }, [isAuthenticated, selectedChat, hasShownTooltip]);

  const dismissDiceBotTip = () => {
    setShowAutoTooltip(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatPage_diceBotTipDismissed', '1');
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleCreateGroup = () => setShowCreateGroup(true);
  const handleSelectChat = (chat: any) => setSelectedChat(chat);
  const handleBackToChatList = () => setSelectedChat(null);
  const handleStartGroupChatWithUser = (targetUser: any) => {
    setInitialGroupUser(targetUser);
    setShowCreateGroup(true);
  };

  const handleCreateGroupChat = async (groupName: string, selectedUsers: any[]) => {
    if (!user?.id) return;
    try {
      const participants = [user.id, ...selectedUsers.map((u: any) => u.id)];
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: groupName,
          participants,
          createdBy: user.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const chat = {
          id: data.chat.id,
          name: data.chat.name,
          type: 'group' as const,
          participants: data.chat.participants || [],
          createdAt: data.chat.createdAt || new Date().toISOString(),
          updatedAt: data.chat.updatedAt || new Date().toISOString(),
        };
        setShowCreateGroup(false);
        setInitialGroupUser(null);
        setChatListRefreshTrigger((p) => p + 1);
        setSelectedChat(chat);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create group');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to create group');
    }
  };

  const handleAddParticipants = async (userIds: string[]) => {
    if (!selectedChat?.id || !user?.id) return;
    try {
      const res = await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chatId: selectedChat.id,
          userIds,
          currentUserId: user.id,
        }),
      });
      if (res.ok) {
        const chatRes = await fetch(`/api/chats?userId=${user.id}`);
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          const updated = chatData.chats?.find((c: any) => c.id === selectedChat.id);
          if (updated) setSelectedChat(updated);
        }
        setShowAddPeople(false);
        setChatListRefreshTrigger((p) => p + 1);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add participants');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to add participants');
    }
  };

  const handleViewMembers = () => setShowViewMembers(true);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">{t('signInToChat') || 'Sign in to use chat'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {selectedChat ? (
        <>
          {/* Minimal header when viewing a chat - no yellow */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
            <button
              onClick={handleBackToChatList}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title={t('backToSearch')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
              {selectedChat.type === 'bot' ? (
                <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                  <img src="/DiceBotIcon.svg" alt="Dice-Bot" className="w-5 h-5" />
                </div>
              ) : selectedChat.type === 'group' ? (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: getGroupChatColor(selectedChat.id) }}
                >
                  <Users className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {selectedChat.participants?.find((p: any) => p.id !== user?.id)?.avatar ? (
                    <img
                      src={selectedChat.participants.find((p: any) => p.id !== user?.id)?.avatar}
                      alt={selectedChat.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    selectedChat.name?.charAt(0)?.toUpperCase() || '?'
                  )}
                </div>
              )}
            </div>
            <h2 className="flex-1 min-w-0 text-base font-semibold text-gray-900 truncate">
              {selectedChat.name}
            </h2>
            {selectedChat.type === 'group' && (
              <button
                onClick={() => setShowAddPeople(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title={t('addPeople')}
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            {selectedChat.type !== 'bot' && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  title={t('moreOptions')}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowViewMembers(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      View Members
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {selectedChat.type === 'bot' ? (
              <ChatBot
                isOpen={true}
                onClose={handleBackToChatList}
                currentUser={user}
                embedded={true}
              />
            ) : (
              <Chat
                chatId={selectedChat.id}
                chatName={selectedChat.name}
                chatType={selectedChat.type}
                participants={selectedChat.participants}
                onClose={handleBackToChatList}
                onMessageSent={() => setChatListRefreshTrigger((p) => p + 1)}
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden">
          <CustomChatList
            onSelectChat={handleSelectChat}
            onCreateGroup={handleCreateGroup}
            onStartDirectChat={() => {}}
            onStartBotChat={() => setSelectedChat({ id: 'bot', name: 'Dice-Bot', type: 'bot', participants: [] })}
            user={user}
            refreshTrigger={chatListRefreshTrigger}
            chatsWithUnread={chatsWithUnread}
            setChatsWithUnread={setChatsWithUnread}
            onStartGroupChatWithUser={handleStartGroupChatWithUser}
            fullPage={true}
          />
        </div>
      )}

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
      <GroupChatModal
        isOpen={showAddPeople}
        onClose={() => setShowAddPeople(false)}
        onCreateGroup={async () => {}}
        currentUser={user}
        existingChatId={selectedChat?.id}
        existingParticipants={selectedChat?.participants || []}
        onAddParticipants={handleAddParticipants}
      />
      <ViewMembersModal
        isOpen={showViewMembers}
        onClose={() => setShowViewMembers(false)}
        members={selectedChat?.participants || []}
        groupName={selectedChat?.name || 'Group'}
      />

      {/* Dice-Bot tip modal - first-time welcome overlay */}
      {!selectedChat && showAutoTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={dismissDiceBotTip}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-6 text-white shadow-2xl">
            <div className="mb-4 flex items-center justify-center">
              <img src="/DiceBotIconSmallWhite.svg" alt="Dice-Bot" className="h-12 w-12" />
            </div>
            <h3 className="mb-2 text-center text-lg font-semibold">{t('askDiceBot')}</h3>
            <p className="mb-6 text-center text-sm opacity-90">
              {t('askDiceBotDescription')}
            </p>
            <button
              onClick={dismissDiceBotTip}
              className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-blue-600 transition-colors hover:bg-gray-100"
            >
              {t('gotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
