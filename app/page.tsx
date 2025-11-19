'use client';

import GameSearch from '@/components/GameSearch';
import GameCardWithVote from '@/components/GameCardWithVote';
import ModernTooltip from '@/components/ModernTooltip';
import PixelCanvasPreview from '@/components/PixelCanvasPreview';
import Feed from '@/components/Feed';
import ImageModal from '@/components/ImageModal';
import { BookOpen, Users, Star, Globe, Search, Clock, Calendar, Crown, Square, Plus } from 'lucide-react';
import HomePageFooter from '@/components/HomePageFooter';
import { useRouter } from 'next/navigation';
import { ArrowUp, MessageCircle, Heart, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useChatState } from '@/contexts/ChatStateContext';
import { useAuth } from '@/contexts/AuthContext';
import SplitText from '@/components/SplitText';
import { fetchJsonWithRetry } from '@/utils/fetchWithRetry';

const BOARDLE_ASSET_BASE =
  'https://yoedvavdopxhehpxsvlt.supabase.co/storage/v1/object/public/boardle-images/boardle-images';
const boardleImagePreview = `${BOARDLE_ASSET_BASE}/066-catan.jpg`;
const boardleCardPreview = `${BOARDLE_ASSET_BASE}/cards/002-catan.jpg`;

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
  bggRanking?: number | null;
  bggRating?: number | null;
  bggVotes?: number | null;
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
  userVote?: 'up' | 'down' | 'none';
};

export default function HomePage() {
  const { isChatOpen, selectedChat } = useChatState();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [hotGames, setHotGames] = useState<Game[]>([]);
  const [topRankedGames, setTopRankedGames] = useState<Game[]>([]);
  const [topRankedVotes, setTopRankedVotes] = useState<Record<number, any>>({});
  const [hotGamesVotes, setHotGamesVotes] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(false);
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
  
  // Modal state
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryImage | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  
  // ImageModal state and handlers
  const [imageComments, setImageComments] = useState<any[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching games...');
        
        // Fetch hot games with retry
        try {
          const hotData = await fetchJsonWithRetry(`/api/games/hotness?limit=${currentLimit}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          }, {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 15000
          });
          console.log('✅ Hot games response:', { count: hotData.games?.length, total: hotData.total });
          const mappedHotGames = (hotData.games || []).map((game: any) => ({
            ...game,
            name: game.name || game.nameEn || 'Unknown Game',
            year: game.year || game.yearRelease,
            minPlayTime: game.minPlayTime || game.durationMinutes,
            maxPlayTime: game.maxPlayTime || game.durationMinutes,
            image: game.image || game.imageUrl || game.thumbnailUrl,
            averageRating: game.userRating,
            numVotes: game.userVotes
          }));
          console.log('📊 Mapped hot games:', mappedHotGames.length);
          setHotGames(mappedHotGames);
          
          // Fetch votes in batch for hot games (non-blocking - don't await)
          if (mappedHotGames.length > 0 && isAuthenticated && user?.id) {
            // Don't await - let games show first, votes will load in background
            const gameIds = mappedHotGames.map((g: any) => g.id).filter((id: any) => id);
            if (gameIds.length > 0) {
              fetchJsonWithRetry('/api/games/votes/batch', {
                method: 'POST',
                cache: 'no-store',
                headers: { 
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache'
                },
                body: JSON.stringify({ gameIds, userId: user.id })
              }, {
                maxRetries: 2,
                retryDelay: 500,
                timeout: 20000
              }).then((votesData) => {
                console.log('✅ Batch votes fetched for hot games:', Object.keys(votesData).length);
                setHotGamesVotes(votesData);
              }).catch((error) => {
                console.error('❌ Error fetching batch votes for hot games:', error);
                // Continue without vote data - cards will fetch individually
              });
            }
          }
        } catch (error) {
          // Only log if it's a final failure (not a retry attempt)
          const errorMessage = error instanceof Error ? error.message : String(error);
          // Don't log retry attempts, only final failures
          if (!errorMessage.includes('Retrying')) {
            console.error('❌ Error fetching hot games:', error);
          }
          // Set empty array on error so loading state clears
          setHotGames([]);
        }
        
        // Fetch top ranked games with retry
        try {
          const rankedData = await fetchJsonWithRetry(`/api/games/most-played?limit=${currentLimit}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          }, {
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 15000
          });
          console.log('✅ Top ranked games response:', { count: rankedData.games?.length, total: rankedData.total });
          const mappedRankedGames = (rankedData.games || []).map((game: any) => ({
            ...game,
            name: game.name || game.nameEn || 'Unknown Game',
            year: game.year || game.yearRelease,
            minPlayTime: game.minPlayTime || game.durationMinutes,
            maxPlayTime: game.maxPlayTime || game.durationMinutes,
            image: game.image || game.imageUrl || game.thumbnailUrl,
            averageRating: game.userRating,
            numVotes: game.userVotes
          }));
          console.log('📊 Mapped ranked games:', mappedRankedGames.length);
          setTopRankedGames(mappedRankedGames);
          
          // Fetch votes in batch for ranked games (non-blocking - don't await)
          if (mappedRankedGames.length > 0 && isAuthenticated && user?.id) {
            // Don't await - let games show first, votes will load in background
            const gameIds = mappedRankedGames.map((g: any) => g.id).filter((id: any) => id);
            if (gameIds.length > 0) {
              fetchJsonWithRetry('/api/games/votes/batch', {
                method: 'POST',
                cache: 'no-store',
                headers: { 
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache'
                },
                body: JSON.stringify({ gameIds, userId: user.id })
              }, {
                maxRetries: 2,
                retryDelay: 500,
                timeout: 20000
              }).then((votesData) => {
                console.log('✅ Batch votes fetched for ranked games:', Object.keys(votesData).length);
                setTopRankedVotes(votesData);
              }).catch((error) => {
                console.error('❌ Error fetching batch votes for ranked games:', error);
                // Continue without vote data - cards will fetch individually
              });
            }
          }
        } catch (error) {
          // Only log if it's a final failure (not a retry attempt)
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('Retrying')) {
            console.error('❌ Error fetching ranked games:', error);
          }
          // Set empty array on error so loading state clears
          setTopRankedGames([]);
        }
        
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
  }, [currentLimit, user?.id, isAuthenticated]);

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

  // Handle URL parameters for opening specific image
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const imageParam = urlParams.get('image');
    if (imageParam && galleryImages.length > 0) {
      const targetImage = galleryImages.find(img => img.id === imageParam);
      if (targetImage) {
        setSelectedGalleryImage(targetImage);
        setShowGalleryModal(true);
        // Load comments for this image
        if (user) {
          fetch(`/api/gallery/comments?imageId=${targetImage.id}&userId=${user.id}`)
            .then(response => response.json())
            .then(data => setImageComments(data.comments || []))
            .catch(error => console.error('Error loading comments:', error));
        }
      }
    }
  }, [galleryImages, user]);

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

  // ImageModal handlers
  const closeImageModal = () => {
    setShowGalleryModal(false);
    setSelectedGalleryImage(null);
    setImageComments([]);
    
    // Remove image parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('image');
    window.history.pushState({}, '', url);
  };

  const handleLike = async (imageId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/gallery/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId,
          voteType: selectedGalleryImage?.userVote === 'up' ? null : 'up',
          userId: user.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (selectedGalleryImage && selectedGalleryImage.id === imageId) {
          setSelectedGalleryImage(result.image);
        }
        // Update gallery images
        setGalleryImages(prevImages => 
          prevImages.map(img => 
            img.id === imageId ? result.image : img
          )
        );
        // Notify other components (e.g., Feed) to update counters live
        try { window.dispatchEvent(new CustomEvent('kd-gallery-image-updated', { detail: { image: result.image } })); } catch {}
      }
    } catch (error) {
      console.error('Error liking image:', error);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/gallery/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: selectedGalleryImage?.id,
          content,
          author: {
            id: user.id,
            name: user.username,
            avatar: user.avatar || '/DiceLogo.svg'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setImageComments(prev => [...prev, data.comment]);
        // Update comment count in local lists and broadcast to feed
        if (selectedGalleryImage) {
          const newCount = (selectedGalleryImage.comments || 0) + 1;
          setSelectedGalleryImage(prev => prev ? { ...prev, comments: newCount } : null);
          setGalleryImages(prev => prev.map(img => img.id === selectedGalleryImage.id ? { ...img, comments: newCount } as any : img));
          try { window.dispatchEvent(new CustomEvent('kd-gallery-comments-updated', { detail: { imageId: selectedGalleryImage.id, comments: newCount } })); } catch {}
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/gallery/comments/${commentId}?userId=${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setImageComments(prev => prev.filter(comment => comment.id !== commentId));
        // Update comment count and broadcast
        if (selectedGalleryImage) {
          const newCount = Math.max((selectedGalleryImage.comments || 0) - 1, 0);
          setSelectedGalleryImage(prev => prev ? { ...prev, comments: newCount } : null);
          setGalleryImages(prev => prev.map(img => img.id === selectedGalleryImage.id ? { ...img, comments: newCount } as any : img));
          try { window.dispatchEvent(new CustomEvent('kd-gallery-comments-updated', { detail: { imageId: selectedGalleryImage.id, comments: newCount } })); } catch {}
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/gallery/comments/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          userId: user.id
        })
      });

      if (response.ok) {
        // Refresh comments to get updated like status
        await refreshComments();
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleReplyToComment = async (commentId: string, content: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/gallery/comments/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          content,
          author: {
            id: user.id,
            name: user.username,
            avatar: user.avatar || '/DiceLogo.svg'
          }
        })
      });

      if (response.ok) {
        // Refresh comments to show the new reply
        await refreshComments();
        
        // Update comment count
        if (selectedGalleryImage) {
          setSelectedGalleryImage(prev => prev ? {
            ...prev,
            comments: (prev.comments || 0) + 1
          } : null);
        }
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
    }
  };

  const handleReportComment = async (commentId: string, reason: string, details?: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/gallery/comments/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          reason,
          details: details || '',
          reporterId: user.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Report submitted:', data.message);
      }
    } catch (error) {
      console.error('Error reporting comment:', error);
    }
  };

  const refreshComments = async () => {
    if (!selectedGalleryImage || !user) return;

    try {
      const response = await fetch(`/api/gallery/comments?imageId=${selectedGalleryImage.id}&userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setImageComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error refreshing comments:', error);
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!selectedGalleryImage) return;
    
    const currentIndex = galleryImages.findIndex(img => img.id === selectedGalleryImage.id);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : galleryImages.length - 1;
    } else {
      newIndex = currentIndex < galleryImages.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedGalleryImage(galleryImages[newIndex]);
    setSelectedImageIndex(newIndex);
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gray-900 pb-8 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-8" style={{ overflow: 'visible' }}>
            <span className="text-white">Find your favorite </span>
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
              Discover what the community is sharing - from game setups, new games, and more!
            </p>
          </div>
          
          <Feed 
            userId={user?.id} 
            limit={10} 
            featuredDiceThroneId={featuredDiceThrone?.id}
            featuredKingsCardId={featuredKingsCard?.id}
            onItemClick={(item) => {
              // If it's a gallery image, open with ImageModal
              if (item.type === 'gallery') {
                // Find the corresponding gallery image
                const galleryImage = galleryImages.find(img => img.id === item.id);
                if (galleryImage) {
                  setSelectedGalleryImage(galleryImage);
                  setShowGalleryModal(true);
                  
                  // Update URL with image parameter
                  const currentUrl = new URL(window.location.href);
                  currentUrl.searchParams.set('image', galleryImage.id);
                  window.history.pushState({}, '', currentUrl);
                  
                  // Load comments for this image
                  if (user) {
                    fetch(`/api/gallery/comments?imageId=${galleryImage.id}&userId=${user.id}`)
                      .then(response => response.json())
                      .then(data => setImageComments(data.comments || []))
                      .catch(error => console.error('Error loading comments:', error));
                  }
                }
              } else if (item.type === 'post') {
                // For forum posts, navigate to the specific post
                router.push(`/forums/post/${item.id}`);
              }
            }}
          />
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
                <GameCardWithVote key={game.id} game={game} voteData={hotGamesVotes[game.id]} />
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
              The best board games according to historical ranking.<span className="sm:hidden"><br /></span><span className="hidden sm:inline"> </span>These are the games with the best average rating<span className="sm:hidden"><br /></span><span className="hidden sm:inline"> </span>of all time.
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
                <GameCardWithVote key={game.id} game={game} voteData={topRankedVotes[game.id]} />
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
                  <div 
                    className={`relative rounded-lg overflow-hidden ${featuredDiceThrone ? 'border-2 border-[#fbae17] shadow-lg' : 'border border-dashed border-gray-300'} bg-white w-64 md:w-80 lg:w-80 cursor-pointer hover:opacity-90 transition-opacity group`} 
                    style={{ aspectRatio: '1 / 1.1' }}
                    onClick={() => {
                      if (featuredDiceThrone) {
                        setSelectedGalleryImage(featuredDiceThrone);
                        setShowGalleryModal(true);
                        
                        // Update URL with image parameter
                        const currentUrl = new URL(window.location.href);
                        currentUrl.searchParams.set('image', featuredDiceThrone.id);
                        window.history.pushState({}, '', currentUrl);
                        
                        // Load comments for this image
                        if (user) {
                          fetch(`/api/gallery/comments?imageId=${featuredDiceThrone.id}&userId=${user.id}`)
                            .then(response => response.json())
                            .then(data => setImageComments(data.comments || []))
                            .catch(error => console.error('Error loading comments:', error));
                        }
                      }
                    }}
                  >
                      {featuredDiceThrone ? (
                        <>
                          <div className="absolute inset-0 bottom-8">
                            <Image src={featuredDiceThrone.thumbnailUrl} alt={featuredDiceThrone.title || 'Dice of the Week'} fill className="object-cover" loading="lazy" />
                          </div>
                          
                          {/* Instagram-style hover overlay */}
                          <div className="absolute inset-0 bottom-8 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-4 text-white">
                              <div className="flex items-center space-x-1">
                                <Heart className="w-4 h-4" fill={featuredDiceThrone.userVote === 'up' ? '#ef4444' : 'none'} stroke={featuredDiceThrone.userVote === 'up' ? '#ef4444' : '#ffffff'} strokeWidth={1.5} />
                                <span className="text-sm font-medium text-white">{featuredDiceThrone.votes.upvotes - featuredDiceThrone.votes.downvotes}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="w-4 h-4" stroke="#ffffff" />
                                <span className="text-sm font-medium text-white">{featuredDiceThrone.comments || 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* Username overlay */}
                          <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium">
                              {featuredDiceThrone.author.name}
                            </div>
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
                </div>

                <div className="flex justify-center">
                  <div 
                    className={`relative rounded-lg overflow-hidden ${featuredKingsCard ? 'border-2 border-[#fbae17] shadow-lg' : 'border border-dashed border-gray-300'} bg-white w-64 md:w-80 lg:w-80 cursor-pointer hover:opacity-90 transition-opacity group`} 
                    style={{ aspectRatio: '1 / 1.1' }}
                    onClick={() => {
                      if (featuredKingsCard) {
                        setSelectedGalleryImage(featuredKingsCard);
                        setShowGalleryModal(true);
                        
                        // Update URL with image parameter
                        const currentUrl = new URL(window.location.href);
                        currentUrl.searchParams.set('image', featuredKingsCard.id);
                        window.history.pushState({}, '', currentUrl);
                        
                        // Load comments for this image
                        if (user) {
                          fetch(`/api/gallery/comments?imageId=${featuredKingsCard.id}&userId=${user.id}`)
                            .then(response => response.json())
                            .then(data => setImageComments(data.comments || []))
                            .catch(error => console.error('Error loading comments:', error));
                        }
                      }
                    }}
                  >
                      {featuredKingsCard ? (
                        <>
                          <div className="absolute inset-0 bottom-8">
                            <Image src={featuredKingsCard.thumbnailUrl} alt={featuredKingsCard.title || 'Card of the Week'} fill className="object-cover" loading="lazy" />
                          </div>
                          
                          {/* Instagram-style hover overlay */}
                          <div className="absolute inset-0 bottom-8 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-4 text-white">
                              <div className="flex items-center space-x-1">
                                <Heart className="w-4 h-4" fill={featuredKingsCard.userVote === 'up' ? '#ef4444' : 'none'} stroke={featuredKingsCard.userVote === 'up' ? '#ef4444' : '#ffffff'} strokeWidth={1.5} />
                                <span className="text-sm font-medium text-white">{featuredKingsCard.votes.upvotes - featuredKingsCard.votes.downvotes}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="w-4 h-4" stroke="#ffffff" />
                                <span className="text-sm font-medium text-white">{featuredKingsCard.comments || 0}</span>
                              </div>
                            </div>
                          </div>

                          {/* Username overlay */}
                          <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium">
                              {featuredKingsCard.author.name}
                            </div>
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
                </div>
              </div>

              {/* Other images */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                {otherGallery.slice(0, 4).map(img => (
                  <div 
                    key={img.id} 
                    className="relative rounded-lg overflow-hidden border border-gray-200 bg-white aspect-square cursor-pointer hover:opacity-90 transition-opacity group"
                    onClick={() => {
                      setSelectedGalleryImage(img);
                      setShowGalleryModal(true);
                      
                      // Update URL with image parameter
                      const currentUrl = new URL(window.location.href);
                      currentUrl.searchParams.set('image', img.id);
                      window.history.pushState({}, '', currentUrl);
                      
                      // Load comments for this image
                      if (user) {
                        fetch(`/api/gallery/comments?imageId=${img.id}&userId=${user.id}`)
                          .then(response => response.json())
                          .then(data => setImageComments(data.comments || []))
                          .catch(error => console.error('Error loading comments:', error));
                      }
                    }}
                  >
                    <Image 
                      src={img.thumbnailUrl} 
                      alt={img.title || 'Gallery image'} 
                      fill 
                      className="object-cover" 
                      loading="lazy"
                      unoptimized={img.thumbnailUrl?.includes('supabase.co')}
                    />
                    
                    {/* Instagram-style hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-4 text-white">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-4 h-4" fill={img.userVote === 'up' ? '#ef4444' : 'none'} stroke={img.userVote === 'up' ? '#ef4444' : '#ffffff'} strokeWidth={1.5} />
                          <span className="text-sm font-medium text-white">{img.votes.upvotes - img.votes.downvotes}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4" stroke="#ffffff" />
                          <span className="text-sm font-medium text-white">{img.comments || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Username overlay */}
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium">
                        {img.author.name}
                      </div>
                    </div>
                  </div>
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
                  </div>
            </>
                )}

              <div className="text-center mt-8">
                <Link href="/community-gallery" className="btn-primary">
              View All Gallery
                </Link>
              </div>
        </div>
      </section>

      {/* Pixel Canvas Section */}
      <LazySection fallback={<div className="py-16 bg-gray-50"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"><div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div></div></div>}>
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-dark-900 mb-4 flex items-center justify-center gap-3">
                <Square className="w-8 h-8 text-primary-500" />
                Pixel Canvas
              </h2>
              <p className="text-dark-600 max-w-2xl mx-auto">
                Create pixel art together with the community! Each pixel you place helps build a collaborative masterpiece.
              </p>
            </div>
            
                  <PixelCanvasPreview />
                
            <div className="text-center mt-8">
                  <Link href="/pixel-canvas" className="btn-primary">
                Start Creating
                  </Link>
            </div>
          </div>
        </section>
      </LazySection>

      {/* Boardle Section */}
      <LazySection fallback={<div className="py-16 bg-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"><div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div></div></div>}>
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-dark-900 mb-4 flex items-center justify-center gap-3">
                <Image 
                  src="/BoardleIcon.svg" 
                  alt="Boardle Icon" 
                  width={32} 
                  height={32}
                  className="w-8 h-8"
                />
                Boardle
              </h2>
              <p className="text-dark-600 max-w-2xl mx-auto">
                Guess the board game! A daily word-guessing game inspired by Wordle, but for board game enthusiasts.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 max-w-4xl mx-auto">
              {/* Mode Selector */}
              <div className="flex justify-center mb-8 px-4">
                <div className="bg-white rounded-lg p-1 shadow-sm flex items-center space-x-2 overflow-x-auto">
                  <button 
                    onClick={() => setBoardleMode('title')}
                    className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      boardleMode === 'title' 
                        ? 'bg-[#fbae17] text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Title Mode
                  </button>
                  <button 
                    onClick={() => setBoardleMode('image')}
                    className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      boardleMode === 'image' 
                        ? 'bg-[#fbae17] text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Image Mode
                  </button>
                  <button 
                    onClick={() => setBoardleMode('card')}
                    className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      boardleMode === 'card' 
                        ? 'bg-[#fbae17] text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Card Mode
                  </button>
                </div>
              </div>
              
              {/* Game Content Preview */}
              <div className="mb-8">
                <div className="text-center text-sm text-gray-500 mb-4">Today's Mystery Game</div>
                
                {boardleMode === 'title' && (
                    <div className="space-y-2 mb-4">
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
                )}

                                 {boardleMode === 'image' && (
                     <div className="flex gap-4 sm:gap-6 items-start justify-center">
                       <div className="w-64 sm:w-80">
                         <div className="space-y-2 mb-4">
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
                       <div className="w-32 sm:w-48">
                         <div className="text-center text-xs sm:text-sm text-gray-600 mb-4">
                           Start with a very<br />
                           zoomed-in image
                         </div>
                         <div className="flex justify-center">
                           <div className="relative w-32 h-32 sm:w-48 sm:h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                             <Image
                               src={boardleImagePreview}
                               alt="Zoomed in game image"
                               fill
                               unoptimized
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
                 )}

                                 {boardleMode === 'card' && (
                     <div className="flex gap-4 sm:gap-6 items-start justify-center">
                       <div className="w-64 sm:w-80">
                         <div className="space-y-2 mb-4">
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
                       <div className="w-32 sm:w-48">
                         <div className="flex justify-center">
                           <div className="relative w-32 h-40 sm:w-48 sm:h-60 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                             <Image
                               src={boardleCardPreview}
                               alt="Game card"
                               fill
                               unoptimized
                               className="object-contain scale-90"
                             />
                           </div>
                         </div>
                       </div>
                     </div>
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
      </section>
      </LazySection>

      {/* Enhanced Homepage Footer */}
      <div className="mt-auto">
        <HomePageFooter />
      </div>

      {/* Gallery Image Modal */}
      {showGalleryModal && selectedGalleryImage && (
        <ImageModal
          isOpen={showGalleryModal}
          onClose={closeImageModal}
          imageUrl={selectedGalleryImage.imageUrl}
          title={selectedGalleryImage.title}
          description={selectedGalleryImage.description}
          author={{
            name: selectedGalleryImage.author.name,
            avatar: selectedGalleryImage.author.avatar
          }}
          createdAt={selectedGalleryImage.createdAt}
          category={selectedGalleryImage.category}
          isFeatured={false}
          onLike={() => handleLike(selectedGalleryImage.id)}
          onDelete={() => {}}
          onReport={() => {}}
          onEditDescription={() => {}}
          isLiked={selectedGalleryImage.userVote === 'up'}
          canDelete={!!(isAuthenticated && user && selectedGalleryImage.author.id === user.id)}
          canReport={!!(isAuthenticated && user)}
          canEdit={!!(isAuthenticated && user && selectedGalleryImage.author.id === user.id)}
          likeCount={selectedGalleryImage.votes?.upvotes || 0}
          imageId={selectedGalleryImage.id}
          comments={imageComments}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onLikeComment={handleLikeComment}
          onReplyToComment={handleReplyToComment}
          onReportComment={handleReportComment}
          currentUserId={user?.id}
          isAuthenticated={isAuthenticated}
          currentUser={user}
          onRefreshComments={refreshComments}
          allImages={galleryImages}
          currentImageIndex={selectedImageIndex}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
} 









