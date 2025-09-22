'use client';

import React, { useState, useEffect } from 'react';
import { User, Users, UserPlus, UserMinus, UserCheck, UserX, MoreHorizontal } from 'lucide-react';
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

interface FriendsFollowersSectionProps {
  userId: string;
  currentUserId?: string;
  isOwnProfile?: boolean;
  profileColors?: {
    cover: string;
    background: string;
    containers: string;
  };
  isEditing?: boolean;
}

export default function FriendsFollowersSection({ 
  userId, 
  currentUserId, 
  isOwnProfile = false,
  profileColors = {
    cover: '#fbae17',
    background: '#f5f5f5',
    containers: '#ffffff'
  },
  isEditing = false
}: FriendsFollowersSectionProps) {
  const { showToast, ToastContainer } = useToast();
  const [socialStats, setSocialStats] = useState<SocialStats | null>(null);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [showAllModal, setShowAllModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [hasRequestPending, setHasRequestPending] = useState(false);

  // Load social stats
  const loadSocialStats = async () => {
    try {
      const response = await fetch(`/api/users/social-stats?userId=${userId}`);
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
    try {
      const response = await fetch(`/api/follow?userId=${userId}&type=followers`);
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
    try {
      const response = await fetch(`/api/follow?userId=${userId}&type=following`);
      if (response.ok) {
        const data = await response.json();
        setFollowing(data.users || []);
      }
    } catch (error) {
      console.error('Error loading following:', error);
    }
  };

  // Check follow status
  const checkFollowStatus = async () => {
    if (!currentUserId || currentUserId === userId) return;
    
    try {
      const response = await fetch(`/api/follow?followerId=${currentUserId}&followingId=${userId}`, {
        method: 'HEAD'
      });
      setIsFollowing(response.status === 200);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  // Check privacy status
  const checkPrivacyStatus = async () => {
    try {
      const response = await fetch(`/api/users/privacy?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setIsPrivateProfile(data.privacy.isPrivate);
      }
    } catch (error) {
      console.error('Error checking privacy status:', error);
    }
  };

  // Check if there's a pending follow request
  const checkPendingRequest = async () => {
    if (!currentUserId || currentUserId === userId) return;
    
    try {
      const response = await fetch(`/api/follow-requests?userId=${userId}&type=received`);
      if (response.ok) {
        const data = await response.json();
        const hasPendingFromCurrentUser = data.requests.some((req: any) => req.user.id === currentUserId);
        setHasRequestPending(hasPendingFromCurrentUser);
      }
    } catch (error) {
      console.error('Error checking pending requests:', error);
    }
  };


  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!currentUserId) {
      showToast('Please log in to follow users', 'info');
      return;
    }

    try {
      let action: string;
      
      if (hasRequestPending) {
        action = 'cancel_request';
      } else if (isFollowing) {
        action = 'unfollow';
      } else {
        action = 'follow';
      }

      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          followerId: currentUserId,
          followingId: userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (action === 'follow') {
          if (data.isPrivate) {
            setHasRequestPending(true);
            showToast('Follow request sent!', 'success');
          } else {
            setIsFollowing(true);
            showToast('Now following user!', 'success');
          }
        } else if (action === 'unfollow') {
          setIsFollowing(false);
          showToast('Unfollowed user', 'success');
        } else if (action === 'cancel_request') {
          setHasRequestPending(false);
          showToast('Follow request cancelled', 'success');
        }
        
        loadSocialStats();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update follow status', 'error');
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      showToast('Failed to update follow status', 'error');
    }
  };


  // Load all data
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadSocialStats(),
        loadFollowers(),
        loadFollowing(),
        checkFollowStatus(),
        checkPrivacyStatus(),
        checkPendingRequest()
      ]);
      setLoading(false);
    };

    loadAllData();
  }, [userId, currentUserId]);

  if (loading) {
    return (
      <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentTabData = activeTab === 'followers' ? followers : following;
  const currentTabCount = activeTab === 'followers' ? socialStats?.followers : socialStats?.following;

  return (
    <>
      <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">Social</h3>
            {isPrivateProfile && (
              <div className="flex items-center text-xs text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Private
              </div>
            )}
          </div>
          {!isOwnProfile && currentUserId && (
            <button
              onClick={handleFollow}
              disabled={isEditing}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : hasRequestPending
                  ? 'bg-gray-400 text-white hover:bg-gray-500'
                  : 'bg-[#fbae17] text-white hover:bg-[#fbae17]/80'
              } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isFollowing ? (
                <>
                  <UserMinus className="w-4 h-4 inline mr-1" />
                  Following
                </>
              ) : hasRequestPending ? (
                <>
                  <UserMinus className="w-4 h-4 inline mr-1" />
                  Requested
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 inline mr-1" />
                  {isPrivateProfile ? 'Request' : 'Follow'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div 
            className={`text-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
              isEditing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => !isEditing && setActiveTab('followers')}
          >
            <div className="text-2xl font-bold text-gray-900">{socialStats?.followers || 0}</div>
            <div className="text-sm text-gray-600">Followers</div>
          </div>
          <div 
            className={`text-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
              isEditing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => !isEditing && setActiveTab('following')}
          >
            <div className="text-2xl font-bold text-gray-900">{socialStats?.following || 0}</div>
            <div className="text-sm text-gray-600">Following</div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 capitalize">
              {activeTab} ({currentTabCount || 0})
            </h4>
            {(currentTabCount || 0) > 0 && (
              <button
                onClick={() => !isEditing && setShowAllModal(true)}
                disabled={isEditing}
                className={`text-[#fbae17] hover:text-[#fbae17]/80 text-sm font-medium ${
                  isEditing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                View All
              </button>
            )}
          </div>

          {currentTabData.length > 0 ? (
            <div className="space-y-2">
              {currentTabData.slice(0, 3).map((user) => (
                <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {user.username}
                      </span>
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No {activeTab} yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Show All Modal */}
      {showAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  All {activeTab} ({currentTabCount || 0})
                </h3>
                <button
                  onClick={() => setShowAllModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <UserX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              {currentTabData.length > 0 ? (
                <div className="space-y-3">
                  {currentTabData.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {user.username}
                          </span>
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No {activeTab} yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  );
}
