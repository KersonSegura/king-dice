'use client';

import { useState, useEffect } from 'react';
import { UserReputation as UserReputationType, BADGE_DESCRIPTIONS } from '@/lib/reputation';
import { Trophy, Star, Shield, Crown, MessageSquare, Image, ThumbsUp } from 'lucide-react';
import ModernTooltip from '@/components/ModernTooltip';

interface UserReputationProps {
  userId: string;
  username: string;
  showHistory?: boolean;
  compact?: boolean;
}

export default function UserReputation({ userId, username, showHistory = false, compact = false }: UserReputationProps) {
  const [userData, setUserData] = useState<UserReputationType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserReputation = async () => {
      try {
        const response = await fetch(`/api/reputation?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUserData(data.userData);
        }
      } catch (error) {
        console.error('Error fetching user reputation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReputation();
  }, [userId]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-sm text-gray-500">
        {compact ? `${username} (0 XP)` : `No XP data for ${username}`}
      </div>
    );
  }

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'legendary':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'elite':
        return <Trophy className="w-4 h-4 text-purple-500" />;
      case 'moderator':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'trusted':
        return <Star className="w-4 h-4 text-green-500" />;
      case 'active_poster':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'helpful_commenter':
        return <ThumbsUp className="w-4 h-4 text-green-400" />;
      case 'gallery_contributor':
        return <Image className="w-4 h-4 text-purple-400" />;
      default:
        return <Star className="w-4 h-4 text-gray-400" />;
    }
  };

  const getReputationColor = (reputation: number) => {
    if (reputation >= 2500) return 'text-yellow-600';
    if (reputation >= 1000) return 'text-purple-600';
    if (reputation >= 500) return 'text-blue-600';
    if (reputation >= 100) return 'text-green-600';
    return 'text-gray-600';
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <span className={`text-sm font-medium ${getReputationColor(userData.currentReputation)}`}>
          {userData.currentReputation} rep
        </span>
        {userData.badges.length > 0 && (
          <div className="flex space-x-1">
            {userData.badges.slice(0, 2).map((badge) => (
              <ModernTooltip key={badge} content={BADGE_DESCRIPTIONS[badge as keyof typeof BADGE_DESCRIPTIONS]} position="top">
                <div className="flex items-center">
                  {getBadgeIcon(badge)}
                </div>
              </ModernTooltip>
            ))}
            {userData.badges.length > 2 && (
              <span className="text-xs text-gray-400">+{userData.badges.length - 2}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{username}</h3>
          <p className={`text-2xl font-bold ${getReputationColor(userData.currentReputation)}`}>
            {userData.currentReputation} XP
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total earned</p>
          <p className="text-lg font-semibold text-gray-700">{userData.totalReputation}</p>
        </div>
      </div>

      {/* Badges */}
      {userData.badges.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Badges</h4>
          <div className="flex flex-wrap gap-2">
            {userData.badges.map((badge) => (
              <ModernTooltip
                key={badge}
                content={BADGE_DESCRIPTIONS[badge as keyof typeof BADGE_DESCRIPTIONS]}
                position="top"
              >
                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                  {getBadgeIcon(badge)}
                  <span className="capitalize">{badge.replace('_', ' ')}</span>
                </div>
              </ModernTooltip>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {userData.reputationHistory.filter(e => e.action === 'CREATE_POST').length}
          </p>
          <p className="text-xs text-gray-500">Posts</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {userData.reputationHistory.filter(e => e.action === 'CREATE_COMMENT').length}
          </p>
          <p className="text-xs text-gray-500">Comments</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {userData.reputationHistory.filter(e => e.action === 'UPLOAD_IMAGE').length}
          </p>
          <p className="text-xs text-gray-500">Images</p>
        </div>
      </div>

      {/* Recent Activity */}
      {showHistory && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {userData.reputationHistory
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5)
              .map((event) => (
                <div key={event.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{event.description}</span>
                  <span className={`font-medium ${event.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {event.points > 0 ? '+' : ''}{event.points}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
