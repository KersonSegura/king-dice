'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, ThumbsUp, ThumbsDown, Eye, Download, Calendar, User, Crown, Star, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslations } from 'next-intl';

interface FeedItem {
  id: string;
  type: 'post' | 'gallery' | 'forum';
  title: string;
  content?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  author: {
    id: string;
    username: string;
    avatar: string;
    reputation: number;
    isVerified: boolean;
    isAdmin: boolean;
  };
  category: string;
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  userVote?: 'up' | 'down' | null;
  engagement: {
    views?: number;
    downloads?: number;
    comments: number;
    shares: number;
  };
  isFollowing?: boolean;
  isPopular?: boolean;
}

interface FeedProps {
  userId?: string;
  limit?: number;
  onItemClick?: (item: FeedItem) => void;
  featuredDiceThroneId?: string;
  featuredKingsCardId?: string;
}

export default function Feed({ userId, limit = 20, onItemClick, featuredDiceThroneId, featuredKingsCardId }: FeedProps) {
  const t = useTranslations('home');
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // 1. Determine when we have a stable userId/auth state
  const [delayedUserId, setDelayedUserId] = useState<string | undefined>(userId);
  useEffect(() => {
    if (isAuthenticated) {
      // Wait until user is available after login
      if (user && user.id) setDelayedUserId(user.id);
    } else {
      setDelayedUserId(undefined);
    }
  }, [isAuthenticated, user?.id]);

  // Helper: fetch first page of feed
  const refetchFeedFirstPage = useCallback(() => {
    setPage(1);
    setTimeout(fetchFeedData, 0);
  }, [delayedUserId, isAuthenticated]);

  // 2. Fetch feed data only when delayedUserId is set (or auth known to be unauthenticated)
  useEffect(() => {
    // Only fetch after initial auth resolves
    if ((isAuthenticated && delayedUserId) || (!isAuthenticated && delayedUserId === undefined)) {
      fetchFeedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, delayedUserId, isAuthenticated]);

  // 1. Debug log fetch results
  const fetchFeedData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(delayedUserId && { userId: delayedUserId })
      });
      const response = await fetch(`/api/feed?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (page === 1) setFeedItems(data.items);
        else setFeedItems(prev => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        // LOG
        if (typeof window !== 'undefined') {
          console.log('[FeedDebug] Feed fetch items:', data.items.map(i => ({
            id: i.id, type: i.type, userVote: i.userVote, title: i.title, author: i.author?.username
          })));
        }
      } else {
        showToast('Failed to load feed', 'error');
      }
    } catch (error) {
      console.error('💥 Feed: Error fetching feed:', error);
      showToast('Failed to load feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Refetch feed on login ready, force for accurate like/following state
  useEffect(() => {
    if (isAuthenticated && user?.id && page !== 1) {
      setPage(1);
    } else if (isAuthenticated && user?.id) {
      fetchFeedData();
    }
  }, [isAuthenticated, user?.id]);

  // 3. Listen for gallery modal vote updates and refetch first page
  useEffect(() => {
    const onGalleryUpdate = (e: any) => {
      // On like/unlike from modal, refetch feed (first page)
      refetchFeedFirstPage();
    };
    window.addEventListener('kd-gallery-image-updated', onGalleryUpdate as any);
    const onCommentsUpdate = (e: any) => {
      const { imageId, comments } = e.detail || {};
      if (!imageId) return;
      setFeedItems(prev => prev.map(item => item.type === 'gallery' && item.id === imageId
        ? { ...item, engagement: { ...item.engagement, comments } }
        : item));
    };
    window.addEventListener('kd-gallery-comments-updated', onCommentsUpdate as any);
    return () => {
      window.removeEventListener('kd-gallery-image-updated', onGalleryUpdate as any);
      window.removeEventListener('kd-gallery-comments-updated', onCommentsUpdate as any);
    };
  }, [refetchFeedFirstPage]);

  // Keep in-place updates from modal (do not refetch and reset pagination)
  useEffect(() => {
    const onGalleryUpdate = (e: any) => {
      const updated = e.detail?.image;
      if (!updated) return;
      setFeedItems(prev => prev.map(item => item.type === 'gallery' && item.id === updated.id
        ? { ...item, votes: updated.votes, userVote: updated.userVote }
        : item));
    };
    window.addEventListener('kd-gallery-image-updated', onGalleryUpdate as any);
    return () => {
      window.removeEventListener('kd-gallery-image-updated', onGalleryUpdate as any);
    };
  }, []);

  const handleVote = async (itemId: string, voteType: 'up' | 'down') => {
    if (!isAuthenticated) {
      showToast('Please log in to vote', 'error');
      return;
    }

    try {
      const response = await fetch('/api/feed/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, voteType })
      });

      if (response.ok) {
        // Update local state
        setFeedItems(prev => prev.map(item => 
          item.id === itemId 
            ? {
                ...item,
                userVote: item.userVote === voteType ? null : voteType,
                votes: {
                  ...item.votes,
                  upvotes: voteType === 'up' 
                    ? item.votes.upvotes + (item.userVote === 'up' ? -1 : item.userVote === 'down' ? 1 : 1)
                    : item.votes.upvotes + (item.userVote === 'up' ? -1 : 0),
                  downvotes: voteType === 'down'
                    ? item.votes.downvotes + (item.userVote === 'down' ? -1 : item.userVote === 'up' ? 1 : 1)
                    : item.votes.downvotes + (item.userVote === 'down' ? -1 : 0)
                }
              }
            : item
        ));
      } else {
        showToast('Failed to vote', 'error');
      }
    } catch (error) {
      console.error('Error voting:', error);
      showToast('Failed to vote', 'error');
    }
  };

  const handleFollow = async (authorId: string) => {
    if (!isAuthenticated) {
      showToast('Please log in to follow users', 'error');
      return;
    }

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followingId: authorId })
      });

      if (response.ok) {
        setFeedItems(prev => prev.map(item => 
          item.author.id === authorId 
            ? { ...item, isFollowing: true }
            : item
        ));
        showToast('Now following user', 'success');
      } else {
        showToast('Failed to follow user', 'error');
      }
    } catch (error) {
      console.error('Error following user:', error);
      showToast('Failed to follow user', 'error');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getReputationColor = (reputation: number) => {
    if (reputation >= 1000) return 'bg-purple-100 text-purple-700';
    if (reputation >= 500) return 'bg-blue-100 text-blue-700';
    if (reputation >= 100) return 'bg-green-100 text-green-700';
    if (reputation >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getReputationLevel = (reputation: number) => {
    if (reputation >= 1000) return 'Legend';
    if (reputation >= 500) return 'Expert';
    if (reputation >= 100) return 'Veteran';
    if (reputation >= 50) return 'Member';
    return 'Newcomer';
  };

  // Loading state
  if (loading && page === 1) {
    return (
      <div className="max-w-6xl mx-auto p-2">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }


  // Empty state - only show when not loading and no items
  if (!loading && feedItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 max-w-md mx-auto">
            <div className="w-16 h-16 bg-[#fbae17] rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600 mb-6">
              Be the first to share something with the community!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link 
                href="/community-gallery"
                className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#e0990e] transition-colors"
              >
                Share Gallery Image
              </Link>
              <Link 
                href="/forums"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Discussion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-2">
      {/* Feed Items - Instagram Style Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1">
        {feedItems.map((item) => (
          <div 
            key={`${item.type}-${item.id}`} 
            className="group relative bg-white overflow-hidden hover:z-10 transition-all duration-200 cursor-pointer"
            onClick={() => onItemClick?.(item)}
          >
            {/* Main Image/Content - Square Aspect Ratio */}
            <div className="aspect-square relative overflow-hidden bg-gray-100">
              {item.imageUrl ? (
                <Image
                  src={item.thumbnailUrl || item.imageUrl}
                  alt={item.title || 'Community post'}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                  <div className="text-center p-3">
                    <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                    <h3 className="text-xs font-medium text-gray-600 line-clamp-2">{item.title}</h3>
                  </div>
                </div>
              )}
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-4">
                  <div className="flex items-center space-x-1 text-white">
                    <Heart className="w-4 h-4" fill={item.userVote === 'up' ? '#ef4444' : 'none'} stroke={item.userVote === 'up' ? '#ef4444' : '#ffffff'} strokeWidth={1.5} />
                    <span className="text-sm font-medium">{item.votes.upvotes - item.votes.downvotes}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-white">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.engagement.comments}</span>
                  </div>
                </div>
              </div>

              {/* Username and Follow indicator */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex items-center space-x-1">
                  <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs font-medium">
                    {item.author.username}
                  </div>
                  {item.isFollowing && (
                    <div className="bg-[#fbae17] text-white px-1.5 py-0.5 rounded text-xs font-medium">
                      Following
                    </div>
                  )}
                </div>
              </div>

              {/* Featured item crown badge */}
              {(item.id === featuredDiceThroneId || item.id === featuredKingsCardId) && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-[#fbae17] text-white p-1 rounded-full">
                    <Crown className="w-3 h-3 fill-current" />
                  </div>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => setPage(prev => prev + 1)}
            disabled={loading}
            className="px-6 py-2 bg-[#fbae17] text-black rounded-lg hover:bg-[#e0990e] transition-colors disabled:opacity-50"
          >
            {loading ? t('loading') : t('loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}