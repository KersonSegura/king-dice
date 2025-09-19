'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Users, UserPlus, UserMinus, UserCheck, UserX, Search, Filter, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

interface User {
  id: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  isAdmin: boolean;
  followedAt?: string;
}

interface SocialStats {
  followers: number;
  following: number;
  pendingRequests: number;
}

export default function FriendsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'requests'>('followers');
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [followRequests, setFollowRequests] = useState<User[]>([]);
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Load social stats
  const loadSocialStats = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/users/social-stats?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSocialStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading social stats:', error);
    }
  };


  // Load followers list
  const loadFollowers = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/follow?userId=${user.id}&type=followers`);
      if (response.ok) {
        const data = await response.json();
        setFollowers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  // Load following list
  const loadFollowing = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/follow?userId=${user.id}&type=following`);
      if (response.ok) {
        const data = await response.json();
        setFollowing(data.users || []);
      }
    } catch (error) {
      console.error('Error loading following:', error);
    }
  };

  // Load follow requests
  const loadFollowRequests = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/follow-requests?userId=${user.id}&type=received`);
      if (response.ok) {
        const data = await response.json();
        setFollowRequests(data.requests.map((req: any) => ({
          id: req.user.id,
          username: req.user.username,
          avatar: req.user.avatar,
          isVerified: req.user.isVerified,
          isAdmin: req.user.isAdmin,
          requestId: req.id,
          requestedAt: req.requestedAt
        })));
      }
    } catch (error) {
      console.error('Error loading follow requests:', error);
    }
  };


  // Search for users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // This would need to be implemented in the API
      // For now, we'll use a mock search
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle follow/unfollow
  const handleFollow = async (targetUserId: string) => {
    if (!user?.id) return;

    try {
      const isCurrentlyFollowing = following.some(u => u.id === targetUserId);
      const action = isCurrentlyFollowing ? 'unfollow' : 'follow';
      
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          followerId: user.id,
          followingId: targetUserId
        })
      });

      if (response.ok) {
        if (isCurrentlyFollowing) {
          setFollowing(prev => prev.filter(u => u.id !== targetUserId));
        } else {
          // Add the user to following list
          const userToAdd = searchResults.find(u => u.id === targetUserId);
          if (userToAdd) {
            setFollowing(prev => [...prev, { ...userToAdd, followedAt: new Date().toISOString() }]);
          }
        }
        loadSocialStats();
        showToast(
          isCurrentlyFollowing ? 'Unfollowed successfully' : 'Following successfully',
          'success'
        );
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update follow status', 'error');
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      showToast('Failed to update follow status', 'error');
    }
  };


  // Handle follow request actions
  const handleFollowRequest = async (requesterId: string, action: 'accept' | 'decline') => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'accept' ? 'accept_request' : 'decline_request',
          followerId: user.id,
          followingId: requesterId
        })
      });

      if (response.ok) {
        // Remove from requests list
        setFollowRequests(prev => prev.filter(req => req.id !== requesterId));
        
        if (action === 'accept') {
          // Add to followers list
          const acceptedUser = followRequests.find(req => req.id === requesterId);
          if (acceptedUser) {
            setFollowers(prev => [acceptedUser, ...prev]);
          }
          showToast('Follow request accepted!', 'success');
        } else {
          showToast('Follow request declined', 'success');
        }
        
        loadSocialStats();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || `Failed to ${action} request`, 'error');
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      showToast(`Failed to ${action} request`, 'error');
    }
  };

  // Load all data
  useEffect(() => {
    if (user?.id) {
      const loadAllData = async () => {
        setLoading(true);
        await Promise.all([
          loadSocialStats(),
          loadFollowers(),
          loadFollowing(),
          loadFollowRequests()
        ]);
        setLoading(false);
      };

      loadAllData();
    }
  }, [user?.id]);

  // Search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fbae17] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view friends</h1>
          <Link href="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const currentTabData = activeTab === 'followers' ? followers : activeTab === 'following' ? following : followRequests;
  const currentTabCount = activeTab === 'followers' ? socialStats?.followers : activeTab === 'following' ? socialStats?.following : socialStats?.pendingRequests;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/profile" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Following & Followers</h1>
            </div>
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/80 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Find People</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        {socialStats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{socialStats.followers}</div>
              <div className="text-sm text-gray-600">Followers</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{socialStats.following}</div>
              <div className="text-sm text-gray-600">Following</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{socialStats.pendingRequests}</div>
              <div className="text-sm text-gray-600">Requests</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'followers', label: 'Followers', count: socialStats?.followers || 0 },
                { id: 'following', label: 'Following', count: socialStats?.following || 0 },
                { id: 'requests', label: 'Requests', count: socialStats?.pendingRequests || 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#fbae17] text-[#fbae17]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fbae17]"></div>
              </div>
            ) : currentTabData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentTabData.map((user) => (
                  <div key={user.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {user.username}
                          </h3>
                          {user.isVerified && (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <UserCheck className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          {user.isAdmin && (
                            <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">👑</span>
                            </div>
                          )}
                        </div>
                        {user.followedAt && (
                          <p className="text-xs text-gray-500">
                            {new Date(user.followedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="mt-3 flex space-x-2">
                      {activeTab === 'following' ? (
                        <button
                          onClick={() => handleFollow(user.id)}
                          className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
                        >
                          <UserMinus className="w-3 h-3 inline mr-1" />
                          Unfollow
                        </button>
                      ) : activeTab === 'followers' ? (
                        <button
                          onClick={() => handleFollow(user.id)}
                          className="flex-1 px-3 py-1 bg-[#fbae17] text-white text-xs rounded hover:bg-[#fbae17]/80 transition-colors"
                        >
                          <UserPlus className="w-3 h-3 inline mr-1" />
                          Follow Back
                        </button>
                      ) : activeTab === 'requests' ? (
                        <>
                          <button
                            onClick={() => handleFollowRequest(user.id, 'accept')}
                            className="flex-1 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleFollowRequest(user.id, 'decline')}
                            className="flex-1 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                          >
                            Decline
                          </button>
                        </>
                      ) : null}
                      {activeTab !== 'requests' && (
                        <Link
                          href={`/profile/${user.username}`}
                          className="flex-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors text-center"
                        >
                          View Profile
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No {activeTab} yet
                </h3>
                <p className="text-gray-500 mb-4">
                  {activeTab === 'followers' && "No one is following you yet. Share your profile to get followers!"}
                  {activeTab === 'following' && "You're not following anyone yet. Find people to follow!"}
                  {activeTab === 'requests' && "No pending follow requests."}
                </p>
                {activeTab !== 'requests' && (
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/80 transition-colors"
                  >
                    Find People
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Find People</h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <UserX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbae17]"
                />
              </div>
              
              {searchLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#fbae17]"></div>
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1">
                            <span className="text-sm font-medium text-gray-900">{user.username}</span>
                            {user.isVerified && (
                              <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                <UserCheck className="w-2 h-2 text-white" />
                              </div>
                            )}
                            {user.isAdmin && (
                              <div className="w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">👑</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleFollow(user.id)}
                          className="px-3 py-1 bg-[#fbae17] text-white text-xs rounded hover:bg-[#fbae17]/80 transition-colors"
                        >
                          <UserPlus className="w-3 h-3 inline mr-1" />
                          Follow
                        </button>
                        <Link
                          href={`/profile/${user.username}`}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {searchQuery && !searchLoading && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No users found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
