'use client';

import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, ThumbsUp, ThumbsDown, Eye, Download, Calendar, User, Crown, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

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
}

export default function Feed({ userId, limit = 20 }: FeedProps) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Fetch feed data
  useEffect(() => {
    fetchFeedData();
  }, [page, userId]);

  const fetchFeedData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(userId && { userId })
      });

      const response = await fetch(`/api/feed?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setFeedItems(data.items);
        } else {
          setFeedItems(prev => [...prev, ...data.items]);
        }
        setHasMore(data.hasMore);
      } else {
        showToast('Failed to load feed', 'error');
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
      showToast('Failed to load feed', 'error');
    } finally {
      setLoading(false);
    }
  };

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
        const data = await response.json();
        setFeedItems(prev => prev.map(item => 
          item.id === itemId 
            ? { 
                ...item, 
                votes: data.votes, 
                userVote: data.userVote 
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
        body: JSON.stringify({ targetUserId: authorId })
      });

      if (response.ok) {
        setFeedItems(prev => prev.map(item => 
          item.author.id === authorId 
            ? { ...item, isFollowing: true }
            : item
        ));
        showToast('Now following this user', 'success');
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
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const getReputationColor = (reputation: number) => {
    if (reputation >= 1000) return 'text-purple-600';
    if (reputation >= 500) return 'text-blue-600';
    if (reputation >= 100) return 'text-green-600';
    if (reputation >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getReputationLevel = (reputation: number) => {
    if (reputation >= 1000) return 'Legend';
    if (reputation >= 500) return 'Expert';
    if (reputation >= 100) return 'Veteran';
    if (reputation >= 50) return 'Member';
    return 'Newcomer';
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">

      {/* Feed Items */}
      <div className="space-y-6">
        {feedItems.map((item) => (
          <div key={`${item.type}-${item.id}`} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Image
                      src={item.author.avatar || '/default-avatar.png'}
                      alt={item.author.username}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {item.author.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <Crown className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Link 
                        href={`/profile/${item.author.username}`}
                        className={`font-semibold hover:opacity-80 transition-colors ${
                          item.isFollowing 
                            ? 'text-[#fbae17]' 
                            : 'text-gray-900'
                        }`}
                      >
                        {item.author.username}
                      </Link>
                      {item.author.title && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          {item.author.title}
                        </span>
                      )}
                      {item.author.isAdmin && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                          ADMIN
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getReputationColor(item.author.reputation)}`}>
                        {getReputationLevel(item.author.reputation)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatTimeAgo(item.createdAt)}</span>
                      <span>•</span>
                      <span className="capitalize">{item.category}</span>
                      {item.isPopular && (
                        <>
                          <span>•</span>
                          <span className="text-orange-500 font-medium">🔥 Popular</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!item.isFollowing && item.author.id !== user?.id && (
                    <button
                      onClick={() => handleFollow(item.author.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Follow
                    </button>
                  )}
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <Link 
                href={item.type === 'gallery' ? `/community-gallery` : item.type === 'forum' ? `/forums/post/${item.id}` : '#'}
                className="block hover:bg-gray-50 -m-4 p-4 rounded-lg transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {item.title}
                </h3>
                {item.content && (
                  <p className="text-gray-700 mb-3 line-clamp-3">
                    {item.content}
                  </p>
                )}
                {item.imageUrl && (
                  <div className="relative mb-3 rounded-lg overflow-hidden">
                    <Image
                      src={item.thumbnailUrl || item.imageUrl}
                      alt={item.title}
                      width={600}
                      height={400}
                      className="w-full h-64 object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                )}
              </Link>
            </div>

            {/* Engagement Stats */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  {item.engagement.views && (
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{item.engagement.views.toLocaleString()}</span>
                    </div>
                  )}
                  {item.engagement.downloads && (
                    <div className="flex items-center space-x-1">
                      <Download className="w-4 h-4" />
                      <span>{item.engagement.downloads.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{item.engagement.comments}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">{item.author.reputation}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 py-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => handleVote(item.id, 'up')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      item.userVote === 'up'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="font-medium">{item.votes.upvotes}</span>
                  </button>
                  <button
                    onClick={() => handleVote(item.id, 'down')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      item.userVote === 'down'
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span className="font-medium">{item.votes.downvotes}</span>
                  </button>
                  <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span>Comment</span>
                  </button>
                </div>
                <button className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && feedItems.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-500 mb-4">
            Be the first to share something with the community!
          </p>
          <Link 
            href="/community-gallery"
            className="inline-flex items-center px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#e0990e] transition-colors"
          >
            Explore Community
          </Link>
        </div>
      )}
    </div>
  );
}
