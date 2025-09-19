import fs from 'fs';
import path from 'path';

const COMMENTS_FILE = path.join(process.cwd(), 'data', 'comments.json');

export interface Comment {
  id: string;
  postId: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
  };
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  userVote: 'upvote' | 'downvote' | null;
  isModerated: boolean;
  moderationResult: {
    isAppropriate: boolean;
    flags: string[];
  };
}

export interface CreateCommentData {
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
  };
}

// Ensure the data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(COMMENTS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Initialize comments file if it doesn't exist
const initializeCommentsFile = () => {
  ensureDataDirectory();
  if (!fs.existsSync(COMMENTS_FILE)) {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify([], null, 2));
  }
};

// Read all comments from file
export const getAllComments = (): Comment[] => {
  try {
    initializeCommentsFile();
    const data = fs.readFileSync(COMMENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading comments file:', error);
    return [];
  }
};

// Write comments to file
const writeCommentsToFile = (comments: Comment[]) => {
  try {
    ensureDataDirectory();
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
  } catch (error) {
    console.error('Error writing comments file:', error);
    throw error;
  }
};

// Get comments by post ID with smart sorting
export const getCommentsByPostId = (postId: string, sortBy: 'newest' | 'best' | 'top' = 'best'): Comment[] => {
  const comments = getAllComments();
  const postComments = comments.filter(comment => comment.postId === postId);
  
  switch (sortBy) {
    case 'newest':
      return postComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    case 'top':
      return postComments.sort((a, b) => {
        const aScore = a.votes.upvotes - a.votes.downvotes;
        const bScore = b.votes.upvotes - b.votes.downvotes;
        return bScore - aScore;
      });
    
    case 'best':
    default:
      return postComments.sort((a, b) => {
        // Reddit-style "best" algorithm
        const aScore = a.votes.upvotes - a.votes.downvotes;
        const bScore = b.votes.upvotes - b.votes.downvotes;
        
        // If scores are significantly different, sort by score
        if (Math.abs(aScore - bScore) > 5) {
          return bScore - aScore;
        }
        
        // If scores are similar, consider time (newer comments get slight boost)
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        const timeDiff = Math.abs(aTime - bTime) / (1000 * 60 * 60); // hours difference
        
        // If comments are within 24 hours, newer gets slight boost
        if (timeDiff < 24) {
          return bTime - aTime;
        }
        
        // Otherwise, sort by score
        return bScore - aScore;
      });
  }
};

// Create a new comment
export const createComment = (postId: string, commentData: CreateCommentData): Comment => {
  const comments = getAllComments();
  
  const newComment: Comment = {
    id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    postId,
    content: commentData.content.trim(),
    author: commentData.author,
    createdAt: new Date().toISOString(),
    votes: { upvotes: 0, downvotes: 0 },
    userVote: null,
    isModerated: true,
    moderationResult: { isAppropriate: true, flags: [] }
  };

  // Add to beginning of array (newest first)
  comments.unshift(newComment);
  writeCommentsToFile(comments);
  
  return newComment;
};

// Update comment votes
export const updateCommentVotes = (commentId: string, voteType: 'upvote' | 'downvote', userId: string): Comment | null => {
  const comments = getAllComments();
  const commentIndex = comments.findIndex(comment => comment.id === commentId);
  
  if (commentIndex === -1) {
    return null;
  }

  const comment = comments[commentIndex];
  const currentVote = comment.userVote;

  // Reset previous vote
  if (currentVote === 'upvote') {
    comment.votes.upvotes--;
  } else if (currentVote === 'downvote') {
    comment.votes.downvotes--;
  }

  // Apply new vote
  if (currentVote === voteType) {
    // Same vote - remove it
    comment.userVote = null;
  } else {
    // Different vote or new vote
    comment.userVote = voteType;
    if (voteType === 'upvote') {
      comment.votes.upvotes++;
    } else {
      comment.votes.downvotes++;
    }
  }

  writeCommentsToFile(comments);
  return comment;
};

// Delete a comment
export const deleteComment = (commentId: string, userId: string): boolean => {
  const comments = getAllComments();
  const commentIndex = comments.findIndex(comment => comment.id === commentId);
  
  if (commentIndex === -1) {
    return false;
  }

  const comment = comments[commentIndex];
  
  // Only allow deletion by the comment author
  if (comment.author.id !== userId) {
    return false;
  }

  comments.splice(commentIndex, 1);
  writeCommentsToFile(comments);
  
  return true;
};
