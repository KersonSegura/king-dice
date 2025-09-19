'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Flag, Plus, User, Calendar, MessageCircle, Lock, Trash2, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
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
import BackButton from '@/components/BackButton';
import Footer from '@/components/Footer';

export default function ForumsPage() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
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
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general'
  });

  // Handle URL parameters for category and author selection
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const authorParam = searchParams.get('author');
    
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
        const response = await fetch('/api/posts');
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts);
        }
      } catch (error) {
        console.error('Error loading posts:', error);
      }
    };

    const categories: ForumCategory[] = [
      {
        id: 'general',
        name: 'General Discussion',
        description: 'Share your thoughts on board games',
        icon: '💬',
        color: 'bg-blue-100 text-blue-600',
        postCount: 0
      },
      {
        id: 'strategy',
        name: 'Strategy & Tips',
        description: 'Discuss winning strategies and tips',
        icon: '🎯',
        color: 'bg-[#fbae17]/10 text-[#fbae17]',
        postCount: 0
      },
      {
        id: 'reviews',
        name: 'Reviews & Recommendations',
        description: 'Share game reviews and recommendations',
        icon: '⭐',
        color: 'bg-purple-100 text-purple-600',
        postCount: 0
      }
    ];

    setCategories(categories);
    loadPosts();
    setLoading(false);
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
      // Moderate both title and content
      const moderationPromises = [
        fetch('/api/moderate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newPost.title })
        }),
        fetch('/api/moderate/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newPost.content })
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
        content: newPost.content,
        category: newPost.category,
        author: {
          id: user.id,
          name: user.username,
          avatar: user.avatar,
          reputation: user.reputation
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
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-8 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <BackButton />
            <Image 
              src="/ForumsIcon.svg" 
              alt="Forums" 
              width={32} 
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-3xl font-bold text-gray-900">Community Forums</h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowGuidelines(true)}
              className="btn-secondary"
            >
              Community Guidelines
            </button>
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setShowCreatePost(true);
                } else {
                  setShowLoginModal(true);
                }
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Post</span>
            </button>
          </div>
        </div>

        {/* Author Filter Indicator */}
        {selectedAuthor && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  Showing posts by: <span className="font-semibold">{selectedAuthor}</span>
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
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear Filter
              </button>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`p-4 rounded-lg border-2 transition-colors ${
              selectedCategory === 'all' 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Image
                  src="/AllPostsIcon.svg"
                  alt="All Posts"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
              </div>
              <h3 className="font-semibold text-gray-900">All Posts</h3>
              <p className="text-sm text-gray-600">{posts.length} posts</p>
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
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedCategory === category.id 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Image
                      src={getIconSrc(category.id)}
                      alt={category.name}
                      width={32}
                      height={32}
                      className="w-8 h-8"
                    />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{category.name}</h3>
                  <p className="text-xs text-gray-600">{category.postCount} posts</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start space-x-4">
                {/* Author info and likes */}
                <div className="flex flex-col items-center space-y-2">
                  <div 
                    className="w-12 h-12 rounded-full border-2 border-black overflow-hidden"
                    style={{
                      backgroundImage: `url(${post.author.avatar || '/DiceLogo.svg'})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                </div>

                {/* Post content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-[#fbae17]">{post.author.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        categories.find(c => c.id === post.category)?.color || 'bg-gray-100 text-gray-600'
                      }`}>
                        {categories.find(c => c.id === post.category)?.name || post.category}
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
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    <Link href={`/forums/post/${post.id}`} className="hover:text-primary-600">
                      {post.title}
                    </Link>
                  </h3>
                  
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {post.content}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVote(post.id, 'up');
                          }}
                          disabled={votingPosts.has(post.id)}
                          className={`p-1 rounded-full transition-colors ${
                            post.userVotes?.find(vote => vote.userId === user?.id)?.voteType === 'up'
                              ? 'bg-green-100 text-green-600' 
                              : 'hover:bg-gray-100 text-gray-400'
                          } ${votingPosts.has(post.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        <span className="font-medium">{post.votes.upvotes - post.votes.downvotes}</span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleVote(post.id, 'down');
                          }}
                          disabled={votingPosts.has(post.id)}
                          className={`p-1 rounded-full transition-colors ${
                            post.userVotes?.find(vote => vote.userId === user?.id)?.voteType === 'down'
                              ? 'bg-red-100 text-red-600' 
                              : 'hover:bg-gray-100 text-gray-400'
                          } ${votingPosts.has(post.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.replies} replies</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Delete button - only show to post author */}
                      {isAuthenticated && user && post.author.id === user.id && (
                        <ModernTooltip content="Delete post" position="top">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </ModernTooltip>
                      )}
                      
                      <ModernTooltip content={!isAuthenticated ? 'Sign in to report' : 'Report post'} position="top">
                        <button
                          onClick={() => {
                            if (isAuthenticated) {
                              handleReport(post);
                            } else {
                              setShowLoginModal(true);
                            }
                          }}
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
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
            <p className="text-gray-600">Be the first to start a discussion in this category!</p>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-xl font-semibold mb-4">Create New Post</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
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
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter your post title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  rows={6}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Write your post content..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreatePost(false)}
                className="btn-secondary"
                disabled={isCreatingPost}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                className={`btn-primary ${isCreatingPost ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isCreatingPost}
              >
                {isCreatingPost ? 'Creating...' : 'Create Post'}
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
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />


      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
} 