Ok 'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Plus, MoreVertical, User, Trash2, Flag, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CustomChatList } from './FloatingChat';
import Chat from './Chat';
import ChatBot from './ChatBot';
import GroupChatModal from './GroupChatModal';
import ViewMembersModal from './ViewMembersModal';
import { useTranslations } from 'next-intl';
import { getHiddenPublicChats, hidePublicChat, unhidePublicChat } from '@/lib/publicChatHide';

const GROUP_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7',
  '#22c55e', '#eab308', '#64748b',
];

// NOTE: public chat hide/unhide helpers live in `lib/publicChatHide.ts`

function getGroupChatColor(chatId: string): string {
  let hash = 0;
  for (let i = 0; i < chatId.length; i++) {
    hash = ((hash << 5) - hash) + chatId.charCodeAt(i);
    hash = hash & hash;
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

export default function ChatPage({ embed = false }: { embed?: boolean }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const t = useTranslations('chat');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showViewMembers, setShowViewMembers] = useState(false);
  const [viewMembersChat, setViewMembersChat] = useState<any>(null); // chat to show in ViewMembers modal (from list or header)
  const [chatListRefreshTrigger, setChatListRefreshTrigger] = useState(0);
  const [initialGroupUser, setInitialGroupUser] = useState<any>(null);
  const [chatsWithUnread, setChatsWithUnread] = useState<Map<string, number>>(new Map());
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportChatContext, setReportChatContext] = useState<any>(null);
  const [reportMessage, setReportMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChatContext, setDeleteChatContext] = useState<any>(null);
  const [showAutoTooltip, setShowAutoTooltip] = useState(false);
  const [hasShownTooltip, setHasShownTooltip] = useState(false);
  const [hiddenPublicChats, setHiddenPublicChats] = useState<string[]>(() => getHiddenPublicChats());
  const [diceBotClearTrigger, setDiceBotClearTrigger] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHideablePublicChat = (chat: any) =>
    chat?.type === 'public' &&
    (chat?.name === 'Digital Corner Public Chat' || chat?.name === 'Pixel Canvas Public Chat');

  const getPublicChatDisplayName = (name: string) => {
    if (name === 'Digital Corner Public Chat') return t('digitalCornerPublicChat');
    if (name === 'Pixel Canvas Public Chat') return t('pixelCanvasPublicChat');
    return name;
  };

  const hideChatFromList = (chat: any) => {
    if (!isHideablePublicChat(chat)) return;
    const next = hidePublicChat(chat.name);
    setHiddenPublicChats(next);
    setShowDropdown(false);
    if (selectedChat?.id === chat.id) setSelectedChat(null);
    setChatListRefreshTrigger((p) => p + 1);
  };

  // In embed (app): lock body scroll so only the chat messages area scrolls; other pages keep normal scroll
  useEffect(() => {
    if (typeof window === 'undefined' || !embed) return;
    document.body.classList.add('embed-no-scroll');
    return () => document.body.classList.remove('embed-no-scroll');
  }, [embed]);

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

  // When opening a public chat (Digital Corner or Pixel Canvas) from the chat list, ensure user is joined so they can send
  useEffect(() => {
    const chat = selectedChat;
    if (!user?.id || !chat?.id || chat?.type !== 'public') return;
    if (chat.name === 'Digital Corner Public Chat') {
      fetch('/api/digital-corner/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }).catch(() => {});
    } else if (chat.name === 'Pixel Canvas Public Chat') {
      fetch('/api/pixel-canvas/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }).catch(() => {});
    }
  }, [selectedChat?.id, user?.id, selectedChat?.type, selectedChat?.name]);
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

  const handleViewMembers = () => {
    setViewMembersChat(selectedChat);
    setShowViewMembers(true);
  };

  const handleOpenProfile = (username: string) => {
    if (embed && typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigateToProfile', username }));
    } else {
      router.push(`/profile/${username}`);
    }
  };

  const otherParticipant = selectedChat?.type === 'direct' && selectedChat?.participants
    ? selectedChat.participants.find((p: any) => p.id !== user?.id)
    : null;

  const openDeleteModal = (chat: any) => {
    setDeleteChatContext(chat);
    setShowDeleteModal(true);
    setShowDropdown(false);
  };

  const handleConfirmDeleteChat = async () => {
    const chat = deleteChatContext;
    if (!chat?.id) return;
    try {
      const res = await fetch(`/api/chats?chatId=${chat.id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setShowDeleteModal(false);
        setDeleteChatContext(null);
        setSelectedChat(null);
        setChatListRefreshTrigger((p) => p + 1);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete chat');
      }
    } catch (e) {
      alert('Failed to delete chat');
    }
  };

  const handleDeleteChat = () => {
    if (selectedChat) openDeleteModal(selectedChat);
  };

  const openReportModal = (chat: any) => {
    setReportChatContext(chat);
    setReportMessage('');
    setShowReportModal(true);
    setShowDropdown(false);
  };

  const handleReportChat = () => {
    if (!selectedChat) return;
    openReportModal(selectedChat);
  };

  const handleSendReportToSupport = () => {
    const chat = reportChatContext;
    const subject = encodeURIComponent(`Chat report: ${chat?.name || 'Conversation'} (${chat?.id || ''})`);
    const body = encodeURIComponent(
      (reportMessage.trim() ? `${reportMessage.trim()}\n\n` : '') +
      `---\nReported conversation: ${chat?.name || 'N/A'}\nChat ID: ${chat?.id || 'N/A'}\nType: ${chat?.type || 'N/A'}`
    );
    window.location.href = `mailto:support@kingdice.gg?subject=${subject}&body=${body}`;
    setShowReportModal(false);
    setReportChatContext(null);
    setReportMessage('');
  };

  const handleChatListMenuAction = (action: 'profile' | 'viewMembers' | 'report' | 'delete' | 'hide', chat: any, extra?: { username?: string }) => {
    if (action === 'profile' && extra?.username) {
      if (embed && typeof window !== 'undefined' && (window as any).ReactNativeWebView?.postMessage) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigateToProfile', username: extra.username }));
      } else {
        router.push(`/profile/${extra.username}`);
      }
      return;
    }
    if (action === 'viewMembers') {
      setViewMembersChat(chat);
      setShowViewMembers(true);
      return;
    }
    if (action === 'report') {
      openReportModal(chat);
      return;
    }
    if (action === 'delete') {
      if (chat?.id) openDeleteModal(chat);
      return;
    }
    if (action === 'hide') {
      hideChatFromList(chat);
    }
  };

  // In app (embed): show loading until auth is ready, then show chat
  if (embed && isLoading) {
    return <div className="min-h-screen flex flex-col bg-white chat-page chat-list-view" />;
  }

  return (
    <div className={`min-h-screen flex flex-col bg-white chat-page ${selectedChat ? 'chat-conversation-view' : 'chat-list-view'}`}>
      {selectedChat ? (
        <>
          {/* Minimal header when viewing a chat - no yellow; chat-view-header for embed sticky */}
          <div className="chat-view-header flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
            <button
              onClick={handleBackToChatList}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title={t('backToSearch')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {(selectedChat.type === 'direct' || selectedChat.type === 'group') ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedChat.type === 'direct' && otherParticipant?.username) {
                    handleOpenProfile(otherParticipant.username);
                  } else if (selectedChat.type === 'group') {
                    handleViewMembers();
                  }
                }}
                className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200"
                  style={selectedChat.type === 'group' ? { backgroundColor: getGroupChatColor(selectedChat.id) } : undefined}
                >
                  {selectedChat.type === 'group' ? (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <Users className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                      {otherParticipant?.avatar ? (
                        <img
                          src={otherParticipant.avatar}
                          alt={selectedChat.name}
                          className="w-full h-full object-cover"
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
              </button>
            ) : (
              <>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200"
                  style={(selectedChat.type === 'public' && (selectedChat.name === 'Digital Corner Public Chat' || selectedChat.name === 'Pixel Canvas Public Chat')) ? { backgroundColor: '#fbae17' } : undefined}
                >
                  {selectedChat.type === 'bot' ? (
                    <img src="/DiceBotIcon.svg" alt="Dice-Bot" className="w-5 h-5" />
                  ) : selectedChat.type === 'public' && selectedChat.name === 'Digital Corner Public Chat' ? (
                    <img src="/PCIcon.svg" alt="Digital Corner" className="w-5 h-5 object-contain" />
                  ) : selectedChat.type === 'public' && selectedChat.name === 'Pixel Canvas Public Chat' ? (
                    <img src="/PixelCanvasIconWhiteFill.svg" alt="Pixel Canvas" className="w-5 h-5 object-contain" />
                  ) : null}
                </div>
                <h2 className="flex-1 min-w-0 text-base font-semibold text-gray-900 truncate">
                  {selectedChat.type === 'public'
                    ? getPublicChatDisplayName(selectedChat.name)
                    : t('diceBotName')}
                </h2>
              </>
            )}
            {selectedChat.type === 'group' && (
              <button
                onClick={() => setShowAddPeople(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title={t('addPeople')}
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
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
                    {selectedChat.type === 'bot' ? (
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          setDiceBotClearTrigger((t) => t + 1);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {t('diceBotClearChat')}
                      </button>
                    ) : (
                      <>
                        {selectedChat.type === 'group' && (
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              setShowViewMembers(true);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            {t('viewMembers')}
                          </button>
                        )}
                        {selectedChat.type === 'direct' && otherParticipant?.username && (
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              const username = otherParticipant.username;
                              if (embed && typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
                                (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigateToProfile', username }));
                              } else {
                                router.push(`/profile/${username}`);
                              }
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <User className="w-4 h-4" />
                            {t('seeProfile')}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            handleReportChat();
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Flag className="w-4 h-4" />
                          {t('report')}
                        </button>
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            handleDeleteChat();
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t('deleteChat')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
          </div>
          <div className="chat-scroll-body flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="chat-conversation-wrap flex-1 min-h-0 overflow-hidden">
            {selectedChat.type === 'bot' ? (
              <ChatBot
                isOpen={true}
                onClose={handleBackToChatList}
                currentUser={user}
                embedded={true}
                clearChatTrigger={diceBotClearTrigger}
                onClearChatDone={() => setDiceBotClearTrigger(0)}
              />
            ) : (
              <Chat
                chatId={selectedChat.id}
                chatName={selectedChat.name}
                chatType={selectedChat.type}
                participants={selectedChat.participants}
                onClose={handleBackToChatList}
                onMessageSent={() => setChatListRefreshTrigger((p) => p + 1)}
                embed={embed}
              />
            )}
          </div>
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
            onChatMenuAction={handleChatListMenuAction}
            hiddenPublicChats={hiddenPublicChats}
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
        onClose={() => { setShowViewMembers(false); setViewMembersChat(null); }}
        members={(viewMembersChat || selectedChat)?.participants || []}
        groupName={(viewMembersChat || selectedChat)?.name || 'Group'}
        onNavigateToProfile={embed ? handleOpenProfile : undefined}
      />

      {/* Delete conversation confirmation */}
      {showDeleteModal && deleteChatContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowDeleteModal(false); setDeleteChatContext(null); }}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('deleteConversationTitle')}</h3>
            <p className="text-sm text-gray-600 mb-6">
              {t('deleteConversationMessage')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteChatContext(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteChat}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report conversation – send to support@kingdice.gg */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowReportModal(false); setReportChatContext(null); }} aria-hidden="true" />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('reportConversationTitle')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('reportConversationMessage')}
            </p>
            <textarea
              value={reportMessage}
              onChange={(e) => setReportMessage(e.target.value)}
              placeholder={t('describeReportPlaceholder')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowReportModal(false); setReportChatContext(null); setReportMessage(''); }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSendReportToSupport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('sendToSupport')}
              </button>
            </div>
          </div>
        </div>
      )}

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
