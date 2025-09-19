import { ForumPost } from '@/types/forum';
import fs from 'fs';
import path from 'path';

// File path for storing posts
const POSTS_FILE = path.join(process.cwd(), 'data', 'posts.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(POSTS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Load posts from file
const loadPosts = (): ForumPost[] => {
  try {
    ensureDataDirectory();
    if (fs.existsSync(POSTS_FILE)) {
      const data = fs.readFileSync(POSTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading posts:', error);
  }
  return [];
};

// Save posts to file
const savePosts = (posts: ForumPost[]) => {
  try {
    ensureDataDirectory();
    fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
  } catch (error) {
    console.error('Error saving posts:', error);
  }
};

// Add user votes tracking
interface UserVote {
  userId: string;
  voteType: 'up' | 'down';
  timestamp: string;
}

interface PostWithUserVotes extends ForumPost {
  userVotes: UserVote[];
}

// Initialize posts array
let posts: ForumPost[] = loadPosts();

// Initialize replies counts for all posts
export function initializeRepliesCounts(): void {
  const { getAllComments } = require('./comments');
  const allComments = getAllComments();
  
  posts.forEach(post => {
    const postComments = allComments.filter((comment: any) => comment.postId === post.id);
    if (post.replies !== postComments.length) {
      post.replies = postComments.length;
    }
  });
  
  savePosts(posts);
}

// Initialize replies counts on load
initializeRepliesCounts();

// Initialize userVotes for existing posts that don't have it
export function initializeUserVotes(): void {
  let needsUpdate = false;
  
  posts.forEach(post => {
    if (!post.userVotes) {
      post.userVotes = [];
      needsUpdate = true;
    }
  });
  
  if (needsUpdate) {
    savePosts(posts);
  }
}

// Initialize userVotes on load
initializeUserVotes();

// No welcome post creation - let users create their own posts

export interface CreatePostData {
  title: string;
  content: string;
  category: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
  };
}

export function getAllPosts(): ForumPost[] {
  return [...posts];
}

export function getPostsByCategory(category: string): ForumPost[] {
  if (category === 'all') {
    return getAllPosts();
  }
  return posts.filter(post => post.category === category);
}

export function createPost(postData: CreatePostData): ForumPost {
  const newPost: ForumPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: postData.title,
    content: postData.content,
    author: postData.author,
    category: postData.category,
    createdAt: new Date().toISOString(),
    votes: { upvotes: 0, downvotes: 0 },
    userVote: null,
    userVotes: [],
    replies: 0,
    isModerated: true,
    moderationResult: { isAppropriate: true, flags: [] }
  };

  // Add to beginning of posts array (newest first)
  posts.unshift(newPost);
  
  // Save to file
  savePosts(posts);
  
  return newPost;
}

export function updatePostVote(postId: string, voteType: 'up' | 'down' | null, userId: string): ForumPost | null {
  const postIndex = posts.findIndex(post => post.id === postId);
  if (postIndex === -1) {
    return null;
  }

  const post = posts[postIndex];
  
  // Get current user vote
  const currentUserVote = post.userVotes?.find(vote => vote.userId === userId);
  const currentVoteType = currentUserVote?.voteType || null;
  
  // Calculate vote changes
  let upvoteChange = 0;
  let downvoteChange = 0;
  let newVoteType: 'up' | 'down' | null = voteType;
  
  if (currentVoteType === voteType) {
    // Remove vote (clicking same button)
    newVoteType = null;
    if (voteType === 'up') upvoteChange = -1;
    else if (voteType === 'down') downvoteChange = -1;
  } else {
    // Add new vote or change vote
    if (voteType === 'up') upvoteChange = 1;
    else if (voteType === 'down') downvoteChange = 1;
    
    // Remove previous vote if exists
    if (currentVoteType === 'up') upvoteChange -= 1;
    else if (currentVoteType === 'down') downvoteChange -= 1;
  }

  // Update user votes array
  const updatedUserVotes = post.userVotes ? [...post.userVotes] : [];
  
  if (newVoteType === null) {
    // Remove user's vote
    const voteIndex = updatedUserVotes.findIndex(vote => vote.userId === userId);
    if (voteIndex !== -1) {
      updatedUserVotes.splice(voteIndex, 1);
    }
  } else {
    // Add or update user's vote
    const existingVoteIndex = updatedUserVotes.findIndex(vote => vote.userId === userId);
    const newVote: UserVote = {
      userId,
      voteType: newVoteType,
      timestamp: new Date().toISOString()
    };
    
    if (existingVoteIndex !== -1) {
      updatedUserVotes[existingVoteIndex] = newVote;
    } else {
      updatedUserVotes.push(newVote);
    }
  }

  const updatedPost: ForumPost = {
    ...post,
    userVote: newVoteType, // Keep for backward compatibility
    votes: {
      upvotes: Math.max(0, post.votes.upvotes + upvoteChange),
      downvotes: Math.max(0, post.votes.downvotes + downvoteChange)
    },
    userVotes: updatedUserVotes
  };

  posts[postIndex] = updatedPost;
  
  // Save to file
  savePosts(posts);
  
  return updatedPost;
}

export function getPostById(postId: string): ForumPost | null {
  return posts.find(post => post.id === postId) || null;
}

// Helper function to get user's vote for a post
export function getUserVote(postId: string, userId: string): 'up' | 'down' | null {
  const post = posts.find(post => post.id === postId);
  if (!post || !post.userVotes) return null;
  
  const userVote = post.userVotes.find(vote => vote.userId === userId);
  return userVote ? userVote.voteType : null;
}

export function updatePostRepliesCount(postId: string): void {
  const postIndex = posts.findIndex(post => post.id === postId);
  if (postIndex === -1) return;

  // Import the comments function to count comments
  const { getAllComments } = require('./comments');
  const allComments = getAllComments();
  const postComments = allComments.filter((comment: any) => comment.postId === postId);
  
  const updatedPost: ForumPost = {
    ...posts[postIndex],
    replies: postComments.length
  };

  posts[postIndex] = updatedPost;
  savePosts(posts);
} 