'use client';

import { useState, useEffect, Suspense } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Flag, Plus, User, Calendar, MessageCircle, Lock, Trash2, ArrowUp, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import ModerationAlert from '@/components/ModerationAlert';
import ReportContent from '@/components/ReportContent';
import CommunityGuidelines from '@/components/CommunityGuidelines';
import { ForumPost, ForumCategory } from '@/types/forum';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useChatState } from '@/contexts/ChatStateContext';
import LoginModal from '@/components/LoginModal';
import ModernTooltip from '@/components/ModernTooltip';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useGameMentions } from '@/hooks/useGameMentions';
import { renderContentWithGameLinks } from '@/utils/renderContent';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import LoadingScreen from '@/components/LoadingScreen';

function ForumsPageContent() {
  const t = useTranslations('forums');
  const tCommon = useTranslations('common');
  const tChat = useTranslations('chat');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const tf = (key: string, fallback: string) => {
    const anyT = t as any;
    if (typeof anyT?.has === 'function') {
      return anyT.has(key) ? t(key as any) : fallback;
    }
    try {
      return t(key as any);
    } catch {
      return fallback;
    }
  };
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reportingPost, setReportingPost] = useState<ForumPost | null>(null);
  const [moderationAlert, setModerationAlert] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [votingPosts, setVotingPosts] = useState<Set<string>>(new Set());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const renderPollPreview = (post: any) => {
    if (post?.postType !== 'poll' || !post?.poll?.options?.length) return null;
    const poll = post.poll;
    const options = poll.options || [];
    const results: Record<string, number> = poll.results || {};
    const totalVotes: number = typeof poll.totalVotes === 'number'
      ? poll.totalVotes
      : Object.values(results).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
          {poll.question}
        </div>
        <div className="space-y-2">
          {options.slice(0, 4).map((o: any) => {
            const count = Number(results?.[o.id] ?? 0);
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            return (
              <div key={o.id} className="rounded-md border border-gray-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-sm text-gray-900 truncate">{o.text}</div>
                  <div className="text-xs text-gray-600 whitespace-nowrap">
                    {pct}% · {count} {t('pollVotes')}
                  </div>
                </div>
                <div className="mt-1 h-2 w-full rounded bg-gray-100 overflow-hidden">
                  <div className="h-full bg-primary-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-gray-600">
          {t('pollTotalVotes')}: {totalVotes}
        </div>
      </div>
    );
  };
  
  const {
    showMentionDropdown,
    mentionQuery,
    mentionSearchQuery,
    handleMentionSearchInputChange,
    closeMentionDropdown,
    mentionResults,
    selectedMentionIndex,
    mentionDropdownRef,
    handleTyping: handleContentTyping,
    handleKeyPress: handleContentKeyPress,
    insertGameMention,
    convertGameMentionsToMarkdown
  } = useGameMentions(newPost.content, (content) => setNewPost({...newPost, content}), contentTextareaRef);

  // Handle URL parameters for category and author selection
  useEffect(() => {
    const categoryParam = searchParams?.get('category');
    const authorParam = searchParams?.get('author');
    
    if (categoryParam && ['general', 'strategy', 'reviews'].includes(categoryParam)) {
      setSelectedCategory(categoryParam);
    }
    
    if (authorParam) {
      setSelectedAuthor(authorParam);
    }
  }, [searchParams]);

  // Load posts and categories
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const url = `/api/posts?page=1&limit=20${isAuthenticated && user ? `&userId=${user.id}` : ''}`;
        const response = await fetch(url, { 
          cache: 'no-store',
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
          setHasMorePosts((data.posts || []).length === 20);
        } else {
          console.error('Failed to load posts:', response.status, response.statusText);
          const errorData = await response.json().catch(() => ({}));
          console.error('Error details:', errorData);
          setPosts([]);
        }
      } catch (error) {
        console.error('Error loading posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    const translateCategoryName = (categoryId: string): string => {
      const categoryMap: { [key: string]: string } = {
        'general': t('categoryGeneral'),
        'strategy': t('categoryStrategy'),
        'reviews': t('categoryReviews')
      };
      return categoryMap[categoryId] || categoryId;
    };

    const categories: ForumCategory[] = [
      {
        id: 'general',
        name: translateCategoryName('general'),
        description: 'Share your thoughts on board games',
        icon: '💬',
        color: 'bg-blue-100 text-blue-600',
        postCount: 0
      },
      {
        id: 'strategy',
        name: translateCategoryName('strategy'),
        description: 'Discuss winning strategies and tips',
        icon: '🎯',
        color: 'bg-[#fbae17]/10 text-[#fbae17]',
        postCount: 0
      },
      {
        id: 'reviews',
        name: translateCategoryName('reviews'),
        description: 'Share game reviews and recommendations',
        icon: '⭐',
        color: 'bg-purple-100 text-purple-600',
        postCount: 0
      }
    ];

    setCategories(categories);
    loadPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Infinite scroll functionality
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        if (!isLoadingMore && hasMorePosts) {
          loadMorePosts();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMorePosts]);

  const loadMorePosts = async () => {
    if (isLoadingMore || !hasMorePosts) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await fetch(`/api/posts?page=${nextPage}&limit=20${isAuthenticated && user ? `&userId=${user.id}` : ''}`, { cache: 'no-store' });
      
      if (response.ok) {
        const data = await response.json();
        const newPosts = data.posts || [];
        
        if (newPosts.length > 0) {
          setPosts(prevPosts => [...prevPosts, ...newPosts]);
          setCurrentPage(nextPage);
          setHasMorePosts(newPosts.length === 20);
        } else {
          setHasMorePosts(false);
        }
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Listen for post updates (votes/replies) and patch in place
  useEffect(() => {
    const onForumPostUpdated = (e: any) => {
      const updated = e.detail?.post;
      if (!updated) return;
      setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, votes: updated.votes, replies: updated.replies, userVote: updated.userVote } as any : p));
    };
    window.addEventListener('kd-forum-post-updated', onForumPostUpdated as any);
    return () => window.removeEventListener('kd-forum-post-updated', onForumPostUpdated as any);
  }, []);


  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      showToast('Please fill in both title and content', 'error');
      return;
    }

    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }

    // Prevent double-clicking
    if (isCreatingPost) {
      return;
    }

    setIsCreatingPost(true);

    try {
      // Convert game mentions to markdown format first
      const contentWithLinks = convertGameMentionsToMarkdown(newPost.content);

      // Moderate both title and content (use converted content for moderation)
      const moderationPromises = [
        fetch('/api/moderate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newPost.title })
        }),
        fetch('/api/moderate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: contentWithLinks })
        })
      ];
      
      const [titleResponse, contentResponse] = await Promise.all(moderationPromises);
      const titleModeration = await titleResponse.json();
      const contentModeration = await contentResponse.json();
      
      // Debug logging
      console.log('Title moderation result:', titleModeration);
      console.log('Content moderation result:', contentModeration);
      
      // Check if either title or content is inappropriate
      if (!titleModeration.isAppropriate || !contentModeration.isAppropriate) {
        console.log('Post rejected by moderation');
        const rejectedModeration = !titleModeration.isAppropriate ? titleModeration : contentModeration;
        setModerationAlert({
          result: rejectedModeration,
          type: 'rejected'
        });
        setIsCreatingPost(false);
        return;
      }

      console.log('Post passed moderation, creating post...');

      // Create new post via API
      const postData = {
        title: newPost.title,
        content: contentWithLinks,
        category: newPost.category,
        author: {
          id: user.id,
          name: user.username,
          avatar: user.avatar
        }
      };
      
      console.log('Sending post data:', JSON.stringify(postData, null, 2));
      
      const postResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      
      console.log('Post response status:', postResponse.status);
      console.log('Post response headers:', Object.fromEntries(postResponse.headers.entries()));

      if (postResponse.ok) {
        const result = await postResponse.json();
        console.log('Post creation success result:', result);
        
        // Add the new post to the beginning of the list
        setPosts(prevPosts => [result.post, ...prevPosts]);
        setNewPost({ title: '', content: '', category: 'general' });
        setShowCreatePost(false);
        
        showToast('Post created successfully!', 'success');
      } else {
        const errorData = await postResponse.json();
        console.log('Post creation error:', errorData);
        showToast(errorData.error || 'Failed to create post. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('Error creating post. Please try again.', 'error');
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleReport = (post: ForumPost) => {
    setReportingPost(post);
    setShowReport(true);
  };

  const handleDeletePost = (postId: string) => {
    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }
    setPostToDelete(postId);
    setShowDeleteConfirm(true);
  };

  const handleVote = async (postId: string, voteType: 'up' | 'down') => {
    if (!isAuthenticated || !user) {
      setShowLoginModal(true);
      return;
    }

    // Prevent multiple clicks
    if (votingPosts.has(postId)) return;
    setVotingPosts(prev => new Set(prev).add(postId));

    try {
      const response = await fetch('/api/posts/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          postId,
          voteType,
          userId: user.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update the post in the local state
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === postId ? result.post : post
          )
        );
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to vote', 'error');
      }
    } catch (error) {
      console.error('Error voting:', error);
      showToast('Error voting. Please try again.', 'error');
    } finally {
      setVotingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const confirmDeletePost = async () => {
    if (!isAuthenticated || !user || !postToDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorId: user.id
        })
      });

      if (response.ok) {
        // Remove the post from the local state
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postToDelete));
        showToast('Post deleted successfully', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete post', 'error');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('Error deleting post. Please try again.', 'error');
    } finally {
      setPostToDelete(null);
    }
  };

  // Update category post counts
  useEffect(() => {
    setCategories(prevCategories => 
      prevCategories.map(category => ({
        ...category,
        postCount: posts.filter(post => post.category === category.id).length
      }))
    );
  }, [posts]);

  // Filter posts by category and author
  let filteredPosts = posts;
  
  // Filter by category
  if (selectedCategory !== 'all') {
    filteredPosts = filteredPosts.filter(post => post.category === selectedCategory);
  }
  
  // Filter by author
  if (selectedAuthor) {
    filteredPosts = filteredPosts.filter(post => post.author.name === selectedAuthor);
  }
  
  // Sort by engagement
  filteredPosts = filteredPosts.sort((a, b) => {
    // Calculate total engagement with more weight on votes than replies
    const aEngagement = (a.votes.upvotes - a.votes.downvotes) * 3 + (a.replies * 1);
    const bEngagement = (b.votes.upvotes - b.votes.downvotes) * 3 + (b.replies * 1);
    return bEngagement - aEngagement; // Sort by highest engagement first
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return <LoadingScreen message={t('loadingForums')} subMessage={t('fetchingPosts')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('backToHome')}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <Image 
              src="/ForumsIcon.svg" 
              alt="Forums" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('communityForums')}</h1>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => setShowGuidelines(true)}
              className="btn-secondary text-sm sm:text-base"
            >
              <span className="hidden sm:inline">{t('communityGuidelines')}</span>
              <span className="sm:hidden">{t('guidelines')}</span>
            </button>
            <button
              onClick={() => {
                if (isAuthenticated) {
                  router.push('/forums/create-post');
                } else {
                  setShowLoginModal(true);
                }
              }}
              className="btn-primary flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newPost')}</span>
            </button>
          </div>
        </div>

        {/* Author Filter Indicator */}
        {selectedAuthor && (
          <div className="mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="text-blue-800 font-medium text-sm sm:text-base">
                  {t('showingPostsBy')} <span className="font-semibold">{selectedAuthor}</span>
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedAuthor('');
                  // Update URL to remove author parameter
                  const url = new URL(window.location.href);
                  url.searchParams.delete('author');
                  window.history.replaceState({}, '', url.toString());
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium self-start sm:self-auto"
              >
                {t('clearFilter')}
              </button>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`p-3 sm:p-4 rounded-lg border-2 transition-colors ${
              selectedCategory === 'all' 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="flex justify-center mb-1 sm:mb-2">
                <Image
                  src="/AllPostsIcon.svg"
                  alt="All Posts"
                  width={32}
                  height={32}
                  className="w-6 h-6 sm:w-8 sm:h-8"
                />
              </div>
              <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">{t('allPosts')}</h3>
              <p className="text-xs text-gray-600">{posts.length} {t('posts')}</p>
            </div>
          </button>
          
          {categories.map(category => {
            const getIconSrc = (categoryId: string) => {
              switch (categoryId) {
                case 'general':
                  return '/GeneralDiscussionIcon.svg';
                case 'strategy':
                  return '/Strategy&TipsIcon.svg';
                case 'reviews':
                  return '/Reviews&RecommendationsIcon.svg';
                default:
                  return '/DiceLogo.svg';
              }
            };

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-colors ${
                  selectedCategory === category.id 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="flex justify-center mb-1 sm:mb-2">
                    <Image
                      src={getIconSrc(category.id)}
                      alt={category.name}
                      width={32}
                      height={32}
                      className="w-6 h-6 sm:w-8 sm:h-8"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">{category.name}</h3>
                  <p className="text-xs text-gray-600">{category.postCount} {t('posts')}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="relative">
                {/* Avatar - positioned absolutely in top left */}
                <div 
                  className="absolute top-0 left-0 w-12 h-12 sm:w-12 sm:h-12 rounded-full border-2 border-black overflow-hidden"
                  style={{
                    backgroundImage: `url(${post.author.avatar || '/DiceLogo.svg'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                />

                {/* Title and badges - positioned to the right of avatar */}
                <div className="ml-16 sm:ml-16">
                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2 break-words">
                    <Link href={`/forums/post/${post.id}`} className="hover:text-primary-600">
                      {post.title}
                    </Link>
                  </h3>
                  
                  {/* Author and Category badges */}
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="font-medium text-[#fbae17] text-sm">{post.author.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      categories.find(c => c.id === post.category)?.color || 'bg-gray-100 text-gray-600'
                    }`}>
                      {categories.find(c => c.id === post.category)?.name || post.category}
                    </span>
                  </div>
                </div>
                
                {/* Post content - uses full width */}
                <div className="w-full">
                  {post.postType === 'poll' ? (
                    renderPollPreview(post)
                  ) : (
                    <div className="text-gray-600 mb-4 line-clamp-2 text-sm sm:text-base">
                      {renderContentWithGameLinks(post.content)}
                    </div>
                  )}

                  {/* Bottom row: Interactions and actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-500">
                      {/* Vote count display */}
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                        <span className="font-medium">{post.votes.upvotes - post.votes.downvotes}</span>
                      </div>
                      
                      {/* Replies */}
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{post.replies} {t('replies')}</span>
                      </div>
                      
                      {/* Date */}
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                      
                      {/* Delete button - only show to post author */}
                      {isAuthenticated && user && post.author.id === user.id && (
                        <ModernTooltip content={t('delete') + ' ' + t('post')} position="top">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </ModernTooltip>
                      )}
                    </div>
                    
                    {/* Report button - far right */}
                    <ModernTooltip content={!isAuthenticated ? tCommon('pleaseSignIn') + ' to ' + t('report').toLowerCase() : t('report') + ' ' + t('post')} position="top">
                      <button
                        onClick={() => {
                          if (isAuthenticated) {
                            handleReport(post);
                          } else {
                            setShowLoginModal(true);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Flag className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </ModernTooltip>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noPostsFound')}</h3>
            <p className="text-gray-600">{t('beFirstToDiscuss', {ns: 'forums'}) || 'Be the first to start a discussion in this category!'}</p>
          </div>
        )}

        {/* Loading indicator for infinite scroll */}
        {isLoadingMore && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* End of content indicator */}
        {!hasMorePosts && filteredPosts.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>{tCommon('reachedEnd')}</p>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">{t('createPost')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('category')}
                </label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-md text-sm sm:text-base"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-md text-sm sm:text-base"
                    placeholder={tf('enterPostTitle', 'Enter your post title...')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('content')}
                </label>
                <div className="relative">
                  <textarea
                    ref={contentTextareaRef}
                    value={newPost.content}
                    onChange={handleContentTyping}
                    onKeyDown={handleContentKeyPress}
                    rows={6}
                    className="w-full p-2 sm:p-3 border border-gray-300 rounded-md text-sm sm:text-base"
                    placeholder={tf('writePostContent', 'Write your post content... (use @ to mention games)')}
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
                          onKeyDown={(e) => handleContentKeyPress(e as any)}
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
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={() => setShowCreatePost(false)}
                className="btn-secondary w-full sm:w-auto"
                disabled={isCreatingPost}
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleCreatePost}
                className={`btn-primary w-full sm:w-auto ${isCreatingPost ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isCreatingPost}
              >
                {isCreatingPost ? t('submitting') : t('createPost')}
              </button>
            </div>
          </div>
        </div>
      )}

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
      {showReport && reportingPost && (
        <ReportContent
          contentType="forum_post"
          contentId={reportingPost.id}
          onReport={(report) => {
            console.log('Report submitted:', report);
            setShowReport(false);
            setReportingPost(null);
          }}
          onClose={() => {
            setShowReport(false);
            setReportingPost(null);
          }}
        />
      )}

      {/* Community Guidelines Modal */}
      {showGuidelines && (
        <CommunityGuidelines
          isOpen={showGuidelines}
          onClose={() => setShowGuidelines(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPostToDelete(null);
        }}
        onConfirm={confirmDeletePost}
        title={t('delete') + ' ' + t('post')}
        message={tf('deletePostConfirm', 'Are you sure you want to delete this post? This action cannot be undone.')}
        confirmText={t('delete')}
        cancelText="Cancel"
        type="danger"
      />


    </div>
  );
}

export default function ForumsPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading Forums" subMessage="Please wait..." />}>
      <ForumsPageContent />
    </Suspense>
  );
} 