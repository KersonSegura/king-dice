export interface ForumPost {
  id: string;
  title: string;
  content: string;
  postType?: 'text' | 'poll';
  poll?: ForumPoll | null;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
    title?: string | null;
  };
  category: string;
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  userVote?: 'up' | 'down' | null;
  userVotes?: Array<{
    userId: string;
    voteType: 'up' | 'down';
    timestamp: string;
  }>;
  replies: number;
  isModerated: boolean;
  moderationResult?: {
    isAppropriate: boolean;
    flags: string[];
  };
}

export interface ForumPollOption {
  id: string;
  text: string;
}

export interface ForumPoll {
  question: string;
  options: ForumPollOption[];
  results?: Record<string, number>; // optionId -> count
  totalVotes?: number;
  userVoteOptionId?: string | null;
}

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  postCount: number;
} 