'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ThumbsUp, ThumbsDown, Flag, ArrowLeft, MessageSquare, User, Calendar, Send, TrendingUp, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import ModerationAlert from '@/components/ModerationAlert';
import ReportContent from '@/components/ReportContent';
import { ForumPost } from '@/types/forum';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ModernTooltip from '@/components/ModernTooltip';
import RecentGalleryImages from '@/components/RecentGalleryImages';

interface Comment {
  id: string;
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
  userVote?: 'upvote' | 'downvote' | null;
  isModerated: boolean;
  moderationResult?: {
    isAppropriate: boolean;
    flags: string[];
  };
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const postId = params?.id as string;
  
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [similarPosts, setSimilarPosts] = useState<ForumPost[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [reportingContent, setReportingContent] = useState<{ type: 'post' | 'comment', id: string } | null>(null);
  const [moderationAlert, setModerationAlert] = useState<any>(null);
  const [commentSortBy, setCommentSortBy] = useState<'best' | 'newest' | 'top'>('best');
  const [votingPost, setVotingPost] = useState(false);
  const [votingComments, setVotingComments] = useState<Set<string>>(new Set());
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Load post, comments, and similar posts
  useEffect(() => {
    const loadPost = async () => {
      try {
        const response = await fetch('/api/posts');
        if (response.ok) {
          const data = await response.json();
          const foundPost = data.posts.find((p: ForumPost) => p.id === postId);
          if (foundPost) {
            setPost(foundPost);
            
            // Load comments for this post
            const commentsResponse = await fetch(`/api/posts/${postId}/comments?sortBy=${commentSortBy}`);
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json();
              setComments(commentsData.comments);
            }
            
            // Find similar posts (same category, excluding current post)
            const similar = data.posts
              .filter((p: ForumPost) => p.id !== postId && p.category === foundPost.category)
              .slice(0, 3); // Show max 3 similar posts
            setSimilarPosts(similar);
          } else {
            // Post not found, redirect to forums
            router.push('/forums');
          }
        }
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      loadPost();
    }
  }, [postId, router, commentSortBy]);

  // Reload comments when sort changes
  const reloadComments = async () => {
    try {
      const commentsResponse = await fetch(`/api/posts/${postId}/comments?sortBy=${commentSortBy}`);
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setComments(commentsData.comments);
      }
    } catch (error) {
      console.error('Error reloading comments:', error);
    }
  };

  const handleVote = async (contentId: string, voteType: 'up' | 'down', contentType: 'post' | 'comment') => {
    if (!isAuthenticated || !user) {
      showToast('Please sign in to vote', 'error');
      return;
    }

    // Prevent multiple clicks
    if (contentType === 'post') {
      if (votingPost) return;
      setVotingPost(true);
    } else {
      if (votingComments.has(contentId)) return;
      setVotingComments(prev => new Set(prev).add(contentId));
    }

    try {
      if (contentType === 'post') {
        // Post voting
        const response = await fetch('/api/posts/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            postId: contentId,
            voteType,
            userId: user.id
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setPost(result.post);
        }
      } else {
        // Comment voting
        const response = await fetch(`/api/posts/${postId}/comments/${contentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            voteType: voteType === 'up' ? 'upvote' : 'downvote',
            userId: user.id
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setComments(prevComments => 
            prevComments.map(comment => 
              comment.id === contentId ? result.comment : comment
            )
          );
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      // Reset loading state
      if (contentType === 'post') {
        setVotingPost(false);
      } else {
        setVotingComments(prev => {
          const newSet = new Set(prev);
          newSet.delete(contentId);
          return newSet;
        });
      }
    }
  };

  const handleCreateComment = async () => {
    if (!newComment.trim()) {
      showToast('Please enter a comment', 'error');
      return;
    }

    if (!isAuthenticated || !user) {
      showToast('Please sign in to comment', 'error');
      return;
    }

    // Prevent double-clicking
    if (isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);

    try {
      // Simulate text moderation
      const moderationResponse = await fetch('/api/moderate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment })
      });
      
      const moderationResult = await moderationResponse.json();
      
      if (!moderationResult.isAppropriate) {
        setModerationAlert({
          result: moderationResult,
          type: 'rejected'
        });
        return;
      }

      // Create comment with actual user data
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          author: {
            id: user.id,
            name: user.username,
            avatar: user.avatar || '/DiceLogo.svg',
            reputation: user.reputation || 0
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setComments(prevComments => [result.comment, ...prevComments]);
        setNewComment('');
        
        setModerationAlert({
          result: moderationResult,
          type: 'approved'
        });
        
        showToast('Comment posted successfully!', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to create comment. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      showToast('Error creating comment. Please try again.', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!isAuthenticated || !user) {
      showToast('Please sign in to delete comments', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        })
      });

      if (response.ok) {
        // Remove comment from state
        setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
        showToast('Comment deleted successfully', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete comment. You can only delete your own comments.', 'error');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Error deleting comment. Please try again.', 'error');
    }
  };

  const handleReport = (contentType: 'post' | 'comment', contentId: string) => {
    setReportingContent({ type: contentType, id: contentId });
    setShowReport(true);
  };

  const handleDeletePost = async () => {
    if (!isAuthenticated || !user || !post) {
      return;
    }

    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorId: user.id
        })
      });

      if (response.ok) {
        // Redirect to forums after successful deletion
        showToast('Post deleted successfully', 'success');
        router.push('/forums');
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete post. You can only delete your own posts.', 'error');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('Error deleting post. Please try again.', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
            <Link href="/forums" className="btn-primary">
              Back to Forums
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-6">
          <Link 
            href="/forums" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forums
          </Link>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Main Content Area - Post and Comments */}
          <div className="lg:col-span-4 space-y-6">
            {/* Main Post Content - Full Width */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start space-x-4">
                {/* Vote buttons */}
                <div className="flex flex-col items-center space-y-2">
                   <button
                     onClick={() => handleVote(post.id, 'up', 'post')}
                     disabled={votingPost}
                     className={`p-2 rounded-full transition-colors ${
                       post.userVotes?.find(vote => vote.userId === user?.id)?.voteType === 'up'
                         ? 'bg-green-100 text-green-600' 
                         : 'hover:bg-gray-100 text-gray-400'
                     } ${votingPost ? 'opacity-50 cursor-not-allowed' : ''}`}
                   >
                     <ThumbsUp className="w-4 h-4" />
                   </button>
                   <span className="text-sm font-medium text-gray-900">
                     {post.votes.upvotes - post.votes.downvotes}
                   </span>
                   <button
                     onClick={() => handleVote(post.id, 'down', 'post')}
                     disabled={votingPost}
                     className={`p-2 rounded-full transition-colors ${
                       post.userVotes?.find(vote => vote.userId === user?.id)?.voteType === 'down'
                         ? 'bg-red-100 text-red-600' 
                         : 'hover:bg-gray-100 text-gray-400'
                     } ${votingPost ? 'opacity-50 cursor-not-allowed' : ''}`}
                   >
                     <ThumbsDown className="w-4 h-4" />
                   </button>
                 </div>

                {/* Post content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                      {post.category === 'general' ? 'General Discussion' : 
                       post.category === 'strategy' ? 'Strategy & Tips' : 
                       post.category === 'reviews' ? 'Reviews & Recommendations' : post.category}
                    </span>
                    {post.isModerated && post.moderationResult?.isAppropriate && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600 flex items-center space-x-1">
                        <Image
                          src="/CheckIcon.svg"
                          alt="Check Icon"
                          width={12}
                          height={12}
                          className="w-3 h-3"
                        />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    {post.title}
                  </h1>
                  
                  <div className="prose max-w-none mb-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-12 h-12 rounded-full border-2 border-black overflow-hidden"
                          style={{
                            backgroundImage: `url(${post.author.avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          }}
                        />
                        <span>{post.author.name}</span>
                        <span className="text-xs">({post.author.reputation} rep)</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{comments.length} comments</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Delete button - only show to post author */}
                      {isAuthenticated && user && post.author.id === user.id && (
                        <ModernTooltip content="Delete post" position="top">
                          <button
                            onClick={handleDeletePost}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </ModernTooltip>
                      )}
                      
                      <ModernTooltip content="Report post" position="top">
                        <button
                          onClick={() => handleReport('post', post.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      </ModernTooltip>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Add comment */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-black overflow-hidden"
                      style={{
                        backgroundImage: `url(${isAuthenticated && user ? (user.avatar || '/DiceLogo.svg') : '/DiceLogo.svg'})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={isAuthenticated ? "Write a comment..." : "Please sign in to comment"}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      disabled={!isAuthenticated}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleCreateComment}
                        disabled={!newComment.trim() || !isAuthenticated || isSubmittingComment}
                        className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmittingComment ? 'Posting...' : (isAuthenticated ? 'Post Comment' : 'Sign In to Comment')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-4">
                {/* Sort dropdown */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Comments ({comments.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                      value={commentSortBy}
                      onChange={(e) => {
                        setCommentSortBy(e.target.value as 'best' | 'newest' | 'top');
                        reloadComments();
                      }}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="best">Best</option>
                      <option value="newest">Newest</option>
                      <option value="top">Top</option>
                    </select>
                  </div>
                </div>

                {comments.map(comment => (
                  <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex items-start space-x-3">
                      {/* Vote buttons */}
                      <div className="flex flex-col items-center space-y-1">
                        <button
                          onClick={() => handleVote(comment.id, 'up', 'comment')}
                          disabled={votingComments.has(comment.id)}
                          className={`p-1 rounded-full transition-colors ${
                            comment.userVote === 'upvote' 
                              ? 'bg-green-100 text-green-600' 
                              : 'hover:bg-gray-100 text-gray-400'
                          } ${votingComments.has(comment.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-medium text-gray-900">
                          {comment.votes.upvotes - comment.votes.downvotes}
                        </span>
                        <button
                          onClick={() => handleVote(comment.id, 'down', 'comment')}
                          disabled={votingComments.has(comment.id)}
                          className={`p-1 rounded-full transition-colors ${
                            comment.userVote === 'downvote' 
                              ? 'bg-red-100 text-red-600' 
                              : 'hover:bg-gray-100 text-gray-400'
                          } ${votingComments.has(comment.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Comment content */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-10 h-10 rounded-full border-2 border-black overflow-hidden"
                              style={{
                                backgroundImage: `url(${comment.author.avatar})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat'
                              }}
                            />
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <span className="font-medium">{comment.author.name}</span>
                              <span className="text-xs">({comment.author.reputation} rep)</span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                          {comment.isModerated && comment.moderationResult?.isAppropriate && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-green-600 flex items-center space-x-1">
                                <Image
                                  src="/CheckIcon.svg"
                                  alt="Check Icon"
                                  width={10}
                                  height={10}
                                  className="w-2.5 h-2.5"
                                />
                                <span>Verified</span>
                              </span>
                            </>
                          )}
                        </div>
                        
                        <p className="text-gray-700 mb-2 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                        
                        <div className="flex justify-end">
                          <ModernTooltip content="Report comment" position="top">
                            <button
                              onClick={() => handleReport('comment', comment.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                          </ModernTooltip>
                          {isAuthenticated && user && comment.author.id === user.id && (
                            <ModernTooltip content="Delete comment" position="top">
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </ModernTooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <div className="text-center py-8">
                    <Image
                      src="/WizardIcon.svg"
                      alt="Wizard"
                      width={96}
                      height={96}
                      className="w-24 h-24 text-gray-400 mx-auto mb-4"
                    />
                    <p className="text-gray-500">This post is waiting for its first tale.</p>
                    <p className="text-gray-500">Got something to say? Step into the circle!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Similar Posts */}
            {similarPosts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Image
                    src="/SimilarPostsIcon.svg"
                    alt="Similar Posts"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <h2 className="text-lg font-semibold text-gray-900">Similar Posts</h2>
                </div>
                <div className="space-y-3">
                  {similarPosts.map(similarPost => (
                    <Link 
                      key={similarPost.id} 
                      href={`/forums/post/${similarPost.id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2">
                          {similarPost.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{similarPost.author.name}</span>
                          <span>{similarPost.votes.upvotes - similarPost.votes.downvotes} votes</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Interact with our community! */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Image
                  src="/CommunityIcon.svg"
                  alt="Community"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <h2 className="text-lg font-semibold text-gray-900">Interact with our community!</h2>
              </div>
              <div className="space-y-4">
                <a 
                  href="https://discord.gg/3xh7yUnnnW" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <div>
                    <div className="font-medium">Join our Discord</div>
                    <div className="text-sm opacity-90">Connect with fellow gamers</div>
                  </div>
                </a>

                <a 
                  href="https://x.com/KingDiceHub" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <div>
                    <div className="font-medium">Follow on X</div>
                    <div className="text-sm opacity-90">Latest updates & news</div>
                  </div>
                </a>

                <a 
                  href="https://www.instagram.com/kingdice.gg/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 p-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-lg hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <div>
                    <div className="font-medium">Follow on Instagram</div>
                    <div className="text-sm opacity-90">Board game photos & stories</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Our Gallery */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <Link href="/community-gallery" className="flex items-center space-x-2 hover:text-purple-600 transition-colors">
                  <Image
                    src="/GalleryIcon.svg"
                    alt="Gallery"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <h2 className="text-lg font-semibold text-gray-900">Our Gallery</h2>
                </Link>
                <Link 
                  href="/community-gallery" 
                  className="text-sm text-[#fbae17] hover:text-[#e69c0f] font-medium"
                >
                  See more
                </Link>
              </div>
              <RecentGalleryImages limit={4} />
            </div>
          </div>
        </div>

        {/* Moderation Alert */}
        {moderationAlert && (
          <ModerationAlert
            result={moderationAlert.result}
            type={moderationAlert.type}
            onDismiss={() => setModerationAlert(null)}
            showDetails={true}
          />
        )}

        {/* Report Modal */}
        {showReport && reportingContent && (
          <ReportContent
            contentType={reportingContent.type === 'post' ? 'forum_post' : 'comment'}
            contentId={reportingContent.id}
            onReport={(report) => {
              console.log('Report submitted:', report);
              setShowReport(false);
              setReportingContent(null);
            }}
            onClose={() => {
              setShowReport(false);
              setReportingContent(null);
            }}
          />
        )}
      </div>
    </div>
  );
}