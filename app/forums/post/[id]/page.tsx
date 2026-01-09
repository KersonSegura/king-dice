'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ThumbsUp, ThumbsDown, Flag, ArrowLeft, MessageSquare, User, Calendar, Send, TrendingUp, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import ModerationAlert from '@/components/ModerationAlert';
import ReportContent from '@/components/ReportContent';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { ForumPost } from '@/types/forum';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ModernTooltip from '@/components/ModernTooltip';
import RecentGalleryImages from '@/components/RecentGalleryImages';
import { useGameMentions } from '@/hooks/useGameMentions';
import { renderContentWithGameLinks } from '@/utils/renderContent';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('forums');
  const tCommon = useTranslations('common');
  const tChat = useTranslations('chat');
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
  // Local user vote for immediate UI feedback
  const [localUserVote, setLocalUserVote] = useState<'up' | 'down' | null>(null);
  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false);
  const [showDeleteCommentConfirm, setShowDeleteCommentConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [pollVoting, setPollVoting] = useState(false);
  
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    showMentionDropdown,
    mentionQuery,
    mentionSearchQuery,
    handleMentionSearchInputChange,
    closeMentionDropdown,
    mentionResults,
    selectedMentionIndex,
    mentionDropdownRef,
    handleTyping: handleCommentTyping,
    handleKeyPress: handleCommentKeyPress,
    insertGameMention,
    convertGameMentionsToMarkdown
  } = useGameMentions(newComment, setNewComment, commentTextareaRef);

  // Sync local vote whenever post changes
  useEffect(() => {
    setLocalUserVote((post as any)?.userVote ?? null);
  }, [post?.id, (post as any)?.userVote]);

  // Load post, comments, and similar posts
  useEffect(() => {
    const loadPost = async () => {
      try {
        const response = await fetch(`/api/posts/${postId}${isAuthenticated && user ? `?userId=${user.id}` : ''}`, { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          const foundPost = data.post;
          if (foundPost) {
            setPost(foundPost);
            
            // Load comments for this post
            const commentsUrl = `/api/posts/${postId}/comments?sortBy=${commentSortBy}${isAuthenticated && user ? `&userId=${user.id}` : ''}`;
            const commentsResponse = await fetch(commentsUrl);
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json();
              setComments(commentsData.comments || []);
            }
            
            // Load list to compute similar posts
            try {
              const listRes = await fetch('/api/posts?page=1&limit=50', { cache: 'no-store' });
              if (listRes.ok) {
                const list = await listRes.json();
                const all = list.posts || [];
                const similar = all
                  .filter((p: ForumPost) => p.id !== postId && p.category === foundPost.category)
                  .slice(0, 3);
                setSimilarPosts(similar);
              }
            } catch {}
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
    // Re-run when auth/user resolves so we fetch with userId and get userVote
  }, [postId, router, commentSortBy, isAuthenticated, user?.id]);

  // Reload comments when sort changes
  const reloadComments = async () => {
    try {
      const commentsResponse = await fetch(`/api/posts/${postId}/comments?sortBy=${commentSortBy}${isAuthenticated && user ? `&userId=${user.id}` : ''}`);
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
      showToast(tCommon('pleaseSignIn'), 'error');
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
        // Determine toggle/swap semantics locally so server gets intent
        const current = localUserVote;
        const effectiveVote = current === voteType ? null : voteType;

        // Optimistic UI: set local user vote immediately
        setLocalUserVote(effectiveVote);
        // Optimistic counter update
        setPost(prev => {
          if (!prev) return prev;
          const prevNet = (prev.votes?.upvotes || 0) - (prev.votes?.downvotes || 0);
          let up = prev.votes?.upvotes || 0;
          let down = prev.votes?.downvotes || 0;
          if (current === 'up') up -= 1; else if (current === 'down') down -= 1;
          if (effectiveVote === 'up') up += 1; else if (effectiveVote === 'down') down += 1;
          return { ...(prev as any), votes: { upvotes: Math.max(0, up), downvotes: Math.max(0, down) } } as any;
        });

        const response = await fetch('/api/posts/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            postId: contentId,
            voteType: effectiveVote,
            userId: user.id
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[POST VOTE] API Response:', { result, post: result.post, votes: result.post?.votes, userVote: result.post?.userVote });
          if (result.post) {
            setPost(result.post);
            setLocalUserVote(result.post?.userVote ?? null);
          } else {
            console.error('[POST VOTE] No post in response!', result);
            // Revert optimistic update on malformed response
            setLocalUserVote((post as any)?.userVote ?? null);
          }
          try {
            // Notify forums list to patch the post in place when navigating back
            if (result.post) {
              window.dispatchEvent(new CustomEvent('kd-forum-post-updated', { detail: { post: result.post } }));
            }
          } catch {}
        } else {
          // Log the error details - read as text first, then parse
          let errorData: any = { error: 'Unknown error' };
          try {
            const errorText = await response.text();
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText };
            }
          } catch (e) {
            console.error('[POST VOTE] Failed to read error response:', e);
          }
          
          console.error('[POST VOTE] API Error Response:', { 
            status: response.status, 
            statusText: response.statusText,
            error: errorData 
          });
          
          // Revert local vote on error
          setLocalUserVote((post as any)?.userVote ?? null);
          // Re-fetch post snapshot to correct counts
          try {
            const snap = await fetch(`/api/posts${isAuthenticated && user ? `?userId=${user.id}` : ''}`, { cache: 'no-store' });
            if (snap.ok) {
              const d = await snap.json();
              const found = (d.posts || []).find((p: any) => p.id === postId);
              if (found) setPost(found);
            }
          } catch {}
          
          showToast(errorData?.details || errorData?.error || t('voteFailed'), 'error');
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

  const handlePollVote = async (optionId: string) => {
    if (!post) return;
    if (!isAuthenticated || !user) {
      showToast(tCommon('pleaseSignIn'), 'error');
      return;
    }
    if (pollVoting) return;

    try {
      setPollVoting(true);
      const current = (post as any)?.poll?.userVoteOptionId ?? null;
      const effective = current === optionId ? null : optionId;

      const resp = await fetch('/api/posts/poll/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, optionId: effective, userId: user.id })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        showToast(err?.details || err?.error || t('voteFailed'), 'error');
        return;
      }

      const data = await resp.json();
      const overlay = data?.poll;
      if (overlay) {
        setPost(prev => {
          if (!prev) return prev;
          return {
            ...(prev as any),
            poll: {
              ...((prev as any).poll || {}),
              ...overlay
            }
          } as any;
        });
      }
    } finally {
      setPollVoting(false);
    }
  };

  const renderPoll = () => {
    if (!post || (post as any).postType !== 'poll' || !(post as any).poll) return null;
    const poll = (post as any).poll;
    const options = Array.isArray(poll.options) ? poll.options : [];
    if (!options.length) return null;

    const results: Record<string, number> = poll.results || {};
    const totalVotes: number = typeof poll.totalVotes === 'number' ? poll.totalVotes : Object.values(results).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    const userVoteOptionId: string | null = poll.userVoteOptionId ?? null;

    return (
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="text-sm font-semibold text-gray-900 mb-3">{poll.question}</div>
        <div className="space-y-2">
          {options.map((o: any) => {
            const count = Number(results?.[o.id] ?? 0);
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const selected = userVoteOptionId === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => handlePollVote(String(o.id))}
                disabled={pollVoting}
                className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                  selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                } ${pollVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-900 break-words">{o.text}</div>
                    {(totalVotes > 0 || userVoteOptionId) && (
                      <div className="mt-1 h-2 w-full rounded bg-gray-100 overflow-hidden">
                        <div className="h-full bg-primary-500" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  {(totalVotes > 0 || userVoteOptionId) && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap">
                      <span>{pct}%</span>
                      <span>·</span>
                      <span>
                        {count} {t('pollVotes')}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-gray-600">
          {t('pollTotalVotes')}: {totalVotes}
        </div>
      </div>
    );
  };

  const handleCreateComment = async () => {
    if (!newComment.trim()) {
      showToast(t('pleaseEnterComment'), 'error');
      return;
    }

    if (!isAuthenticated || !user) {
      showToast(tCommon('pleaseSignIn'), 'error');
      return;
    }

    // Prevent double-clicking
    if (isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);

    try {
      // Convert game mentions to markdown format
      const contentWithLinks = convertGameMentionsToMarkdown(newComment);
      
      // Simulate text moderation
      const moderationResponse = await fetch('/api/moderate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: contentWithLinks })
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
          content: contentWithLinks,
          author: {
            id: user.id,
            name: user.username,
            avatar: user.avatar || '/DiceLogo.svg'
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

    setCommentToDelete(commentId);
    setShowDeleteCommentConfirm(true);
  };

  const confirmDeleteComment = async () => {
    if (!isAuthenticated || !user || !commentToDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentToDelete}`, {
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
        setComments(prevComments => prevComments.filter(comment => comment.id !== commentToDelete));
        showToast('Comment deleted successfully', 'success');

        try {
          const refreshed = await fetch(`/api/posts/${postId}/comments?sortBy=${commentSortBy}${isAuthenticated && user ? `&userId=${user.id}` : ''}`);
          if (refreshed.ok) {
            const refreshedData = await refreshed.json();
            setComments(refreshedData.comments || []);
          }
        } catch (refreshError) {
          console.error('Error refreshing comments after delete:', refreshError);
        }
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete comment. You can only delete your own comments.', 'error');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Error deleting comment. Please try again.', 'error');
    } finally {
      setShowDeleteCommentConfirm(false);
      setCommentToDelete(null);
    }
  };

  const handleReport = (contentType: 'post' | 'comment', contentId: string) => {
    setReportingContent({ type: contentType, id: contentId });
    setShowReport(true);
  };

  const handleDeletePost = () => {
    if (!isAuthenticated || !user || !post) {
      return;
    }

    setShowDeletePostConfirm(true);
  };

  const confirmDeletePost = async () => {
    if (!isAuthenticated || !user || !post) {
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
    } finally {
      setShowDeletePostConfirm(false);
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full overflow-x-hidden">
        {/* Back button */}
        <div className="mb-6">
          <Link 
            href="/forums" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToForums')}
          </Link>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 lg:gap-6">
          {/* Main Content Area - Post and Comments */}
          <div className="lg:col-span-4 space-y-4 lg:space-y-6">
            {/* Main Post Content - Full Width */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              {/* Mobile Layout */}
              <div className="sm:hidden">
                {/* Top: Title, Category, Date */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                      {post.category === 'general' ? t('categoryGeneral') : 
                       post.category === 'strategy' ? t('categoryStrategy') : 
                       post.category === 'reviews' ? t('categoryReviews') : post.category}
                    </span>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                  
                  <h1 className="text-xl font-bold text-gray-900 mb-4 break-words">
                    {post.title}
                  </h1>
                </div>
                
                {renderPoll()}

                {/* Content */}
                <div className="prose max-w-none mb-6">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                    {renderContentWithGameLinks(post.content, false, { renderImages: true })}
                  </div>
                </div>

                {/* Bottom: Author, Likes, Comments, Actions */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-black overflow-hidden flex-shrink-0"
                        style={{
                          backgroundImage: `url(${post.author.avatar})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{post.author.name}</span>
                        <span className="text-xs text-gray-500">({post.author.reputation} rep)</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Delete button - only show to post author */}
                      {isAuthenticated && user && post.author.id === user.id && (
                        <ModernTooltip content="Delete post" position="top">
                          <button
                            onClick={handleDeletePost}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </ModernTooltip>
                      )}
                      
                      <ModernTooltip content={t('reportPostTooltip')} position="top">
                        <button
                          onClick={() => handleReport('post', post.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      </ModernTooltip>
                    </div>
                  </div>

                  {/* Voting buttons and comments */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {/* Vote buttons */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleVote(post.id, 'up', 'post')}
                          disabled={votingPost}
                          className={`p-1 rounded-full transition-colors ${
                            localUserVote === 'up'
                              ? 'bg-green-100 text-green-600' 
                              : 'hover:bg-gray-100 text-gray-400'
                          } ${votingPost ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <span className="font-medium">{post.votes.upvotes - post.votes.downvotes}</span>
                        <button
                          onClick={() => handleVote(post.id, 'down', 'post')}
                          disabled={votingPost}
                          className={`p-1 rounded-full transition-colors ${
                            localUserVote === 'down'
                              ? 'bg-red-100 text-red-600' 
                              : 'hover:bg-gray-100 text-gray-400'
                          } ${votingPost ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                      
                      {/* Comments count */}
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{comments.length} comments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:block">
              <div className="flex items-start space-x-4">
                {/* Vote buttons */}
                <div className="flex flex-col items-center space-y-2">
                   <button
                     onClick={() => handleVote(post.id, 'up', 'post')}
                     disabled={votingPost}
                     className={`p-2 rounded-full transition-colors ${
                       localUserVote === 'up'
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
                       localUserVote === 'down'
                         ? 'bg-red-100 text-red-600' 
                         : 'hover:bg-gray-100 text-gray-400'
                     } ${votingPost ? 'opacity-50 cursor-not-allowed' : ''}`}
                   >
                     <ThumbsDown className="w-4 h-4" />
                   </button>
                 </div>

                {/* Post content */}
                  <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                      {post.category === 'general' ? t('categoryGeneral') : 
                       post.category === 'strategy' ? t('categoryStrategy') : 
                       post.category === 'reviews' ? t('categoryReviews') : post.category}
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
                  
                    <h1 className="text-2xl font-bold text-gray-900 mb-4 break-words">
                    {post.title}
                  </h1>
                  
                  {renderPoll()}

                  <div className="prose max-w-none mb-6">
                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                      {renderContentWithGameLinks(post.content, false, { renderImages: true })}
                    </div>
                  </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <div 
                            className="w-12 h-12 rounded-full border-2 border-black overflow-hidden flex-shrink-0"
                          style={{
                            backgroundImage: `url(${post.author.avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          }}
                        />
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{post.author.name}</span>
                        <span className="text-xs">({post.author.reputation} rep)</span>
                          </div>
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
                      
                      <ModernTooltip content={t('reportPostTooltip')} position="top">
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
            </div>

            {/* Comments section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              {/* Add comment */}
              <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex space-x-2 sm:space-x-3">
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
                  <div className="flex-1 min-w-0 relative">
                    <textarea
                      ref={commentTextareaRef}
                      value={newComment}
                      onChange={handleCommentTyping}
                      onKeyDown={handleCommentKeyPress}
                      placeholder={isAuthenticated ? t('writeCommentMention') : t('pleaseSignInToComment')}
                      rows={3}
                      className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm sm:text-base"
                      disabled={!isAuthenticated}
                    />
                    
                    {/* Game Mention Dropdown */}
                    {showMentionDropdown && (
                      <div
                        ref={mentionDropdownRef}
                        className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-hidden flex flex-col"
                      >
                        <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200 flex items-center justify-between">
                          <span>{tChat('linkGames')}</span>
                          <button
                            type="button"
                            onClick={closeMentionDropdown}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            aria-label={tCommon('close')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="px-3 py-2 border-b border-gray-200 bg-white">
                          <input
                            value={mentionSearchQuery}
                            onChange={(e) => handleMentionSearchInputChange(e.target.value)}
                            onKeyDown={(e) => handleCommentKeyPress(e as any)}
                            placeholder={tChat('searchGame')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        {mentionResults.length > 0 ? (
                          <div className="py-1 overflow-y-auto flex-1 min-h-0 pb-1">
                            {mentionResults.map((game, index) => (
                              <button
                                key={game.id}
                                onClick={() => insertGameMention(game)}
                                className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${
                                  index === selectedMentionIndex ? 'bg-blue-100' : ''
                                }`}
                              >
                                <div className="font-medium text-sm text-gray-900">
                                  {game.nameEn || game.name}
                                </div>
                                {game.yearRelease && (
                                  <div className="text-xs text-gray-500">
                                    {game.yearRelease}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : mentionQuery.length > 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center">
                            {tChat('noGamesFound')}
                          </div>
                        ) : (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center">
                            {tChat('typeToSearchGames')}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleCreateComment}
                        disabled={!newComment.trim() || !isAuthenticated || isSubmittingComment}
                        className="text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-2"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-4">
                {/* Sort dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4 space-y-2 sm:space-y-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Comments ({comments.length})
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs sm:text-sm text-gray-600">{t('sortBy')}</span>
                    <select
                      value={commentSortBy}
                      onChange={(e) => {
                        setCommentSortBy(e.target.value as 'best' | 'newest' | 'top');
                        reloadComments();
                      }}
                      className="text-xs sm:text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="best">{t('sortBest')}</option>
                      <option value="newest">{t('sortNewest')}</option>
                      <option value="top">{t('sortTop')}</option>
                    </select>
                  </div>
                </div>

                {comments.map(comment => (
                  <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex items-start space-x-2 sm:space-x-3">
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
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-black overflow-hidden flex-shrink-0"
                              style={{
                                backgroundImage: `url(${comment.author.avatar})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat'
                              }}
                            />
                            <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-500">
                              <span className="font-medium">{comment.author.name}</span>
                              <span className="text-xs">({comment.author.reputation} rep)</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <span>{formatDate(comment.createdAt)}</span>
                          {comment.isModerated && comment.moderationResult?.isAppropriate && (
                            <>
                                <span>•</span>
                                <span className="text-green-600 flex items-center space-x-1">
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
                        </div>
                        
                        <div className="text-gray-700 mb-2 whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm sm:text-base">
                          {renderContentWithGameLinks(comment.content)}
                        </div>
                        
                        <div className="flex justify-end">
                          <ModernTooltip content={t('reportCommentTooltip')} position="top">
                            <button
                              onClick={() => handleReport('comment', comment.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                          </ModernTooltip>
                          {isAuthenticated && user && comment.author.id === user.id && (
                            <ModernTooltip content={t('deleteCommentTooltip')} position="top">
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
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Similar Posts */}
            {similarPosts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Image
                    src="/SimilarPostsIcon.svg"
                    alt="Similar Posts"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Similar Posts</h2>
                </div>
                <div className="space-y-3">
                  {similarPosts.map(similarPost => (
                    <Link 
                      key={similarPost.id} 
                      href={`/forums/post/${similarPost.id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="space-y-2">
                        <h3 className="text-xs sm:text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2 break-words">
                          {similarPost.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="truncate">{similarPost.author.name}</span>
                          <span className="flex-shrink-0 ml-2">{similarPost.votes.upvotes - similarPost.votes.downvotes} votes</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Interact with our community! */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Image
                  src="/CommunityIcon.svg"
                  alt="Community"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Interact with our community!</h2>
              </div>
              <div className="space-y-4">
                <a 
                  href="https://discord.gg/3xh7yUnnnW" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <div className="min-w-0">
                    <div className="font-medium text-sm sm:text-base">Join our Discord</div>
                    <div className="text-xs sm:text-sm opacity-90">Connect with fellow gamers</div>
                  </div>
                </a>

                <a 
                  href="https://x.com/KingDiceHub" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <div className="min-w-0">
                    <div className="font-medium text-sm sm:text-base">Follow on X</div>
                    <div className="text-xs sm:text-sm opacity-90">Latest updates & news</div>
                  </div>
                </a>

                <a 
                  href="https://www.instagram.com/kingdice.gg/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-lg hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <div className="min-w-0">
                    <div className="font-medium text-sm sm:text-base">Follow on Instagram</div>
                    <div className="text-xs sm:text-sm opacity-90">Board game photos & stories</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Our Gallery */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <Link href="/community-gallery" className="flex items-center space-x-2 hover:text-purple-600 transition-colors">
                  <Image
                    src="/GalleryIcon.svg"
                    alt="Gallery"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Our Gallery</h2>
                </Link>
                <Link 
                  href="/community-gallery" 
                  className="text-xs sm:text-sm text-[#fbae17] hover:text-[#e69c0f] font-medium"
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

        {/* Delete Post Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeletePostConfirm}
          onClose={() => setShowDeletePostConfirm(false)}
          onConfirm={confirmDeletePost}
          title="Delete Post"
          message="Are you sure you want to delete this post? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Delete Comment Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteCommentConfirm}
          onClose={() => {
            setShowDeleteCommentConfirm(false);
            setCommentToDelete(null);
          }}
          onConfirm={confirmDeleteComment}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </div>
  );
}