'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ExternalLink, MessageCircle, Gamepad2, Send, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import LoginModal from '@/components/LoginModal';
import BackButton from '@/components/BackButton';

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
  const [nextResetTime, setNextResetTime] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();

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
        
        console.log('Loading games from Steam-games-list.txt, found', lines.length, 'games');
        
        const games: SteamGame[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Parse the format: "Game Name - AppID/ImageFilename - Steam URL"
          // We need to be careful with games that have hyphens in their names
          const parts = line.split(' - ');
          
          if (parts.length < 3) {
            console.warn(`Skipping malformed line: ${line}`);
            continue;
          }
          
          // The game name is everything before the last two " - " separators
          const gameName = parts.slice(0, -2).join(' - ');
          const appIdAndFilename = parts[parts.length - 2];
          const steamUrl = parts[parts.length - 1];
          
          // Extract App ID from "AppID/ImageFilename" format
          const appIdMatch = appIdAndFilename.match(/^(\d+)\//);
          if (!appIdMatch) {
            console.warn(`Could not extract App ID from: ${appIdAndFilename}`);
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
            price_overview: {
              currency: "USD",
              initial: 1999, // Placeholder, will be updated from API
              final: 1999,
              discount_percent: 0,
              initial_formatted: "$19.99",
              final_formatted: "$19.99"
            },
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
          
          console.log(`Parsed: ${gameName} (${appId}) -> ${game.header_image}`);
        }
        
        console.log('Parsed', games.length, 'games from list');
        
        // Fetch cached pricing data (much faster!)
        console.log('Loading cached pricing data...');
        setLoadingProgress(50);
        
        let gamesWithPricing = games; // Default to games without pricing
        
        try {
          const priceResponse = await fetch('/api/digital-corner/prices');
          const priceData = await priceResponse.json();
          
          if (priceData.success && priceData.prices) {
            console.log(`✅ Loaded cached prices (last updated: ${priceData.lastUpdated})`);
            
            // Create a price lookup map for quick access
            const priceMap = new Map<number, any>();
            priceData.prices.forEach((item: any) => {
              priceMap.set(item.appid, item.price_overview);
            });
            
            // Apply cached prices to games
            gamesWithPricing = games.map(game => {
              const cachedPrice = priceMap.get(game.appid);
              if (cachedPrice) {
                return {
                  ...game,
                  price_overview: cachedPrice
                };
              }
              return game; // Keep default price if no cached data
            });
            
            console.log(`📊 Applied cached pricing to ${gamesWithPricing.length} games`);
            setLoadingProgress(80);
            
            // Show cache status
            if (priceData.isStale) {
              console.warn(`⚠️ Price cache is ${priceData.hoursSinceUpdate} hours old (stale)`);
            } else {
              console.log(`✅ Price cache is fresh (${priceData.hoursSinceUpdate} hours old)`);
            }
          } else {
            console.warn('❌ Failed to load cached prices, using default prices');
          }
        } catch (error) {
          console.error('❌ Error loading cached prices:', error);
        }
        
        // Add player data
        const mockPlayers = {
          286160: { current: 15420, peak: 45000 }, // Tabletop Simulator
          3097560: { current: 120, peak: 800 },    // Liar's Bar
          965580: { current: 1560, peak: 7800 },   // Root
          1054490: { current: 2340, peak: 8500 },  // Wingspan
          1689500: { current: 890, peak: 4200 },   // Dune: Imperium
          403120: { current: 320, peak: 1200 },    // THE GAME OF LIFE
          1455630: { current: 450, peak: 2500 },   // THE GAME OF LIFE 2
          3174070: { current: 3200, peak: 12000 }, // Texas Hold'em Poker: Pokerist
          2347080: { current: 1200, peak: 6500 },  // Frosthaven
          780290: { current: 1890, peak: 12000 },  // Gloomhaven
          2477010: { current: 3200, peak: 12000 }, // Ticket to Ride®
          470220: { current: 4500, peak: 15000 },  // UNO
          1722870: { current: 890, peak: 4200 },   // Clank!
          1128810: { current: 1200, peak: 6500 },  // RISK: Global Domination
          2506480: { current: 450, peak: 2500 },   // Clue/Cluedo
          794800: { current: 380, peak: 1500 },    // Clue/Cluedo: Classic Edition
          1722860: { current: 890, peak: 4200 },   // Munchkin Digital
          2999030: { current: 1200, peak: 6500 },  // Exploding Kittens® 2
          1722840: { current: 890, peak: 4200 },   // Everdell
          800270: { current: 1200, peak: 6500 },   // Terraforming Mars
          1862520: { current: 120, peak: 800 },    // Just Go
          2438970: { current: 1200, peak: 6500 },  // Cascadia
          598810: { current: 680, peak: 2100 },    // Carcassonne - Tiles & Tactics
          1236720: { current: 890, peak: 4200 },   // Spirit Island
          544730: { current: 1800, peak: 8000 },   // Catan Universe
          2438990: { current: 1200, peak: 6500 },  // Ark Nova
          2739990: { current: 3200, peak: 12000 }, // Mahjong Soul
          1131620: { current: 890, peak: 4200 },   // Dominion
          376680: { current: 1200, peak: 6500 },   // Splendor
          1933490: { current: 450, peak: 2500 },   // Let's Play! Oink Games
          718560: { current: 890, peak: 4200 },    // Scythe: Digital Edition
          2749100: { current: 120, peak: 800 },    // Dawnmaker
          1677980: { current: 890, peak: 4200 },   // Unmatched: Digital Edition
          235620: { current: 1200, peak: 6500 },   // Small World
          965590: { current: 890, peak: 4200 },    // Sagrada
          943410: { current: 890, peak: 4200 },    // Istanbul: Digital Edition
          2879570: { current: 890, peak: 4200 },   // Barrage
          648750: { current: 890, peak: 4200 },    // Tokaido
          720620: { current: 1200, peak: 6500 },   // TaleSpire
          2929170: { current: 450, peak: 2500 },   // MONOPOLY 2024
          2383760: { current: 380, peak: 1500 },   // Monopoly Madness
          893050: { current: 450, peak: 2500 },    // Hasbro's BATTLESHIP
          1075190: { current: 420, peak: 1800 },   // A Game of Thrones: The Board Game - Digital Edition
          865160: { current: 890, peak: 4200 },    // Takenoko
          926520: { current: 890, peak: 4200 },    // Love letter
          528180: { current: 890, peak: 4200 },    // Agricola: All Creatures Big and Small
          528250: { current: 890, peak: 4200 },    // Patchwork
          511820: { current: 890, peak: 4200 },    // Le Havre: The Inland Port
          279480: { current: 120, peak: 800 },     // Abalone
          3411830: { current: 890, peak: 4200 },   // Cards, the Universe and Everything
          601510: { current: 3200, peak: 12000 },  // Yu-Gi-Oh! Duel Links
          1449850: { current: 4500, peak: 15000 }, // Yu-Gi-Oh! Master Duel
          2141910: { current: 3200, peak: 12000 }, // Magic: The Gathering Arena
        };

        // Add player data to games
        const finalGames = gamesWithPricing.map(game => {
          const mockData = mockPlayers[game.appid as keyof typeof mockPlayers];
          return {
            ...game,
            current_players: mockData?.current || 0,
            peak_players: mockData?.peak || 0,
            total_owners: 0
          };
        });
        
        setLoadingProgress(100);
        setSteamGames(finalGames);
        console.log('Successfully loaded', finalGames.length, 'games with live pricing and local images');
        
      } catch (error) {
        console.error('Error loading games:', error);
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
          console.log('🔍 Digital Corner chat loaded:', data.chat);
          console.log('📊 Participants:', data.chat.participants?.length || 0);
          console.log('💬 Messages:', data.chat.messages?.length || 0);
          setChatMessages(data.chat.messages || []);
          setOnlineUsers(data.chat.participants?.length || 0);
          
          // Join the chat if authenticated
          if (isAuthenticated && user && socket) {
            console.log('👤 Joining Digital Corner chat as:', user.username);
            
            // Join user to chat room
            const joinResponse = await fetch('/api/digital-corner/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id })
            });
            
            const joinData = await joinResponse.json();
            console.log('📝 Join response:', joinData);
            
            // Join socket room
            console.log('🔌 Emitting join-chat for digital-corner-public');
            socket.emit('join-chat', 'digital-corner-public');
          } else {
            console.log('❌ Cannot join chat - Auth:', isAuthenticated, 'User:', !!user, 'Socket:', !!socket);
          }
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
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
      if (data.chatId === 'digital-corner-public') {
        console.log('🔄 Digital Corner user count updated:', data.userCount);
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
    const fetchResetInfo = async () => {
      try {
        const response = await fetch('/api/digital-corner/chat/reset');
        const data = await response.json();
        if (data.success) {
          setNextResetTime(data.nextResetTime);
        }
      } catch (error) {
        console.error('Error fetching reset info:', error);
      }
    };

    fetchResetInfo();

    // Set up a timer to check for midnight reset
    const checkForReset = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // If it's midnight (00:00), trigger a chat refresh
      if (hours === 0 && minutes === 0) {
        console.log('🕐 Midnight detected - refreshing chat messages');
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
            console.error('Error refreshing chat after reset:', error);
          }
        }, 1000); // Wait 1 second after midnight
      }
    };

    // Check every minute
    const resetTimer = setInterval(checkForReset, 60000);

    return () => clearInterval(resetTimer);
  }, []);

  // Filter and sort games based on selected criteria
  useEffect(() => {
    console.log('Filtering games, steamGames length:', steamGames.length);
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
    
    console.log('Filtered games length:', sortedGames.length);
    setFilteredGames(sortedGames);
    setDisplayedGames(steamGames.length); // Show all games when sorting changes
  }, [steamGames, sortBy]);


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
        chatId: 'digital-corner-public',
        content: newMessage.trim(),
        senderId: user.id,
        type: 'text'
      });
      setNewMessage('');
      
      // Stop typing indicator
      if (isTyping) {
        socket.emit('typing-stop', {
          chatId: 'digital-corner-public',
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
        chatId: 'digital-corner-public',
        userId: user.id,
        username: user.username
      });
      setIsTyping(true);
    }

    // Stop typing indicator if message is empty
    if (isTyping && e.target.value.length === 0) {
      socket.emit('typing-stop', {
        chatId: 'digital-corner-public',
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
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back Button + Icon + Title */}
            <div className="flex items-center space-x-3">
              <BackButton />
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbae17' }}>
                <Image
                  src="/PCIcon.svg"
                  alt="Digital Corner"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Digital Corner</h1>
            </div>
            
            {/* Center: Highlighted Description */}
            <div className="flex-1 mx-8 flex justify-center">
              <div className="rounded-lg px-4 py-2" style={{ backgroundColor: '#fbae17' }}>
                <p className="text-sm text-black font-bold text-center">
                  Discover popular board games in their virtual versions, chat with other players and find friends to play with
                </p>
              </div>
            </div>
            
            {/* Right: Connection Status */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${isAuthenticated && isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isAuthenticated && isConnected ? 'Connected' : 'Not Connected'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Steam Games Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6 h-[700px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Digital Board Games</h2>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {steamGames.length} games
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'popularity' | 'name')}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="popularity">Most Players Online</option>
                    <option value="name">Alphabetical</option>
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
                        <span>Loading games...</span>
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
                    <div className="text-gray-500 text-lg">No games found</div>
                    <div className="text-gray-400 text-sm">Try refreshing the page</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      console.log('Rendering games, filteredGames length:', filteredGames.length, 'displayedGames:', displayedGames);
                      return null;
                    })()}
                    {filteredGames.slice(0, displayedGames).map((game, index) => (
                      <div key={`${game.appid}-${index}`} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start space-x-4">
                          {game.header_image ? (
                            <img 
                              src={game.header_image} 
                              alt={game.name}
                              className="w-28 h-[65px] object-cover rounded flex-shrink-0"
                            />
                          ) : (
                            <div className="w-28 h-[65px] bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                              <Gamepad2 className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium text-gray-900">{game.name}</h3>
                              <div className="flex items-center space-x-2">
                                {!game.price_overview ? (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm">
                                    FREE
                                  </span>
                                ) : game.price_overview.final === 0 ? (
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm">
                                    FREE
                                  </span>
                                ) : game.price_overview.final_formatted ? (
                                  <div className="flex items-center space-x-2">
                                    {game.price_overview.discount_percent > 0 ? (
                                      <>
                                        <div className="flex items-center space-x-2">
                                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm">
                                            {game.price_overview.final_formatted}
                                          </span>
                                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-500 line-through">
                                            {game.price_overview.initial_formatted}
                                          </span>
                                        </div>
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
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <a
                                  href={game.steam_url || `https://store.steampowered.com/app/${game.appid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>View on Steam</span>
                                </a>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                {game.current_players !== undefined && (
                                  <span className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>{game.current_players.toLocaleString()} online</span>
                                  </span>
                                )}
                                {game.peak_players && (
                                  <span>Peak: {game.peak_players.toLocaleString()}</span>
                                )}
                                {game.has_community_visible_stats && (
                                  <span className="text-green-600">Community</span>
                                )}
                              </div>
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
          <div className="space-y-6">
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
                          {nextResetTime && (
                            <div className="flex items-center space-x-1 text-xs text-gray-400">
                              <span>🕐</span>
                              <span>Resets at midnight</span>
                            </div>
                          )}
                        </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {!isAuthenticated ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">Join the conversation!</p>
                      <p className="text-sm">Please log in to see messages and chat with other users.</p>
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
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </div>
  );
}