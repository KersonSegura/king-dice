'use client';

import GameSearch from '@/components/GameSearch';
import GameCardWithVote from '@/components/GameCardWithVote';
import ModernTooltip from '@/components/ModernTooltip';
import PixelCanvasPreview from '@/components/PixelCanvasPreview';
import Feed from '@/components/Feed';
import { BookOpen, Users, Star, Globe, Search, Clock, Calendar, Crown, Square, Plus } from 'lucide-react';
import HomePageFooter from '@/components/HomePageFooter';
import { ArrowUp, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useChatState } from '@/contexts/ChatStateContext';
import { useAuth } from '@/contexts/AuthContext';

// Custom hook for intersection observer
function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options, hasIntersected]);

  return [ref, isIntersecting, hasIntersected] as const;
}

// Lazy loading wrapper component
function LazySection({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [ref, isIntersecting, hasIntersected] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });

  return (
    <div ref={ref}>
      {hasIntersected ? children : fallback}
    </div>
  );
}

interface Game {
  id: number;
  bggId: number;
  name: string;
  year: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  image: string | null;
  ranking: number | null;
  averageRating: number | null;
  numVotes: number | null;
  userRating?: number | null;
  userVotes?: number;
  expansions?: number | null;
  category?: string;
}

type GalleryImage = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  author: { id: string; name: string; avatar: string; reputation: number };
  category: string;
  createdAt: string;
  votes: { upvotes: number; downvotes: number };
  views: number;
  downloads: number;
  comments: number;
};

export default function HomePage() {
  const { isChatOpen, selectedChat } = useChatState();
  const { user, isAuthenticated } = useAuth();
  const [hotGames, setHotGames] = useState<Game[]>([]);
  const [topRankedGames, setTopRankedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(6);
  const [forumStats, setForumStats] = useState({
    general: { posts: 0, replies: 0 },
    strategy: { posts: 0, replies: 0 },
    reviews: { posts: 0, replies: 0 }
  });
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [boardleMode, setBoardleMode] = useState<'title' | 'image' | 'card'>('title');
  const [timeUntilNextGame, setTimeUntilNextGame] = useState('');
  
  
  useEffect(() => {
    const fetchGames = async () => {
      try {
        console.log('🔍 Fetching games...');
        
        // Fetch hot games
        const hotResponse = await fetch(`/api/games/popular?category=hot&limit=${currentLimit}`);
        const hotData = await hotResponse.json();
        setHotGames(hotData.games || []);
        
        // Fetch top ranked games
        const rankedResponse = await fetch(`/api/games/ranked?limit=${currentLimit}`);
        const rankedData = await rankedResponse.json();
        setTopRankedGames(rankedData.games || []);
        
      } catch (error) {
        console.error('❌ Error fetching games:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchForumStats = async () => {
      try {
        const response = await fetch('/api/posts');
        if (response.ok) {
          const data = await response.json();
          const posts = data.posts || [];
          
          // Calculate statistics for each category
          const stats = {
            general: { posts: 0, replies: 0 },
            strategy: { posts: 0, replies: 0 },
            reviews: { posts: 0, replies: 0 }
          };
          
          posts.forEach((post: any) => {
            if (stats[post.category as keyof typeof stats]) {
              stats[post.category as keyof typeof stats].posts++;
              stats[post.category as keyof typeof stats].replies += post.replies || 0;
            }
          });
          
          setForumStats(stats);
        }
      } catch (error) {
        console.error('❌ Error fetching forum stats:', error);
      }
    };

    fetchGames();
    fetchForumStats();
  }, [currentLimit]);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setGalleryLoading(true);
        const res = await fetch('/api/gallery');
        if (res.ok) {
          const data = await res.json();
          setGalleryImages(data.images || []);
        }
      } catch (e) {
        console.error('❌ Error fetching gallery for homepage:', e);
      } finally {
        setGalleryLoading(false);
      }
    };
    fetchGallery();
  }, []);

  const featuredKingsCard = useMemo(() => {
    const candidates = galleryImages.filter(img => img.category === 'the-kings-card');
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => {
      const bestScore = best.votes.upvotes - best.votes.downvotes;
      const currScore = curr.votes.upvotes - curr.votes.downvotes;
      if (currScore !== bestScore) return currScore > bestScore ? curr : best;
      return new Date(curr.createdAt).getTime() > new Date(best.createdAt).getTime() ? curr : best;
    });
  }, [galleryImages]);

  const featuredDiceThrone = useMemo(() => {
    const candidates = galleryImages.filter(img => img.category === 'dice-throne');
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => {
      const bestScore = best.votes.upvotes - best.votes.downvotes;
      const currScore = curr.votes.upvotes - curr.votes.downvotes;
      if (currScore !== bestScore) return currScore > bestScore ? curr : best;
      return new Date(curr.createdAt).getTime() > new Date(best.createdAt).getTime() ? curr : best;
    });
  }, [galleryImages]);

  const otherGallery = useMemo(() => {
    const excludeIds = new Set<string>();
    if (featuredKingsCard) excludeIds.add(featuredKingsCard.id);
    if (featuredDiceThrone) excludeIds.add(featuredDiceThrone.id);
    return galleryImages.filter(img => !excludeIds.has(img.id));
  }, [galleryImages, featuredKingsCard, featuredDiceThrone]);


  // Countdown timer for next Boardle game
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextGame = new Date();
      
      // Set next game to next midnight (00:00 UTC)
      nextGame.setUTCHours(24, 0, 0, 0);
      
      const timeDiff = nextGame.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        // If it's past midnight, set to tomorrow's midnight
        nextGame.setUTCDate(nextGame.getUTCDate() + 1);
        const newTimeDiff = nextGame.getTime() - now.getTime();
        updateTimeDisplay(newTimeDiff);
      } else {
        updateTimeDisplay(timeDiff);
      }
    };

    const updateTimeDisplay = (timeDiff: number) => {
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeUntilNextGame(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeUntilNextGame(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilNextGame(`${seconds}s`);
      }
    };

    // Update immediately
    updateCountdown();
    
    // Update every second
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);


  const loadMoreGames = async () => {
    try {
      setLoadingMore(true);
      const newLimit = currentLimit + 6;
      
      // Fetch more hot games
      const hotResponse = await fetch(`/api/games/popular?category=hot&limit=${newLimit}`);
      const hotData = await hotResponse.json();
      setHotGames(hotData.games || []);
      
      // Fetch more top ranked games
      const rankedResponse = await fetch(`/api/games/ranked?limit=${newLimit}`);
      const rankedData = await rankedResponse.json();
      setTopRankedGames(rankedData.games || []);
      
      setCurrentLimit(newLimit);
    } catch (error) {
      console.error('❌ Error loading more games:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const formatPlayers = (min: number | null, max: number | null) => {
    if (!min || !max) return 'N/A';
    return min === max ? `${min}` : `${min}-${max}`;
  };

  const formatPlayTime = (min: number | null, max: number | null) => {
    if (!min || !max) return 'N/A';
    return min === max ? `${min} min` : `${min}-${max} min`;
  };



  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="bg-gray-900 py-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-8">
            Find your favorite{' '}
            <span className="text-[#fbae17]">board games</span>
          </h1>
          
          <div className="mb-12">
            <GameSearch />
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-300">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-[#fbae17]" />
              <span>+10,000 games</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-[#fbae17]" />
              <span>Live Community</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-[#fbae17]" />
              <span>Verified quality</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-[#fbae17]" />
              <span>Active forums</span>
            </div>
          </div>
          

          {/* Social Media Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <ModernTooltip content="Join our Discord" position="top" bgColor="bg-[#fbae17]" textColor="text-white">
              <a
                href="https://discord.gg/3xh7yUnnnW"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
            </ModernTooltip>
            
            <ModernTooltip content="Follow on X" position="top" bgColor="bg-[#fbae17]" textColor="text-white">
              <a
                href="https://x.com/KingDiceHub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </ModernTooltip>
            
            <ModernTooltip content="Follow on Instagram" position="top" bgColor="bg-[#fbae17]" textColor="text-white">
              <a
                href="https://www.instagram.com/kingdice.gg/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </ModernTooltip>
          </div>
        </div>
      </section>

      {/* Community Feed Section */}
      <section id="community-feed" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-900 mb-4 flex items-center justify-center gap-3">
              <Users className="w-8 h-8 text-primary-500" />
              Community Feed
            </h2>
            <p className="text-dark-600 max-w-2xl mx-auto">
              Discover what the community is sharing - from game setups to strategy discussions and more!
            </p>
          </div>
          
          <Feed userId={user?.id} limit={10} />
        </div>
      </section>

      {/* Hot Games Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-dark-900 mb-4 flex items-center justify-center gap-3">
              <Image 
                src="/FireIcon.svg" 
                alt="Fire Icon" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
              Hot Games
            </h2>
            <p className="text-dark-600 max-w-2xl mx-auto">
              Games that are currently trending.
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
              ))}
            </div>
          ) : hotGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotGames.map((game) => (
                <GameCardWithVote key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <p className="font-bold">No hot games available</p>
                <p>Games will be loaded soon from the database.</p>
              </div>
            </div>
          )}

          <div className="text-center mt-8">
            <Link href="/hot-games" className="btn-primary">
              View All Hot Games
            </Link>
          </div>
        </div>
      </section>

      {/* Top Ranked Games Section */}
      <section className="py-16 bg-dark-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-dark-900 mb-4 flex items-center justify-center gap-3">
              <Image 
                src="/TrophyIcon.svg" 
                alt="Trophy Icon" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
              Top Ranked Games
            </h2>
            <p className="text-dark-600 max-w-2xl mx-auto">
              The best board games according to historical ranking. These are the games with the best average rating of all time.
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
              ))}
            </div>
          ) : topRankedGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topRankedGames.map((game) => (
                <GameCardWithVote key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <p className="font-bold">No top ranked games available</p>
                <p>Games will be loaded soon from the database.</p>
              </div>
            </div>
          )}

          <div className="text-center mt-8">
            <Link href="/top-ranked" className="btn-primary">
              View All Top Ranked Games
            </Link>
          </div>
        </div>
      </section>

      {/* Forums Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-dark-900 mb-4 flex items-center justify-center gap-3">
              <Image 
                src="/ForumsIcon.svg" 
                alt="Forums Icon" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
              Community Forums
            </h2>
            <p className="text-dark-600 max-w-2xl mx-auto">
              Join the conversation! Discuss strategies, share experiences, and connect with fellow board game enthusiasts.
            </p>
          </div>
          
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* Forum Categories */}
             <Link href="/forums?category=general" className="block">
               <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
                 <div className="flex items-center space-x-3 mb-4">
                   <Image
                     src="/GeneralDiscussionIcon.svg"
                     alt="General Discussion"
                     width={24}
                     height={24}
                     className="w-6 h-6"
                   />
                   <h3 className="text-lg font-semibold text-dark-900">General Discussion</h3>
                 </div>
                <p className="text-dark-600 text-sm mb-4">
                  Share your thoughts on board games, ask questions, and engage in general discussions.
                </p>
                <div className="flex items-center justify-between text-sm text-dark-500">
                  <span>{forumStats.general.posts} posts</span>
                  <span>{forumStats.general.replies} replies</span>
                </div>
               </div>
             </Link>

             <Link href="/forums?category=strategy" className="block">
               <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
                 <div className="flex items-center space-x-3 mb-4">
                   <Image
                     src="/Strategy&TipsIcon.svg"
                     alt="Strategy & Tips"
                     width={24}
                     height={24}
                     className="w-6 h-6"
                   />
                   <h3 className="text-lg font-semibold text-dark-900">Strategy & Tips</h3>
                 </div>
                <p className="text-dark-600 text-sm mb-4">
                  Discuss winning strategies, share tips, and help others improve their gameplay.
                </p>
                <div className="flex items-center justify-between text-sm text-dark-500">
                  <span>{forumStats.strategy.posts} posts</span>
                  <span>{forumStats.strategy.replies} replies</span>
                </div>
               </div>
             </Link>

             <Link href="/forums?category=reviews" className="block">
               <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
                 <div className="flex items-center space-x-3 mb-4">
                   <Image
                     src="/Reviews&RecommendationsIcon.svg"
                     alt="Reviews & Recommendations"
                     width={24}
                     height={24}
                     className="w-6 h-6"
                   />
                   <h3 className="text-lg font-semibold text-dark-900">Reviews & Recommendations</h3>
                 </div>
                <p className="text-dark-600 text-sm mb-4">
                  Share your game reviews and get recommendations from the community.
                </p>
                <div className="flex items-center justify-between text-sm text-dark-500">
                  <span>{forumStats.reviews.posts} posts</span>
                  <span>{forumStats.reviews.replies} replies</span>
                </div>
               </div>
             </Link>
           </div>

                     <div className="text-center mt-8">
             <Link href="/forums" className="btn-primary">
               Join the Discussion
             </Link>
           </div>
           
        </div>
      </section>

      {/* Community Images Section */}
      <section className="py-16 bg-dark-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-dark-900 mb-4 flex items-center justify-center gap-3">
              <Image 
                src="/GalleryIcon.svg" 
                alt="Gallery Icon" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
              Community Gallery
            </h2>
            <p className="text-dark-600 max-w-2xl mx-auto">
              The latest highlights from our community.
            </p>
          </div>

          {galleryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse rounded-lg aspect-square"></div>
              ))}
            </div>
          ) : (
            <>
              {/* Centered featured tiles - Dice first, Card second */}
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
                <div className="flex justify-center">
                  <Link href={featuredDiceThrone ? `/community-gallery?image=${featuredDiceThrone.id}` : '/community-gallery'}>
                    <div className={`relative rounded-lg overflow-hidden ${featuredDiceThrone ? 'border-2 border-[#fbae17] shadow-lg' : 'border border-dashed border-gray-300'} bg-white w-64 md:w-80 lg:w-80 cursor-pointer hover:opacity-90 transition-opacity`} style={{ aspectRatio: '1 / 1.1' }}>
                      {featuredDiceThrone ? (
                        <>
                          <div className="absolute inset-0 bottom-8">
                            <Image src={featuredDiceThrone.thumbnailUrl} alt={featuredDiceThrone.title} fill className="object-cover" loading="lazy" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 flex items-center justify-center">
                            <div className="flex items-center space-x-2 text-white text-sm font-semibold">
                              <Crown className="w-4 h-4" />
                              <span>Dice of the Week</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm text-center px-2">
                          Dice Throne featured spot
                        </div>
                      )}
                    </div>
                  </Link>
                </div>

                <div className="flex justify-center">
                  <Link href={featuredKingsCard ? `/community-gallery?image=${featuredKingsCard.id}` : '/community-gallery'}>
                    <div className={`relative rounded-lg overflow-hidden ${featuredKingsCard ? 'border-2 border-[#fbae17] shadow-lg' : 'border border-dashed border-gray-300'} bg-white w-64 md:w-80 lg:w-80 cursor-pointer hover:opacity-90 transition-opacity`} style={{ aspectRatio: '1 / 1.1' }}>
                      {featuredKingsCard ? (
                        <>
                          <div className="absolute inset-0 bottom-8">
                            <Image src={featuredKingsCard.thumbnailUrl} alt={featuredKingsCard.title} fill className="object-cover" loading="lazy" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 flex items-center justify-center">
                            <div className="flex items-center space-x-2 text-white text-sm font-semibold">
                              <Crown className="w-4 h-4" />
                              <span>Card of the Week</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm text-center px-2">
                          The King's Card featured spot
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              </div>

              {/* Other images */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                {otherGallery.slice(0, 4).map(img => (
                  <Link key={img.id} href={`/community-gallery?image=${img.id}`}>
                    <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white aspect-square cursor-pointer hover:opacity-90 transition-opacity">
                      <Image src={img.thumbnailUrl} alt={img.title} fill className="object-cover" loading="lazy" />
                    </div>
                  </Link>
                ))}

                {/* See More Button */}
                <Link href="/community-gallery">
                  <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 aspect-square cursor-pointer hover:border-[#fbae17] hover:bg-[#fbae17]/5 transition-all duration-200 group">
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-[#fbae17] transition-colors">
                      <Plus className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">See More</span>
                    </div>
                  </div>
                </Link>

                {otherGallery.length === 0 && (
                  <div className="col-span-2 md:col-span-3 lg:col-span-5 text-center text-gray-400 py-8 border border-dashed border-gray-300 rounded-lg">
                    No community images yet.
                  </div>
                )}
              </div>

              <div className="text-center mt-8">
                <Link href="/community-gallery" className="btn-primary">
                  View All Photos
                </Link>
              </div>
            </>
          )}

        </div>
      </section>

      {/* Pixel Canvas Section */}
      <LazySection fallback={
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
                <h2 className="text-3xl font-bold text-dark-900">Pixel Canvas</h2>
              </div>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Join the community in creating collaborative<span className="sm:hidden"><br /></span><span className="hidden sm:inline"> </span>pixel art!
              </p>
              
              {/* Stats */}
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 mt-3">
                <div className="flex items-center space-x-1">
                  <Square className="w-4 h-4" />
                  <span>40,000 pixels</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>1 users</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>30s cooldown per pixel</span>
                </div>
              </div>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading canvas...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      }>
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                </svg>
                <h2 className="text-3xl font-bold text-dark-900">Pixel Canvas</h2>
              </div>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Join the community in creating collaborative<span className="sm:hidden"><br /></span><span className="hidden sm:inline"> </span>pixel art!
              </p>
              
              {/* Stats */}
              <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 mt-3">
                <div className="flex items-center space-x-1">
                  <Square className="w-4 h-4" />
                  <span>40,000 pixels</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>1 users</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>30s cooldown per pixel</span>
                </div>
              </div>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                
                <Link href="/pixel-canvas" className="block cursor-pointer hover:opacity-90 transition-opacity">
                  <PixelCanvasPreview />
                </Link>
                
                <div className="text-center mt-6">
                  <Link href="/pixel-canvas" className="btn-primary">
                    Place a Pixel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </LazySection>

      {/* Boardle Section */}
      <LazySection fallback={
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-dark-900 mb-4">Boardle</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Guess the daily board game in 6 tries! Three different modes to challenge your knowledge.
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Boardle...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      }>
        <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">Boardle</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Guess the daily board game in 6 tries!<br />
              Three different modes to challenge your knowledge.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Game Mode Tabs Preview */}
              <div className="mb-8">
                <div className="flex justify-center space-x-1 bg-gray-100 p-1 rounded-lg max-w-lg mx-auto">
                  <button 
                    onClick={() => setBoardleMode('title')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                      boardleMode === 'title' 
                        ? 'bg-[#4B86FE] text-white shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${boardleMode === 'title' ? 'bg-white' : 'bg-gray-400'}`}></span>
                    <span>Title Mode</span>
                  </button>
                  <button 
                    onClick={() => setBoardleMode('image')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                      boardleMode === 'image' 
                        ? 'bg-[#4B86FE] text-white shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${boardleMode === 'image' ? 'bg-white' : 'bg-gray-400'}`}></span>
                    <span>Image Mode</span>
                  </button>
                  <button 
                    onClick={() => setBoardleMode('card')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                      boardleMode === 'card' 
                        ? 'bg-[#4B86FE] text-white shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${boardleMode === 'card' ? 'bg-white' : 'bg-gray-400'}`}></span>
                    <span>Card Mode</span>
                  </button>
                </div>
              </div>
              
              {/* Game Content Preview */}
              <div className="mb-8">
                <div className="text-center text-sm text-gray-500 mb-4">Today's Mystery Game</div>
                
                {boardleMode === 'title' && (
                  <>
                    {/* Title Mode - Guess Rows */}
                    <div className="space-y-2 mb-4">
                      {/* First guess - SCORE (C in wrong position) */}
                      <div className="flex items-center gap-3 justify-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>
                          1
                  </div>
                        <div className="flex gap-1">
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                          <div className="w-8 h-8 bg-yellow-500 text-white border-2 border-yellow-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">O</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">R</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">E</div>
                </div>
                  </div>

                      {/* Second guess - CHESS */}
                      <div className="flex items-center gap-3 justify-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>
                          2
                </div>
                        <div className="flex gap-1">
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">H</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">E</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                  </div>
                      </div>

                      {/* Third guess - CARDS */}
                      <div className="flex items-center gap-3 justify-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>
                          3
                        </div>
                        <div className="flex gap-1">
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">R</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">D</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                </div>
            </div>

                      {/* Fourth guess - CANDY */}
                      <div className="flex items-center gap-3 justify-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>
                          4
                        </div>
                        <div className="flex gap-1">
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                          <div className="w-8 h-8 bg-yellow-500 text-white border-2 border-yellow-500 rounded flex items-center justify-center text-sm font-bold">N</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">D</div>
                          <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">Y</div>
                        </div>
                      </div>

                      {/* Fifth guess - CATAN (CORRECT!) */}
                      <div className="flex items-center gap-3 justify-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>
                          5
                        </div>
                        <div className="flex gap-1">
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">T</div>
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                          <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">N</div>
                        </div>
                      </div>

                      {/* Sixth guess - empty */}
                      <div className="flex items-center gap-3 justify-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>
                          6
                        </div>
                        <div className="flex gap-1">
                          {['_', '_', '_', '_', '_'].map((_, i) => (
                    <div key={i} className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center">
                      <span className="text-sm text-gray-400">{_}</span>
                    </div>
                  ))}
                        </div>
                </div>
              </div>
              
                    {/* Letter Status */}
                    <div className="mb-6 pt-6">
                      <div className="text-sm text-gray-600 mb-3 text-center">Correct Letters Found</div>
                      <div className="flex gap-2 justify-center flex-wrap">
                        <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                        <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                        <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">T</div>
                        <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                        <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">N</div>
                      </div>
                    </div>
                  </>
                )}

                                 {boardleMode === 'image' && (
                   <>
                     <div className="flex gap-4 sm:gap-6 items-start justify-center">
                       {/* Image Mode - Letter Grid (Left) */}
                       <div className="w-64 sm:w-80">
                         <div className="space-y-2 mb-4">
                           {/* First guess - SCORE (C in wrong position) */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>1</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                               <div className="w-8 h-8 bg-yellow-500 text-white border-2 border-yellow-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">O</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">R</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">E</div>
                             </div>
                           </div>

                           {/* Second guess - CHESS */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>2</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">H</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">E</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                             </div>
                           </div>

                           {/* Third guess - CARDS */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>3</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">R</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">D</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                             </div>
                           </div>

                           {/* Fourth guess - CANDY */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>4</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">N</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">D</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">Y</div>
                             </div>
                           </div>

                           {/* Fifth guess - CATAN (CORRECT!) */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>5</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">T</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">N</div>
                             </div>
                           </div>

                           {/* Sixth guess - empty */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>6</div>
                             <div className="flex gap-1">
                               {['_', '_', '_', '_', '_'].map((_, i) => (
                                 <div key={i} className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center">
                                   <span className="text-sm text-gray-400">{_}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         </div>
                       </div>

                       {/* Image Mode - Zoomed Image (Right) */}
                       <div className="w-32 sm:w-48">
                         <div className="text-center text-xs sm:text-sm text-gray-600 mb-4">
                           Start with a very<br />
                           zoomed-in image
                         </div>
                         <div className="flex justify-center">
                           <div className="relative w-32 h-32 sm:w-48 sm:h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                             <Image
                               src="/boardle-images/066-catan.jpg"
                               alt="Zoomed in game image"
                               fill
                               className="object-cover scale-150"
                               style={{ transform: 'scale(3) translate(20%, 20%)' }}
                             />
                             <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                             <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                               Guess 1/6
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Letter Status - Centered across full width */}
                     <div className="pt-6">
                       <div className="text-sm text-gray-600 mb-3 text-center">Correct Letters Found</div>
                       <div className="flex gap-2 justify-center flex-wrap">
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">T</div>
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">N</div>
                       </div>
                     </div>
                   </>
                 )}

                                 {boardleMode === 'card' && (
                   <>
                     <div className="flex gap-4 sm:gap-6 items-start justify-center">
                       {/* Card Mode - Letter Grid (Left) */}
                       <div className="w-64 sm:w-80">
                         <div className="space-y-2 mb-4">
                           {/* First guess - SCORE (C in wrong position) */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>1</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                               <div className="w-8 h-8 bg-yellow-500 text-white border-2 border-yellow-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">O</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">R</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">E</div>
                             </div>
                           </div>

                           {/* Second guess - CHESS */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>2</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">H</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">E</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                             </div>
                           </div>

                           {/* Third guess - CARDS */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>3</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">R</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">D</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">S</div>
                             </div>
                           </div>

                           {/* Fourth guess - CANDY */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>4</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">N</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">D</div>
                               <div className="w-8 h-8 bg-gray-400 text-white border-2 border-gray-400 rounded flex items-center justify-center text-sm font-bold">Y</div>
                             </div>
                           </div>

                           {/* Fifth guess - CATAN (CORRECT!) */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>5</div>
                             <div className="flex gap-1">
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">T</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                               <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">N</div>
                             </div>
                           </div>

                           {/* Sixth guess - empty */}
                           <div className="flex items-center gap-3 justify-center">
                             <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: '#4B86FE' }}>6</div>
                             <div className="flex gap-1">
                               {['_', '_', '_', '_', '_'].map((_, i) => (
                                 <div key={i} className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center">
                                   <span className="text-sm text-gray-400">{_}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         </div>
                       </div>

                       {/* Card Mode - Full Card Image (Right) */}
                       <div className="w-32 sm:w-48">
                         <div className="flex justify-center">
                           <div className="relative w-32 h-40 sm:w-48 sm:h-60 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                             <Image
                               src="/boardle-images/cards/002-catan.jpg"
                               alt="Game card"
                               fill
                               className="object-contain scale-90"
                             />
                           </div>
                         </div>
                       </div>
                     </div>

                     {/* Letter Status - Centered across full width */}
                     <div className="pt-6">
                       <div className="text-sm text-gray-600 mb-3 text-center">Correct Letters Found</div>
                       <div className="flex gap-2 justify-center flex-wrap">
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">C</div>
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">T</div>
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">A</div>
                         <div className="w-8 h-8 bg-green-500 text-white border-2 border-green-500 rounded flex items-center justify-center text-sm font-bold">N</div>
                       </div>
                     </div>
                   </>
                 )}
              </div>


              {/* Call to Action */}
              <div className="text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    <span>New game in {timeUntilNextGame || 'calculating...'}</span>
                  </div>
                </div>
                <Link href="/boardle" className="btn-primary text-lg px-8 py-3">
                  Play Boardle Now
              </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      </LazySection>




      {/* Enhanced Homepage Footer */}
      <div className="mt-auto">
        <HomePageFooter />
      </div>
    </div>
  );
} 