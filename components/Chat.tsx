'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, MoreVertical, Users, X } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import EmojiPicker from './EmojiPicker';
import ChatBot from './ChatBot';
import { useToast } from './Toast';
import LoadingLogo from './LoadingLogo';
import { useTranslations } from 'next-intl';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';

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
  chatType: 'direct' | 'group' | 'bot' | 'public';
  participants: any[];
  onClose: () => void;
  onMessageSent?: () => void; // Callback to refresh chat list
  /** When true (app WebView), no floating chat / popup; scroll is free, no auto-scroll after first load */
  embed?: boolean;
}

export default function Chat({ chatId, chatName, chatType, participants, onClose, onMessageSent, embed = false }: ChatProps) {
  const t = useTranslations('chat');
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();

  // All hooks must run unconditionally so the hook count never changes (avoids "useEffect dependency array changed size" error when switching bot vs regular chat)
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Game mention dropdown state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [isMentionSearchDirty, setIsMentionSearchDirty] = useState(false);
  const [manuallyClosedAtPos, setManuallyClosedAtPos] = useState<number>(-1);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(0);
  const [mentionSearchTimeout, setMentionSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const PAGE_SIZE = 15;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const scrollRestoreRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const loadingOlderRef = useRef(false);
  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const hasMarkedReadRef = useRef(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Helpers for game mentions (@GameName -> link to /game/:id)
  const GAME_MENTION_REGEX = /@([A-Za-z0-9][A-Za-z0-9 \-\']{0,50})/g;

  const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');

  const resolveGameMentions = async (text: string): Promise<string> => {
    // Skip if text already contains markdown links (already resolved)
    if (text.includes('](/game/')) {
      return text;
    }

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
          // Get the game's actual name (prefer nameEn, fallback to name)
          const gameName = game.nameEn || game.name || name;
          // Replace all occurrences of the mention with a markdown-style link
          // Use the game's actual name as the link text
          const mentionPattern = new RegExp(`@${escapeRegExp(name)}`, 'g');
          resolvedText = resolvedText.replace(
            mentionPattern,
            `[${gameName}](/game/${game.id})`
          );
        }
      } catch (error) {
        console.error('Error resolving game mention:', name, error);
      }
    }

    return resolvedText;
  };

  const renderContent = (content: string, isUserMessage: boolean = false) => {
    const parts: React.ReactNode[] = [];
    const linkRegex = /\[([^\]]+)\]\((\/game\/[^\)]+)\)/g;
    let lastIndex = 0;
    let match;

    // Convert markdown links to anchor tags, keep other text as-is
    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      // Use yellow for links in blue message bubbles (user messages), blue for gray bubbles
      const linkClassName = isUserMessage
        ? 'underline text-yellow-300 hover:text-yellow-200 break-words'
        : 'underline text-blue-600 hover:text-blue-700 break-words';
      parts.push(
        <a
          key={`${match[2]}-${match.index}`}
          href={match[2]}
          className={linkClassName}
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

  // Load initial page of messages (last 15)
  useEffect(() => {
    if (chatType === 'bot') return;
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/messages?chatId=${chatId}&page=1&limit=${PAGE_SIZE}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
          const pagination = data.pagination || {};
          setTotalPages(Math.max(1, pagination.totalPages || 1));
          setPage(1);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        showToast('Failed to load messages', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when chat or user changes
  }, [chatId, user?.id, chatType]);

  // Real-time message updates using Supabase
  useEffect(() => {
    if (chatType === 'bot' || !chatId || !user?.id) return;

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

            // Reset hasMarkedRead so the visibility observer marks the new message as read
            hasMarkedReadRef.current = false;
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
  }, [chatId, user?.id, chatType]);

  // Scroll to bottom when conversation first loads (so we see the latest messages)
  useEffect(() => {
    if (chatType === 'bot' || messages.length === 0 || !isInitialLoad) return;
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const area = messagesAreaRef.current;
      if (area) {
        area.scrollTop = area.scrollHeight;
      }
      setIsInitialLoad(false);
    });
  }, [messages.length, isInitialLoad, chatType]);

  // Mark messages as read when they become visible (using IntersectionObserver)
  // This ensures messages are marked as read just by viewing them, not requiring any action
  useEffect(() => {
    if (chatType === 'bot' || !user?.id || !chatId || messages.length === 0) return;
    
    // Debounce the mark-as-read call to avoid spamming the API
    let markReadTimeout: NodeJS.Timeout | null = null;
    
    const markAsRead = async () => {
      if (hasMarkedReadRef.current) return;
      hasMarkedReadRef.current = true;
      
      try {
        await fetch('/api/messages/unread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, chatId })
        });
        // Notify mobile app to refresh unread count
        if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
          (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'chatMessagesRead' }));
        }
        // Notify parent to update chat list
        if (onMessageSent) {
          onMessageSent();
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
        hasMarkedReadRef.current = false; // Allow retry on error
      }
    };

    // Use IntersectionObserver to detect when message area is visible
    const area = messagesAreaRef.current;
    if (!area) {
      // Fallback: mark as read after a short delay if no scroll area
      markReadTimeout = setTimeout(markAsRead, 500);
      return () => { if (markReadTimeout) clearTimeout(markReadTimeout); };
    }

    // Create observer for the messages area
    const observer = new IntersectionObserver(
      (entries) => {
        // If any part of the messages area is visible, mark as read
        if (entries.some(entry => entry.isIntersecting)) {
          // Small delay to ensure user actually sees the messages
          if (markReadTimeout) clearTimeout(markReadTimeout);
          markReadTimeout = setTimeout(markAsRead, 300);
        }
      },
      { threshold: 0.1 } // Trigger when at least 10% is visible
    );

    observer.observe(area);

    // Also mark as read on scroll (user is actively viewing)
    const handleScroll = () => {
      if (markReadTimeout) clearTimeout(markReadTimeout);
      markReadTimeout = setTimeout(markAsRead, 300);
    };
    area.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      area.removeEventListener('scroll', handleScroll);
      if (markReadTimeout) clearTimeout(markReadTimeout);
    };
  }, [chatType, user?.id, chatId, messages.length, onMessageSent]);

  // Reset the hasMarkedRead flag when chat changes
  useEffect(() => {
    hasMarkedReadRef.current = false;
  }, [chatId]);

  // Web (non-embed): also auto-scroll when new messages arrive if user was near bottom
  useEffect(() => {
    if (chatType === 'bot' || embed || messages.length === 0 || !messagesEndRef.current) return;
    const scrollContainer = messagesEndRef.current.closest('.chat-scroll-body') || messagesEndRef.current.closest('.chat-messages-area');
    const el = (scrollContainer instanceof HTMLElement ? scrollContainer : messagesAreaRef.current) as HTMLElement | null;
    const nearBottom = !el || el.scrollHeight - el.clientHeight - el.scrollTop <= 120;
    if (nearBottom && !isInitialLoad) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [embed, messages, isInitialLoad, chatType]);

  // Reset initial-load when chat changes
  useEffect(() => {
    if (chatType === 'bot') return;
    setIsInitialLoad(true);
  }, [chatId, chatType]);

  // Restore scroll position after prepending older messages
  useEffect(() => {
    const rest = scrollRestoreRef.current;
    if (!rest || !messagesAreaRef.current) return;
    const el = messagesAreaRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight - rest.scrollHeight + rest.scrollTop;
      scrollRestoreRef.current = null;
    });
  }, [messages]);

  pageRef.current = page;
  totalPagesRef.current = totalPages;

  // Load older messages when user scrolls up
  useEffect(() => {
    if (chatType === 'bot') return;
    const el = messagesAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      if (loadingOlderRef.current || pageRef.current >= totalPagesRef.current) return;
      if (el.scrollTop > 80) return;
      loadingOlderRef.current = true;
      setLoadingOlder(true);
      scrollRestoreRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
      const nextPage = pageRef.current + 1;
      fetch(`/api/messages?chatId=${chatId}&page=${nextPage}&limit=${PAGE_SIZE}`)
        .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load')))
        .then((data) => {
          const newMessages = data.messages || [];
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const older = newMessages.filter((m: Message) => !existingIds.has(m.id));
            if (older.length === 0) return prev;
            return [...older, ...prev];
          });
          if ((data.messages || []).length > 0) {
            setPage(nextPage);
            pageRef.current = nextPage;
          }
          const total = Math.max(1, data.pagination?.totalPages ?? 1);
          setTotalPages(total);
          totalPagesRef.current = total;
        })
        .catch(() => {})
        .finally(() => {
          loadingOlderRef.current = false;
          setLoadingOlder(false);
        });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [chatId, loading, chatType]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (mentionSearchTimeout) {
        clearTimeout(mentionSearchTimeout);
      }
    };
  }, [mentionSearchTimeout]);

  // Close mention dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMentionDropdown &&
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        closeMentionDropdown();
      }
    };

    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMentionDropdown]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    // Store the original message content (in cleaner format) before clearing
    const originalMessage = newMessage.trim();
    
    // Convert cleaner format (🔗GameName + ZWJ + id) back to markdown for sending
    const messageContent = convertGameMentionsToMarkdown(originalMessage);
    
    // Clear input immediately for better UX
    setNewMessage('');
    setReplyingTo(null);

    // Resolve any remaining @GameName mentions to links (for backwards compatibility)
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

    // In app (embed) do not auto-scroll after send (free scroll); on web scroll if user was near bottom
    setTimeout(() => {
      if (!messagesEndRef.current) return;
      if (embed) return;
      const scrollContainer = messagesEndRef.current.closest('.chat-page');
      const el = scrollContainer instanceof HTMLElement ? scrollContainer : null;
      const nearBottom = !el || el.scrollHeight - el.clientHeight - el.scrollTop <= 120;
      if (nearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
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
        // Restore message to input (in original cleaner format)
        setNewMessage(originalMessage);
      }
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
      // Restore message to input (in original cleaner format)
      setNewMessage(originalMessage);
    }
  };

  // Search games for mention dropdown
  const searchGamesForMention = async (query: string) => {
    if (!query.trim()) {
      setMentionResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=games&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setMentionResults(data.games || []);
      }
    } catch (error) {
      console.error('Error searching games for mention:', error);
      setMentionResults([]);
    }
  };
  
  const scheduleMentionSearch = (query: string) => {
    if (mentionSearchTimeout) {
      clearTimeout(mentionSearchTimeout);
    }
    const timeout = setTimeout(() => {
      searchGamesForMention(query);
    }, 200);
    setMentionSearchTimeout(timeout);
  };

  const handleMentionSearchInputChange = (value: string) => {
    setMentionSearchQuery(value);
    setIsMentionSearchDirty(true);
    scheduleMentionSearch(value);
  };

  const closeMentionDropdown = () => {
    setShowMentionDropdown(false);
    setMentionResults([]);
    setSelectedMentionIndex(0);
    setMentionSearchQuery('');
    setIsMentionSearchDirty(false);
    setManuallyClosedAtPos(mentionStartPos);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setNewMessage(value);

    // Check if we're in a mention context (@...)
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    // Reset manual close if @ moved or removed
    if (manuallyClosedAtPos !== -1) {
      if (lastAtPos !== manuallyClosedAtPos || value.charAt(manuallyClosedAtPos) !== '@') {
        setManuallyClosedAtPos(-1);
      }
    }
    
    if (lastAtPos !== -1) {
      // Check if there's a space, newline, or closing bracket after the @ (mention ended or already a link)
      const textAfterAt = textBeforeCursor.substring(lastAtPos + 1);
      const hasNewlineAfterAt = textAfterAt.includes('\n');
      // Check for both markdown format and new cleaner format
      const ZWJ = '\u200D';
      const isAlreadyLink = value.substring(lastAtPos, cursorPos).includes('](/game/') || 
                           value.substring(lastAtPos, cursorPos).includes(`🔗`) ||
                           (textAfterAt.includes(ZWJ) && textAfterAt.split(ZWJ).length > 1);
      
      if (!hasNewlineAfterAt && !isAlreadyLink) {
        // If user manually closed for this '@', keep dropdown closed
        if (manuallyClosedAtPos === lastAtPos) {
          setShowMentionDropdown(false);
          return;
        }
        // We're in a mention - extract the query (remove zero-width characters)
        const ZWJ = '\u200D';
        const query = textAfterAt.replace(new RegExp(ZWJ, 'g'), '').replace(/🔗/g, '');
        setMentionStartPos(lastAtPos);
        setMentionQuery(query);
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);

        if (!isMentionSearchDirty) {
          setMentionSearchQuery(query);
          scheduleMentionSearch(query);
        }
      } else {
        // Mention ended or already a link
        setShowMentionDropdown(false);
        setMentionQuery('');
        setMentionSearchQuery('');
        setIsMentionSearchDirty(false);
        setManuallyClosedAtPos(-1);
        setMentionResults([]);
      }
    } else {
      // No @ found
      setShowMentionDropdown(false);
      setMentionQuery('');
      setMentionSearchQuery('');
      setIsMentionSearchDirty(false);
      setManuallyClosedAtPos(-1);
      setMentionResults([]);
    }

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

  const insertGameMention = (game: any) => {
    const gameName = game.nameEn || game.name || mentionQuery;
    const beforeMention = newMessage.substring(0, mentionStartPos);
    const afterMention = newMessage.substring(mentionStartPos + 1 + mentionQuery.length);
    // Use a cleaner visual format: 🔗 GameName
    // Store the game ID using zero-width characters (invisible)
    // Format: 🔗GameName + ZWJ + gameId + ZWJ (ZWJ = zero-width joiner \u200D)
    const ZWJ = '\u200D'; // Zero-width joiner (invisible)
    const linkText = `🔗${gameName}${ZWJ}${game.id}${ZWJ}`;
    const newText = beforeMention + linkText + afterMention;
    
    setNewMessage(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');
    setMentionSearchQuery('');
    setIsMentionSearchDirty(false);
    setManuallyClosedAtPos(-1);
    setMentionResults([]);
    
    // Focus input and set cursor position after the inserted link
    setTimeout(() => {
      if (inputRef.current) {
        // Position cursor after the visible part
        const visiblePart = `🔗${gameName}`;
        const newCursorPos = beforeMention.length + visiblePart.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Convert the cleaner format back to markdown when sending
  const convertGameMentionsToMarkdown = (text: string): string => {
    // Convert 🔗GameName + ZWJ + gameId + ZWJ back to [GameName](/game/id)
    const ZWJ = '\u200D';
    return text.replace(new RegExp(`🔗([^${ZWJ}]+)${ZWJ}(\\d+)${ZWJ}`, 'g'), (match, gameName, gameId) => {
      return `[${gameName}](/game/${gameId})`;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && mentionResults.length > 0) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertGameMention(mentionResults[selectedMentionIndex]);
        return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < mentionResults.length - 1 ? prev + 1 : prev
        );
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMentionDropdown();
        return;
      }
    }

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

  // Lock background scroll when chat UI is shown (website). Skip in app (embed) so the chat page can scroll.
  useEffect(() => {
    if (chatType === 'bot') return;
    if (!embed) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [embed, chatType]);

  if (chatType === 'bot') {
    return (
      <div className="h-96 bg-white rounded-lg shadow-lg">
        <ChatBot isOpen={true} onClose={onClose} currentUser={user} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingLogo size={44} text={t('loadingChat')} />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full min-h-0 bg-white">
        {/* Messages – no redundant subheader; parent (ChatPage/FloatingChat) already shows name + avatar */}
        <div ref={messagesAreaRef} className="chat-messages-area flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0">
          {loadingOlder && (
            <div className="flex justify-center py-2">
              <span className="text-sm text-gray-500">Loading…</span>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'} items-end space-x-2`}
            >
             {/* Avatar for other users */}
             {message.senderId !== user?.id && (
               <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0 overflow-hidden">
                 {message.sender.username === 'Dice-Bot' || message.sender.username === t('diceBotName') ? (
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
                    <div className="font-semibold">{t('replyingTo')} {message.replyTo.sender.username}</div>
                    <div className="truncate">{message.replyTo.content}</div>
                  </div>
                )}
                <div className="text-sm break-words">{renderContent(message.content, message.senderId === user?.id)}</div>
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
        <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0 relative">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={handleTyping}
                onKeyDown={handleKeyPress}
                placeholder={t('typeAMessage')}
                rows={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={false}
              />
              
              {/* Game Mention Dropdown */}
              {showMentionDropdown && (
                <div
                  ref={mentionDropdownRef}
                  className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden flex flex-col"
                >
                  <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200 flex items-center justify-between">
                    <span>{t('linkGames')}</span>
                    <button
                      type="button"
                      onClick={closeMentionDropdown}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="px-3 py-2 border-b border-gray-200 bg-white">
                    <input
                      value={mentionSearchQuery}
                      onChange={(e) => handleMentionSearchInputChange(e.target.value)}
                      onKeyDown={handleKeyPress as any}
                      placeholder={t('searchGame')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {mentionResults.length > 0 ? (
                    <div className="py-1 overflow-y-auto flex-1 min-h-0 pb-1">
                      {mentionResults.map((game, index) => (
                        <button
                          key={game.id}
                          onClick={() => insertGameMention(game)}
                          className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${
                            index === selectedMentionIndex ? 'bg-blue-100' : ''
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900">
                            {game.nameEn || game.name}
                          </div>
                          {game.yearRelease && (
                            <div className="text-xs text-gray-500">
                              {game.yearRelease}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : mentionQuery.length > 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      {t('noGamesFound')}
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">
                      {t('typeToSearchGames')}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-500 hover:text-gray-700"
              title={t('addEmoji')}
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('sendMessage')}
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
