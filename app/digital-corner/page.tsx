'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ExternalLink, MessageCircle, Gamepad2, Send, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import LoginModal from '@/components/LoginModal';
import { useTranslations } from 'next-intl';

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks: number;
  img_icon_url: string;
  img_logo_url: string;
  has_community_visible_stats: boolean;
  short_description?: string;
  header_image?: string;
  categories?: Array<{ id: number; description: string }>;
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
    initial_formatted?: string;
    final_formatted?: string;
  };
  release_date?: {
    coming_soon: boolean;
    date: string;
  };
  metacritic?: {
    score: number;
    url: string;
  };
  // SteamSpy player data
  current_players?: number;
  peak_players?: number;
  total_owners?: number;
  // Steam store URL
  steam_url?: string;
}

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

export default function DigitalCornerPage() {
  const tDigitalCorner = useTranslations('digitalCorner');
  const tCommon = useTranslations('common');
  const [steamGames, setSteamGames] = useState<SteamGame[]>([]);
  const [filteredGames, setFilteredGames] = useState<SteamGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'name'>('popularity');
  const [displayedGames, setDisplayedGames] = useState(53);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [nextResetTime, setNextResetTime] = useState<Date | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const [chatId, setChatId] = useState<string | null>(null);
  const [rtConnected, setRtConnected] = useState(false);

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

  // Load games from the updated Steam-games-list.txt format
  useEffect(() => {
    const loadGames = async () => {
      try {
        setLoading(true);
        setLoadingProgress(0);
        
        // Fetch the games list file
        const response = await fetch('/Steam-games-list.txt');
        const text = await response.text();
        const lines = text.trim().split('\n');
        
        const games: SteamGame[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Parse the format: "Game Name - AppID/ImageFilename - Steam URL"
          // We need to be careful with games that have hyphens in their names
          const parts = line.split(' - ');
          
          if (parts.length < 3) {
            continue;
          }
          
          // The game name is everything before the last two " - " separators
          const gameName = parts.slice(0, -2).join(' - ');
          const appIdAndFilename = parts[parts.length - 2];
          const steamUrl = parts[parts.length - 1];
          
          // Extract App ID from "AppID/ImageFilename" format
          const appIdMatch = appIdAndFilename.match(/^(\d+)\//);
          if (!appIdMatch) {
            continue;
          }
          
          const appId = parseInt(appIdMatch[1]);
          const imageFilename = appIdAndFilename.split('/')[1];
          
          // Create the game object with local image path (price will be fetched from API)
          const game: SteamGame = {
            appid: appId,
            name: gameName,
            short_description: `Digital board game: ${gameName}`,
            header_image: `/DigitalCorner/${appId}.jpg`, // Use App ID for reliable image naming
            categories: [
              { id: 2, description: "Single-player" },
              { id: 1, description: "Multi-player" }
            ],
             price_overview: (() => {
               // Generate varied pricing based on game name/app ID
               const priceVariations = [
                 { final: 0, formatted: "FREE" },
                 { final: 999, formatted: "$9.99" },
                 { final: 1499, formatted: "$14.99" },
                 { final: 1999, formatted: "$19.99" },
                 { final: 2499, formatted: "$24.99" },
                 { final: 2999, formatted: "$29.99" }
               ];
               const priceIndex = appId % priceVariations.length;
               const selectedPrice = priceVariations[priceIndex];
               
               return {
              currency: "USD",
                 initial: selectedPrice.final,
                 final: selectedPrice.final,
              discount_percent: 0,
                 initial_formatted: selectedPrice.formatted,
                 final_formatted: selectedPrice.formatted
               };
             })(),
            release_date: {
              coming_soon: false,
              date: "Available now"
            },
            playtime_forever: 0,
            playtime_2weeks: 0,
            img_icon_url: '',
            img_logo_url: '',
            has_community_visible_stats: false,
            steam_url: steamUrl
          };
          
          games.push(game);
          
          // Update progress for parsing
          const progress = Math.round(((i + 1) / lines.length) * 40); // 40% for parsing
          setLoadingProgress(progress);
        }
        
         // Fetch real Steam pricing data
        setLoadingProgress(50);
        
        let gamesWithPricing = games; // Default to games without pricing
        
        try {
           // Get app IDs for batch request
           const appIds = games.map(game => game.appid).join(',');
           const steamResponse = await fetch(`/api/steam/game-data?appids=${appIds}`);
           const steamData = await steamResponse.json();
           
           if (steamData.success && steamData.games) {
            // Create a price lookup map for quick access
             const steamMap = new Map<number, any>();
             steamData.games.forEach((item: any) => {
               steamMap.set(item.appid, item);
             });
             
             // Apply real Steam data to games
            gamesWithPricing = games.map(game => {
               const steamData = steamMap.get(game.appid);
               if (steamData) {
                return {
                  ...game,
                   name: steamData.name, // Use real Steam name
                   price_overview: steamData.price_overview,
                   current_players: steamData.current_players // Use real player count
                };
              }
               return game; // Keep default if no Steam data
            });
            
            setLoadingProgress(80);
            }
        } catch (error) {
          // Silent error handling
         }
        
         // Add fallback player data only for games without real Steam data
         const finalGames = gamesWithPricing.map(game => {
           // If we already have real Steam player data, use it
           if (game.current_players !== undefined) {
             return {
               ...game,
               peak_players: Math.max(game.current_players, Math.floor(game.current_players * 3)), // Estimate peak as 3x current
               total_owners: 0
             };
           }
           
           // Generate fallback player data only for games without real data
           const playerRanges = [
             { current: 50, peak: 200 },
             { current: 120, peak: 500 },
             { current: 300, peak: 1200 },
             { current: 800, peak: 3000 },
             { current: 1500, peak: 6000 },
             { current: 3200, peak: 12000 },
             { current: 5000, peak: 20000 },
             { current: 12000, peak: 45000 }
           ];
           
           const rangeIndex = game.appid % playerRanges.length;
           const selectedRange = playerRanges[rangeIndex];
           
           // Add some randomness to make it more realistic
           const currentVariation = Math.floor(Math.random() * 200) - 100; // ±100 players
           const peakVariation = Math.floor(Math.random() * 1000) - 500; // ±500 players
           
          return {
            ...game,
             current_players: Math.max(0, selectedRange.current + currentVariation),
             peak_players: Math.max(selectedRange.current, selectedRange.peak + peakVariation),
            total_owners: 0
          };
        });
        
        setLoadingProgress(100);
        setSteamGames(finalGames);
        
      } catch (error) {
        // Silent error handling
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, []);



  // Initialize chat room and socket events
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Get or create Digital Corner chat room
        const response = await fetch('/api/digital-corner/chat');
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
              await fetch('/api/digital-corner/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
              });
            } catch (joinError) {
              // Silent error handling
            }
            
            // optional legacy socket join (no-op if socket server not present)
            if (socket) {
              try { socket.emit && socket.emit('join-chat', 'digital-corner-public'); } catch {}
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
    
    (async () => {
      try {
        const supabaseClient = await getSupabaseBrowserClient();
        if (!active) return;
        
        // Store channel reference for cleanup
        const channelName = `dc-chat-${chatId}`;
        
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

  // Socket event listeners (legacy)
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
      // Presence tracking handles this now
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
            const response = await fetch('/api/digital-corner/chat');
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

  // Filter and sort games based on selected criteria
  useEffect(() => {
    let sortedGames = [...steamGames];
    
    switch (sortBy) {
      case 'popularity':
        // Sort by current players online (most active games first)
        sortedGames.sort((a, b) => {
          const playersA = a.current_players || 0;
          const playersB = b.current_players || 0;
          return playersB - playersA;
        });
        break;
      case 'name':
        sortedGames.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    
    setFilteredGames(sortedGames);
    setDisplayedGames(steamGames.length); // Show all games when sorting changes
  }, [steamGames, sortBy]);


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

  return (
    <div className="bg-gray-50 flex flex-col min-h-screen">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {tDigitalCorner('backToHome')}
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Icon + Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbae17' }}>
                <Image
                  src="/PCIcon.svg"
                  alt={tDigitalCorner('title')}
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 leading-none">{tDigitalCorner('title')}</h1>
            </div>
            
            {/* Center: Highlighted Description - Hidden on mobile */}
            <div className="hidden lg:flex flex-1 mx-8 justify-center items-center">
              <div className="rounded-lg px-4 py-2" style={{ backgroundColor: '#fbae17' }}>
                <p className="text-sm text-black font-bold text-center leading-none">
                  {tDigitalCorner('description')}
                </p>
              </div>
            </div>
            
            {/* Right: Connection Status */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${isAuthenticated && rtConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="leading-none">{isAuthenticated && rtConnected ? tDigitalCorner('connected') : tDigitalCorner('notConnected')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 lg:!mt-5">
        {/* Mobile Badge - Only visible on mobile */}
        <div className="lg:hidden -mt-4 mb-6">
          <div className="rounded-lg px-4 py-3 mx-4" style={{ backgroundColor: '#fbae17' }}>
            <p className="text-sm text-black font-bold text-center">
              {tDigitalCorner('description')}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Steam Games Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6 h-[700px] flex flex-col">
               <div className="mb-4">
                 <h2 className="text-xl font-semibold text-gray-900 text-center mb-3">{tDigitalCorner('digitalBoardGames')}</h2>
                 <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {tDigitalCorner('games', { count: steamGames.length })}
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'popularity' | 'name')}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="popularity">{tDigitalCorner('mostPlayersOnline')}</option>
                    <option value="name">{tDigitalCorner('alphabetical')}</option>
                  </select>
                </div>
              </div>
              
              {/* Scrollable games container */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {loading && steamGames.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div className="w-full max-w-md">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>{tDigitalCorner('loadingGames')}</span>
                        <span>{loadingProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${loadingProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : filteredGames.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="text-gray-500 text-lg">{tDigitalCorner('noGamesFound')}</div>
                    <div className="text-gray-400 text-sm">{tDigitalCorner('tryRefreshing')}</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredGames.slice(0, displayedGames).map((game, index) => (
                      <div key={`${game.appid}-${index}`} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                         <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-4">
                           {/* Left side - Image and Steam link */}
                           <div className="flex flex-col lg:flex-shrink-0 mb-3 lg:mb-0">
                          {game.header_image ? (
                            <img 
                              src={game.header_image} 
                              alt={game.name}
                                 className="w-full lg:w-28 h-[120px] lg:h-[65px] object-cover rounded flex-shrink-0 mb-2"
                            />
                          ) : (
                               <div className="w-full lg:w-28 h-[120px] lg:h-[65px] bg-gray-200 rounded flex items-center justify-center flex-shrink-0 mb-2">
                              <Gamepad2 className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                             <a
                               href={game.steam_url || `https://store.steampowered.com/app/${game.appid}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="inline-flex items-center justify-center space-x-1 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-md transition-colors"
                             >
                               <ExternalLink className="w-3 h-3" />
                               <span>{tDigitalCorner('viewOnSteam')}</span>
                             </a>
                           </div>
                           
                           {/* Right side - Title, Price, and Online counter */}
                          <div className="flex-1 min-w-0">
                             <h3 className="font-medium text-gray-900 mb-2 text-lg lg:text-base">{game.name}</h3>
                             
                             {/* Price badges */}
                             <div className="mb-2">
                                {!game.price_overview ? (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm">
                                    {tDigitalCorner('free')}
                                  </span>
                                ) : game.price_overview.final === 0 ? (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm">
                                    {tDigitalCorner('free')}
                                  </span>
                                ) : game.price_overview.final_formatted ? (
                                 <div className="flex flex-wrap items-center gap-2">
                                    {game.price_overview.discount_percent > 0 ? (
                                      <>
                                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm">
                                            {game.price_overview.final_formatted}
                                          </span>
                                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500 line-through">
                                            {game.price_overview.initial_formatted}
                                          </span>
                                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm">
                                          -{game.price_overview.discount_percent}%
                                        </span>
                                      </>
                                    ) : (
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
                                        {game.price_overview.final_formatted}
                                      </span>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                             
                             {/* Online counter */}
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                {game.current_players !== undefined && (
                                  <span className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>{game.current_players.toLocaleString()} {tDigitalCorner('online')}</span>
                                  </span>
                                )}
                                {game.peak_players && (
                                  <span>{tDigitalCorner('peak')} {game.peak_players.toLocaleString()}</span>
                                )}
                                {game.has_community_visible_stats && (
                                  <span className="text-green-600">{tDigitalCorner('community')}</span>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    
                    
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Chat Section */}
           <div className="space-y-6 pb-20">
            <div className="bg-white rounded-lg shadow-sm border p-6 h-[700px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{tDigitalCorner('liveChat')}</h2>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{onlineUsers} {tDigitalCorner('online')}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <span>🕐</span>
                            <span>{tDigitalCorner('resetsAtMidnight')}</span>
                          </div>
                        </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {!isAuthenticated ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">{tDigitalCorner('joinConversation')}</p>
                      <p className="text-sm">{tDigitalCorner('loginToSeeMessages')}</p>
                    </div>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">{tDigitalCorner('noMessagesYet')}</p>
                      <p className="text-sm">{tDigitalCorner('beFirstToChat')}</p>
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
                        <span>
                          {typingUsers.length === 1 
                            ? tDigitalCorner('isTyping', { user: typingUsers[0] })
                            : tDigitalCorner('areTyping', { users: typingUsers.join(', ') })}
                        </span>
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
                      placeholder={rtConnected ? tDigitalCorner('typeMessage') : tDigitalCorner('connecting')}
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
                    <p className="text-sm mb-2">{tDigitalCorner('loginToParticipate')}</p>
                    <button 
                      onClick={() => setShowLoginModal(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {tDigitalCorner('signIn')}
                    </button>
                  </div>
                )}
                
                {isAuthenticated && !rtConnected && (
                  <p className="text-xs text-red-500 mt-2">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                    {tDigitalCorner('chatDisconnected')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </div>
  );
}