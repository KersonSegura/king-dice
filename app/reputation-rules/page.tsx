'use client';

import { REPUTATION_RULES, BADGE_DESCRIPTIONS } from '@/lib/reputation-constants';
import { Trophy, Crown, Star, Shield, MessageSquare, Image, ThumbsUp, TrendingUp } from 'lucide-react';

export default function ReputationRulesPage() {
  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'legendary':
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 'elite':
        return <Trophy className="w-6 h-6 text-purple-500" />;
      case 'moderator':
        return <Shield className="w-6 h-6 text-blue-500" />;
      case 'trusted':
        return <Star className="w-6 h-6 text-green-500" />;
      case 'active_poster':
        return <MessageSquare className="w-6 h-6 text-blue-400" />;
      case 'helpful_commenter':
        return <ThumbsUp className="w-6 h-6 text-green-400" />;
      case 'gallery_contributor':
        return <Image className="w-6 h-6 text-purple-400" />;
      default:
        return <Star className="w-6 h-6 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900">Reputation System</h1>
          </div>
          <p className="text-lg text-gray-600">
            Earn reputation by contributing to the King Dice community
          </p>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Earning Reputation</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Create quality forum posts and comments</li>
                <li>• Share images in the community gallery</li>
                <li>• Vote on games and content</li>
                <li>• Help keep the community safe by reporting inappropriate content</li>
                <li>• Reach milestones with popular posts and images</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Daily Limits</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Posts: {REPUTATION_RULES.DAILY_POST_LIMIT} per day</li>
                <li>• Comments: {REPUTATION_RULES.DAILY_COMMENT_LIMIT} per day</li>
                <li>• Votes: {REPUTATION_RULES.DAILY_VOTE_LIMIT} per day</li>
                <li>• Images: {REPUTATION_RULES.DAILY_IMAGE_LIMIT} per day</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Reputation Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Reputation Actions</h2>
          
          {/* Forum Actions */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
              Forum Actions
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Create Post</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.CREATE_POST}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Create Comment</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.CREATE_COMMENT}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Post Gets Like</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.POST_GETS_LIKE}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Post Gets Dislike</span>
                <span className="text-sm font-bold text-red-600">{REPUTATION_RULES.POST_GETS_DISLIKE}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Comment Gets Like</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.COMMENT_GETS_LIKE}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Comment Gets Dislike</span>
                <span className="text-sm font-bold text-red-600">{REPUTATION_RULES.COMMENT_GETS_DISLIKE}</span>
              </div>
            </div>
          </div>

          {/* Gallery Actions */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Image className="w-5 h-5 mr-2 text-purple-500" />
              Gallery Actions
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Upload Image</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.UPLOAD_IMAGE}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Image Gets Like</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.IMAGE_GETS_LIKE}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Image Gets Dislike</span>
                <span className="text-sm font-bold text-red-600">{REPUTATION_RULES.IMAGE_GETS_DISLIKE}</span>
              </div>
            </div>
          </div>

          {/* Game Voting */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <ThumbsUp className="w-5 h-5 mr-2 text-green-500" />
              Game Voting
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Vote Game Up</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.VOTE_GAME_UP}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Vote Game Down</span>
                <span className="text-sm font-bold text-red-600">{REPUTATION_RULES.VOTE_GAME_DOWN}</span>
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
              Milestones
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Post Reaches 10 Likes</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.POST_REACHES_10_LIKES}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Post Reaches 50 Likes</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.POST_REACHES_50_LIKES}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Post Reaches 100 Likes</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.POST_REACHES_100_LIKES}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Image Reaches 10 Likes</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.IMAGE_REACHES_10_LIKES}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Image Reaches 50 Likes</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.IMAGE_REACHES_50_LIKES}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Image Reaches 100 Likes</span>
                <span className="text-sm font-bold text-green-600">+{REPUTATION_RULES.IMAGE_REACHES_100_LIKES}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Badges & Achievements</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Reputation Badges */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Reputation Badges</h3>
              <div className="space-y-3">
                {Object.entries(REPUTATION_RULES.THRESHOLDS).map(([key, threshold]) => {
                  const badgeName = key.toLowerCase().replace('_', ' ');
                  const badgeKey = badgeName.split(' ')[0];
                  return (
                    <div key={key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {getBadgeIcon(badgeKey)}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 capitalize">{badgeName}</div>
                        <div className="text-sm text-gray-500">{threshold}+ reputation</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Badges */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Activity Badges</h3>
              <div className="space-y-3">
                {Object.entries(BADGE_DESCRIPTIONS).filter(([key]) => 
                  !['trusted', 'moderator', 'elite', 'legendary'].includes(key)
                ).map(([badge, description]) => (
                  <div key={badge} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    {getBadgeIcon(badge)}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">
                        {badge.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500">{description.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Community Guidelines</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">✅ Positive Actions</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Create helpful and informative posts</li>
                <li>• Share quality images and game setups</li>
                <li>• Vote on games and content thoughtfully</li>
                <li>• Report inappropriate content to keep the community safe</li>
                <li>• Engage respectfully with other community members</li>
              </ul>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">❌ Avoid These Actions</h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Posting inappropriate or offensive content</li>
                <li>• Spamming or creating low-quality posts</li>
                <li>• Abusing the voting system</li>
                <li>• Harassing other community members</li>
                <li>• Violating community guidelines</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
