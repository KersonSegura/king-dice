'use client';

import { useState, useEffect } from 'react';
import { UserReputation } from '@/lib/reputation';
import { Trophy, Crown, Star, Shield } from 'lucide-react';

interface ReputationLeaderboardProps {
  limit?: number;
  showBadges?: boolean;
}

export default function ReputationLeaderboard({ limit = 10, showBadges = true }: ReputationLeaderboardProps) {
  const [topUsers, setTopUsers] = useState<UserReputation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        const response = await fetch(`/api/reputation?action=top&limit=${limit}`);
        if (response.ok) {
          const data = await response.json();
          setTopUsers(data.topUsers);
        }
      } catch (error) {
        console.error('Error fetching top users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopUsers();
  }, [limit]);

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Star className="w-5 h-5 text-orange-500" />;
      default:
        return <span className="text-sm font-medium text-gray-500">#{position}</span>;
    }
  };

  const getReputationColor = (reputation: number) => {
    if (reputation >= 2500) return 'text-yellow-600';
    if (reputation >= 1000) return 'text-purple-600';
    if (reputation >= 500) return 'text-blue-600';
    if (reputation >= 100) return 'text-green-600';
    return 'text-gray-600';
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'legendary':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'elite':
        return <Trophy className="w-3 h-3 text-purple-500" />;
      case 'moderator':
        return <Shield className="w-3 h-3 text-blue-500" />;
      case 'trusted':
        return <Star className="w-3 h-3 text-green-500" />;
      default:
        return <Star className="w-3 h-3 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Users</h3>
        <div className="space-y-3">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (topUsers.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Users</h3>
        <p className="text-gray-500 text-center py-4">No users with XP yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Users</h3>
      <div className="space-y-3">
        {topUsers.map((user, index) => (
          <div key={user.userId} className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-6 h-6">
              {getPositionIcon(index + 1)}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{user.username}</span>
                {showBadges && user.badges.length > 0 && (
                  <div className="flex space-x-1">
                    {user.badges.slice(0, 2).map((badge) => (
                      <div key={badge} className="flex items-center">
                        {getBadgeIcon(badge)}
                      </div>
                    ))}
                    {user.badges.length > 2 && (
                      <span className="text-xs text-gray-400">+{user.badges.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${getReputationColor(user.currentReputation)}`}>
                  {user.currentReputation} XP
                </span>
                <span className="text-xs text-gray-500">
                  {user.reputationHistory.filter(e => e.action === 'CREATE_POST').length} posts
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
