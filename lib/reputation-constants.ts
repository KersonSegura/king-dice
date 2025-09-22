// Client-side reputation constants (no server dependencies)
export const REPUTATION_RULES = {
  // Action limits (how many times per day)
  DAILY_POST_LIMIT: 10,
  DAILY_COMMENT_LIMIT: 50,
  DAILY_VOTE_LIMIT: 50, // Not enforced - votes don't give XP to voter
  DAILY_IMAGE_LIMIT: 10,
  DAILY_LOGIN_LIMIT: 10,
  
  // XP limits (how many give XP per day)
  DAILY_POST_XP_LIMIT: 10,
  DAILY_COMMENT_XP_LIMIT: 20,
  DAILY_IMAGE_XP_LIMIT: 5,
  DAILY_LOGIN_XP_LIMIT: 10,
  DAILY_LIKE_XP_LIMIT: 100, // Max XP from receiving likes per day
  DAILY_VOTE_XP_LIMIT: 50,  // Max XP from voting on games per day
  
  // XP amounts per action
  CREATE_POST: 5,
  CREATE_COMMENT: 1,
  COMMENT_GALLERY: 1,
  POST_GETS_LIKE: 1,        // Reduced from 2 to 1
  POST_GETS_DISLIKE: -1,
  COMMENT_GETS_LIKE: 1,
  COMMENT_GETS_DISLIKE: -1,
  UPLOAD_IMAGE: 10,
  IMAGE_GETS_LIKE: 1,       // XP for image receiving a like
  IMAGE_GETS_DISLIKE: -1,   // XP penalty for image receiving a dislike
  VOTE_GAME: 1,
  VOTE_GAME_UP: 1,          // XP for voting a game up
  VOTE_GAME_DOWN: 0,        // No XP for voting a game down
  POST_REACHES_10_LIKES: 10,   // Milestone bonus for popular posts
  POST_REACHES_50_LIKES: 50,
  POST_REACHES_100_LIKES: 100,
  IMAGE_REACHES_10_LIKES: 10,  // Milestone bonus for popular images
  IMAGE_REACHES_50_LIKES: 50,
  IMAGE_REACHES_100_LIKES: 100,
  DAILY_LOGIN: 2,

  // Reputation thresholds for badges
  THRESHOLDS: {
    TRUSTED: 100,
    MODERATOR: 500,
    ELITE: 1000,
    LEGENDARY: 2500
  }
};

export const BADGE_DESCRIPTIONS = {
  legendary: {
    name: 'Legendary',
    description: 'The highest honor for exceptional contributions',
    requirement: '10,000+ reputation points',
    color: 'text-yellow-500'
  },
  elite: {
    name: 'Elite',
    description: 'Recognized for outstanding community leadership',
    requirement: '5,000+ reputation points',
    color: 'text-purple-500'
  },
  moderator: {
    name: 'Moderator',
    description: 'Trusted community guardian and helper',
    requirement: 'Appointed by community leaders',
    color: 'text-blue-500'
  },
  trusted: {
    name: 'Trusted',
    description: 'Proven reliable community member',
    requirement: '1,000+ reputation points',
    color: 'text-green-500'
  },
  active_poster: {
    name: 'Active Poster',
    description: 'Regular contributor to discussions',
    requirement: '100+ posts or comments',
    color: 'text-blue-400'
  },
  helpful_commenter: {
    name: 'Helpful Commenter',
    description: 'Provides valuable insights and help',
    requirement: '50+ helpful comments',
    color: 'text-green-400'
  },
  gallery_contributor: {
    name: 'Gallery Contributor',
    description: 'Shares quality images with the community',
    requirement: '25+ uploaded images',
    color: 'text-purple-400'
  }
};
