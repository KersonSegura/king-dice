'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Calendar, Award, Edit, Settings, ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, Save, Palette, GripVertical, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
// import { getUserPosts, getUserGalleryImages } from '@/lib/user-posts';
import ProfileColorCustomizer from '@/components/ProfileColorCustomizer';
import { useToast } from '@/components/Toast';
import ImageModal from '@/components/ImageModal';
import FriendsFollowersSection from '@/components/FriendsFollowersSection';
import { isUserAdmin } from '@/lib/admin-utils';
import TagSelector from '@/components/TagSelector';
import GameSearchModal from '@/components/GameSearchModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// Removed complex color contrast utilities - using predefined themes instead

// Sortable Game Item Component
interface SortableGameItemProps {
  game: { id: number; name: string; year: number; image: string };
  index: number;
  onRemove: (gameId: number) => void;
}

function SortableGameItem({ game, index, onRemove }: SortableGameItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({ id: game.id });

  const style = {
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-all duration-200 ${
        isDragging ? 'shadow-lg z-50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <span className="text-sm font-medium text-gray-600 min-w-0 flex-1">
          {index + 1}. {game.name} ({game.year})
        </span>
        <button
          onClick={() => onRemove(game.id)}
          className="text-red-500 hover:text-red-700 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    reputation: number;
  };
  category: string;
  createdAt: string;
  votes: {
    upvotes: number;
    downvotes: number;
  };
  replies: number;
}

interface GalleryImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  author: { id: string; name: string; avatar: string; reputation: number };
  category: string;
  createdAt: string;
  votes: { upvotes: number; downvotes: number };
  views: number;
  downloads: number;
  comments: number;
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || 'user@example.com',
    bio: '',
    favoriteGames: [] as string[]
  });
  const [errors, setErrors] = useState<{username?: string; email?: string}>({});
  const [userPosts, setUserPosts] = useState<ForumPost[]>([]);
  const [userImages, setUserImages] = useState<GalleryImage[]>([]);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState({
    currentLevel: 1,
    currentLevelName: 'Commoner',
    currentXP: 0,
    xpForNextLevel: 100,
    progressPercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [showColorCustomizer, setShowColorCustomizer] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string, 
    title: string, 
    description?: string,
    author?: { name: string; avatar: string },
    createdAt?: string,
    category?: string,
    isFeatured?: boolean,
    likeCount?: number,
    imageId?: string
  } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newImage, setNewImage] = useState({
    description: '',
    category: 'collections',
    tags: [] as string[],
    file: null as File | null
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [profileColors, setProfileColors] = useState({
    cover: '#fbae17',
    background: '#f5f5f5',
    containers: '#ffffff'
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [userStats, setUserStats] = useState({
    gamesOwned: 0,
    forumDiscussions: 0,
    galleryPosts: 0,
    friends: 0
  });
  const [userGames, setUserGames] = useState([]);
  const [collectionPhoto, setCollectionPhoto] = useState<string | null>(null);
  const [favoriteCard, setFavoriteCard] = useState<string | null>(null);
  const [gamesList, setGamesList] = useState<Array<{id: number, name: string, year: number, image: string}>>([]);
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [showGameSearchModal, setShowGameSearchModal] = useState(false);
  const [showCollectionPhotoModal, setShowCollectionPhotoModal] = useState(false);
  const [showDeleteCollectionPhotoConfirm, setShowDeleteCollectionPhotoConfirm] = useState(false);
  const [showFavoriteCardModal, setShowFavoriteCardModal] = useState(false);
  const [showDeleteFavoriteCardConfirm, setShowDeleteFavoriteCardConfirm] = useState(false);
  const [showAllGamesModal, setShowAllGamesModal] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: 'like' | 'comment' | 'upload' | 'game_added';
    title: string;
    description: string;
    timestamp: string;
    url?: string;
  }>>([]);
  const [imageComments, setImageComments] = useState<any[]>([]);
  const [imageLikes, setImageLikes] = useState<{[imageId: string]: boolean}>({});
  const [loadingComments, setLoadingComments] = useState(false);

  // Drag and drop sensors with better responsiveness
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = gamesList.findIndex((game) => game.id === active.id);
      const newIndex = gamesList.findIndex((game) => game.id === over?.id);

      const newGamesList = arrayMove(gamesList, oldIndex, newIndex);
      setGamesList(newGamesList);
      saveCollectionData(undefined, newGamesList);
      showToast('Game order updated!', 'success', 1500);
      // Recent activity will be updated automatically via useEffect
    }
    
    setActiveId(null);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months === 1 ? '' : 's'} ago`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years} year${years === 1 ? '' : 's'} ago`;
    }
  };

  // Load comments for an image
  const loadImageComments = async (imageId: string) => {
    if (!user?.id) return;
    
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/gallery/comments?imageId=${imageId}&userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setImageComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Handle image like/unlike
  const handleImageLike = async (imageId: string) => {
    if (!user?.id) return;

    try {
      const currentLikeStatus = imageLikes[imageId] || false;
      const newVoteType = currentLikeStatus ? null : 'up';
      
      const response = await fetch('/api/gallery/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId,
          voteType: newVoteType,
          userId: user.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update like status
        setImageLikes(prev => ({
          ...prev,
          [imageId]: !currentLikeStatus
        }));

        // Update the image in userImages with new vote count
        setUserImages(prev => prev.map(img => 
          img.id === imageId 
            ? { ...img, votes: { ...img.votes, upvotes: data.image.votes.upvotes } }
            : img
        ));

        // Update selectedImage if it's the same image
        if (selectedImage?.imageId === imageId) {
          setSelectedImage(prev => prev ? {
            ...prev,
            likeCount: data.image.votes.upvotes
          } : null);
        }

        showToast(
          currentLikeStatus ? 'Removed like' : 'Liked image!', 
          'success', 
          1500
        );
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to update like', 'error', 2000);
      }
    } catch (error) {
      console.error('Error updating like:', error);
      showToast('Failed to update like', 'error', 2000);
    }
  };

  // Handle adding a comment
  const handleAddComment = async (content: string) => {
    if (!user?.id || !selectedImage?.imageId) return;

    try {
      const response = await fetch('/api/gallery/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: selectedImage.imageId,
          content,
          author: {
            id: user.id,
            name: user.username,
            avatar: user.avatar,
            title: user.title
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add comment to local state
        setImageComments(prev => [...prev, data.comment]);
        
        // Update comment count in userImages
        setUserImages(prev => prev.map(img => 
          img.id === selectedImage.imageId 
            ? { ...img, comments: data.totalComments }
            : img
        ));

        showToast('Comment added!', 'success', 1500);
        // Refresh recent activity
        loadRecentActivity();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to add comment', 'error', 2000);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('Failed to add comment', 'error', 2000);
    }
  };

  // Handle comment like
  const handleCommentLike = async (commentId: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/gallery/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userId: user.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update comment in local state
        setImageComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, likes: data.likes, userLiked: data.userLiked }
            : comment
        ));

        showToast('Comment liked!', 'success', 1500);
        // Refresh recent activity
        loadRecentActivity();
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  // Handle comment delete
  const handleCommentDelete = async (commentId: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/gallery/comments/${commentId}?userId=${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        
        // Remove comment from local state
        setImageComments(prev => prev.filter(comment => comment.id !== commentId));
        
        // Update comment count in userImages
        setUserImages(prev => prev.map(img => 
          img.id === selectedImage?.imageId 
            ? { ...img, comments: data.totalComments }
            : img
        ));

        showToast('Comment deleted!', 'success', 1500);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete comment', 'error', 2000);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Failed to delete comment', 'error', 2000);
    }
  };

  // Handle comment report
  const handleCommentReport = async (commentId: string, reason: string, details?: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/gallery/comments/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          reason,
          details,
          reporterId: user.id
        })
      });

      if (response.ok) {
        showToast('Comment reported successfully!', 'success', 2000);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to report comment', 'error', 2000);
      }
    } catch (error) {
      console.error('Error reporting comment:', error);
      showToast('Failed to report comment', 'error', 2000);
    }
  };

  // Handle image report
  const handleImageReport = async (reason: string, details?: string) => {
    if (!user?.id || !selectedImage?.imageId) return;

    try {
      const response = await fetch('/api/gallery/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: selectedImage.imageId,
          reason,
          details,
          reporterId: user.id
        })
      });

      if (response.ok) {
        showToast('Image reported successfully!', 'success', 2000);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to report image', 'error', 2000);
      }
    } catch (error) {
      console.error('Error reporting image:', error);
      showToast('Failed to report image', 'error', 2000);
    }
  };

  // Load recent activity
  const loadRecentActivity = async () => {
    if (!user?.id) return;

    console.log('loadRecentActivity called for user:', user.id);

    try {
      const activities = [];

      // Get recent forum posts (for likes and comments)
      const postsResponse = await fetch(`/api/posts?author=${user.id}`);
      console.log('Posts API response:', postsResponse.status);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        console.log('Posts data:', postsData);
        
        const posts = postsData.posts || [];
        // Add recent posts as uploads
        const recentPosts = posts
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
          .map((post: any) => ({
            id: `post-${post.id}`,
            type: 'forum_post' as const,
            title: 'Created a forum post',
            description: post.title,
            timestamp: post.createdAt,
            url: `/forums/post/${post.id}`,
            icon: '💬',
            color: 'bg-blue-100 text-blue-600'
          }));
        
        console.log('Recent posts:', recentPosts);
        activities.push(...recentPosts);
      }

      // Get recent gallery uploads
      const galleryResponse = await fetch(`/api/gallery?author=${user.id}`);
      console.log('Gallery API response:', galleryResponse.status);
      if (galleryResponse.ok) {
        const galleryData = await galleryResponse.json();
        console.log('Gallery data:', galleryData);
        
        const images = galleryData.images || [];
        const recentGallery = images
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 2)
          .map((image: any) => ({
            id: `gallery-${image.id}`,
            type: 'gallery_upload' as const,
            title: 'Uploaded to gallery',
            description: image.title || 'Untitled image',
            timestamp: image.createdAt,
            url: `/community-gallery`,
            icon: '🖼️',
            color: 'bg-purple-100 text-purple-600'
          }));
        
        console.log('Recent gallery:', recentGallery);
        activities.push(...recentGallery);
      }

      // Get recent game additions (from gamesList) - only show if we have recent additions
      console.log('Games list in loadRecentActivity:', gamesList);
      if (gamesList.length > 0) {
        // Show the most recently added games (last 2 in the array)
        // Since games are added to the end of the array, we take the last 2
        const recentGames = gamesList
          .slice(-2) // Take the last 2 games (most recently added)
          .reverse() // Reverse to show most recent first
          .map((game, index) => ({
            id: `game-${game.id}`,
            type: 'game_collection' as const,
            title: 'Added game to collection',
            description: game.name,
            timestamp: new Date(Date.now() - (index * 2 * 60 * 1000)).toISOString(), // Very recent timestamps (2 minutes apart)
            url: `/juego/${game.id}`,
            icon: '🎲',
            color: 'bg-green-100 text-green-600'
          }));
        
        console.log('Recent games (last 2 added):', recentGames);
        activities.push(...recentGames);
      } else {
        console.log('No games in collection, skipping game activities');
      }

      // Sort by timestamp and take the most recent 5
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      console.log('Recent Activity Debug:', {
        totalActivities: activities.length,
        sortedActivities: sortedActivities,
        userPosts: userPosts.length,
        userImages: userImages.length,
        gamesList: gamesList.length,
        allActivities: activities
      });

      setRecentActivity(sortedActivities);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  // Predefined game categories
  const gameCategories = [
    'Strategy Games',
    'Euro Games',
    'Cooperative Games',
    'Card Games',
    'Party Games',
    'Family Games',
    'Abstract Games',
    'Dice Games',
    'Miniature Games',
    'Role-Playing Games',
    'Legacy Games',
    'Deck Building',
    'Worker Placement',
    'Area Control',
    'Engine Building',
    'Social Deduction',
    'Trading Games',
    'Auction Games',
    'Tile Placement',
    'Drafting Games'
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadUserColors();
      loadUserGames();
      loadUserImages();
      loadUserForumPosts();
      loadCollectionData();
      loadCategories();
      loadLevelProgress();
      // Initialize form data with user data
      setFormData({
        username: user.username || '',
        email: user.email || 'user@example.com',
        bio: '',
        favoriteGames: []
      });
      
      // Check if user should be admin based on config
      const adminStatus = isUserAdmin(user.id, user.username, user.email);
      setIsAdmin(adminStatus);
    }
  }, [user]);

  // Update stats when data changes
  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [gamesList, userPosts, userImages, user]);

  // Load recent activity when user data is available
  useEffect(() => {
    if (user?.id) {
      loadRecentActivity();
    }
  }, [user?.id, userPosts, userImages]);

  // Load recent activity when games list changes
  useEffect(() => {
    if (user?.id) {
      console.log('Games list changed, reloading recent activity. Current games:', gamesList.length);
      loadRecentActivity();
    }
  }, [gamesList]);

  const loadUserData = async () => {
      if (!user) return;
      
      try {
      setLoading(true);
      
      // Load user profile data including bio and favorite games
      const response = await fetch(`/api/users/profile-data?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setFormData(prev => ({
            ...prev,
            bio: data.profile.bio || '',
            favoriteGames: data.profile.favoriteGames || []
          }));
          
          // Set admin status
          setIsAdmin(data.profile.isAdmin || false);
        }
      }
      
      // For now, set empty arrays since we don't have the full data structure
      // This will be updated when we implement the full social features
      setUserPosts([]);
      
      // Calculate XP and level (simplified for now)
      const totalPosts = 0; // Will be updated when we have real data
      setUserXP(totalPosts * 10);
      setUserLevel(Math.floor(totalPosts / 5) + 1);
      } catch (error) {
      console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

  const loadLevelProgress = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/users/level-progress?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setLevelProgress(data);
        setUserXP(data.currentXP);
        setUserLevel(data.currentLevel);
      }
    } catch (error) {
      console.error('Error loading level progress:', error);
      }
    };

  const loadUserColors = async () => {
    if (!user) return;
    
    try {
      console.log('Loading colors for user:', user);
      console.log('User ID:', user.id);
      console.log('User type:', typeof user.id);
      const response = await fetch(`/api/users/profile-colors?userId=${user.id}`);
      console.log('Color fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Color fetch response data:', data);
        if (data.colors) {
          console.log('Setting profile colors:', data.colors);
          setProfileColors(data.colors);
        }
      } else {
        // If user doesn't exist in database yet, use default colors
        console.log('User not found in database, using default colors');
      }
    } catch (error) {
      console.error('Error loading user colors:', error);
      // Use default colors on error
    }
  };

  const loadUserStats = async () => {
    if (!user) return;
    
    // Calculate stats based on real data
    const realStats = {
      gamesOwned: gamesList.length,
      forumDiscussions: userPosts.length,
      galleryPosts: userImages.length,
      friends: 0 // Keep friends at 0 for now since we don't have a friends system yet
    };
    
    console.log('Calculating stats:', {
      gamesListLength: gamesList.length,
      userPostsLength: userPosts.length,
      userImagesLength: userImages.length,
      calculatedStats: realStats
    });
    
    setUserStats(realStats);
  };

  const loadUserGames = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/games?userId=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.games) {
          setUserGames(data.games);
        }
      }
    } catch (error) {
      console.error('Error loading user games:', error);
    }
  };

  const loadUserImages = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/gallery?author=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.images) {
          setUserImages(data.images);
          // Stats will be updated automatically via useEffect when userImages changes
        }
      }
    } catch (error) {
      console.error('Error loading user images:', error);
    }
  };

  const loadUserForumPosts = async () => {
    if (!user) return;
    
    try {
      console.log('Loading forum posts for user ID:', user.id);
      const response = await fetch(`/api/posts?author=${user.id}`);
      console.log('Forum posts API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Forum posts API response data:', data);
        if (data.posts) {
          console.log('Setting user posts:', data.posts.length, 'posts found');
          setUserPosts(data.posts);
          // Stats will be updated automatically via useEffect when userPosts changes
        }
      } else {
        console.error('Forum posts API failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error loading user forum posts:', error);
    }
  };

  const loadCollectionData = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/collection?userId=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setCollectionPhoto(data.collectionPhoto);
        setFavoriteCard(data.favoriteCard);
        setGamesList(data.gamesList || []);
        // Stats will be updated automatically via useEffect when gamesList changes
      } else {
        const errorData = await response.json();
        console.error('Error loading collection data:', errorData);
      }
    } catch (error) {
      console.error('Error loading collection data:', error);
    }
  };

  const saveCollectionData = async (photo?: string | null, games?: Array<{id: number, name: string, year: number, image: string}>, card?: string | null) => {
    if (!user) return;
    
    try {
      const updateData: any = {};
      if (photo !== undefined) updateData.collectionPhoto = photo;
      if (card !== undefined) updateData.favoriteCard = card;
      if (games !== undefined) updateData.gamesList = games;
      
      const response = await fetch('/api/users/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...updateData
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (photo !== undefined) setCollectionPhoto(data.collectionPhoto);
        if (card !== undefined) setFavoriteCard(data.favoriteCard);
        if (games !== undefined) setGamesList(data.gamesList);
      } else {
        const errorData = await response.json();
        console.error('Error saving collection data:', errorData);
      }
    } catch (error) {
      console.error('Error saving collection data:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/gallery');
      if (response.ok) {
        const data = await response.json();
        if (data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleUploadImage = async () => {
    if (!newImage.file) {
      showToast('Please select an image', 'error');
      return;
    }

    if (!isAuthenticated || !user) {
      showToast('Please sign in to upload images', 'error');
      return;
    }

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', newImage.file);
      formData.append('title', ''); // Empty title
      formData.append('description', newImage.description);
      formData.append('category', newImage.category);
      formData.append('tags', newImage.tags.join(','));
      formData.append('author', JSON.stringify({
        id: user.id,
        name: user.username,
        avatar: user.avatar || '/DiceLogo.svg',
        reputation: user.reputation || 0,
        title: user.title
      }));

      // Upload to our API
      const response = await fetch('/api/gallery/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Add the new image to the list
        setUserImages(prevImages => [result.image, ...prevImages]);
        
        // Reset form
        setNewImage({ description: '', category: 'collections', tags: [], file: null });
        setShowUploadModal(false);
        
        showToast('Image uploaded successfully!', 'success');
        // Stats will be updated automatically via useEffect
        // Refresh recent activity
        loadRecentActivity();
      } else {
        const errorData = await response.json();
        console.error('Failed to upload image:', errorData);
        showToast(`Failed to upload image: ${errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Error uploading image. Please try again.', 'error');
    }
  };

  const handleAddGame = (game: {id: number, name: string, year: number, image: string}) => {
    console.log('handleAddGame called with:', game);
    if (!gamesList.some(g => g.id === game.id)) {
      const newGamesList = [...gamesList, game];
      console.log('New games list:', newGamesList);
      setGamesList(newGamesList);
      saveCollectionData(undefined, newGamesList);
      setShowGameSearchModal(false);
      showToast('Game added to collection!', 'success', 2000);
      
      // Force immediate recent activity update with the new games list
      setTimeout(() => {
        console.log('Force updating recent activity after game addition');
        loadRecentActivity();
      }, 100);
    } else {
      showToast('This game is already in your collection!', 'error', 2000);
    }
  };

  const handleRemoveGame = (gameId: number) => {
    const newGamesList = gamesList.filter(game => game.id !== gameId);
    setGamesList(newGamesList);
    saveCollectionData(undefined, newGamesList);
    showToast('Game removed from collection!', 'success', 2000);
    // Stats and recent activity will be updated automatically via useEffect
  };


  const handleCollectionPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoData = e.target?.result as string;
        setCollectionPhoto(photoData);
        saveCollectionData(photoData);
        showToast('Collection photo updated!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCollectionPhotoClick = () => {
    if (collectionPhoto) {
      setShowCollectionPhotoModal(true);
    }
  };

  const handleFavoriteCardClick = () => {
    if (favoriteCard) {
      setShowFavoriteCardModal(true);
    }
  };

  const handleDeleteCollectionPhoto = () => {
    setCollectionPhoto(null);
    saveCollectionData(null);
    setShowDeleteCollectionPhotoConfirm(false);
    showToast('Collection photo deleted!', 'success');
  };

  const handleFavoriteCardUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const cardData = e.target?.result as string;
        setFavoriteCard(cardData);
        saveCollectionData(undefined, undefined, cardData);
        showToast('Favorite card updated!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteFavoriteCard = () => {
    setFavoriteCard(null);
    saveCollectionData(undefined, undefined, null);
    setShowDeleteFavoriteCardConfirm(false);
    showToast('Favorite card deleted!', 'success');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fbae17] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your profile</h1>
          <Link href="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLevelName = (level: number) => {
    const levelNames = {
      1: 'Commoner',
      2: 'Squire', 
      3: 'Knight',
      4: 'Champion',
      5: 'Baron/Baroness',
      6: 'Lord/Lady',
      7: 'Archmage',
      8: 'Duke/Duchess',
      9: 'Lord/Lady',
      10: 'King/Queen'
    };
    return levelNames[level as keyof typeof levelNames] || 'Commoner';
  };

  const getLevelColor = (level: number) => {
    if (level >= 10) return { color: 'text-purple-600', bgColor: 'bg-purple-100' };
    if (level >= 8) return { color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (level >= 6) return { color: 'text-green-600', bgColor: 'bg-green-100' };
    if (level >= 4) return { color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  const levelInfo = getLevelColor(userLevel);

  // Validation functions
  const validateUsername = (username: string): string | null => {
    if (!username || username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    
    // Check for KingDice variations (only admins can use them)
    if (!user?.isAdmin) {
      const kingDicePatterns = [
        /kingdice/i,
        /king\.dice/i,
        /king_dice/i,
        /king-dice/i,
        /king dice/i
      ];
      
      if (kingDicePatterns.some(pattern => pattern.test(username))) {
        return 'Usernames containing "KingDice" variations are restricted to admin users only';
      }
    }
    
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email) {
      return 'Email is required';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    
    return null;
  };

  // Handler functions
  const handleInputChange = (field: 'username' | 'email', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    // Validate inputs
    const usernameError = validateUsername(formData.username);
    const emailError = validateEmail(formData.email);
    
    if (usernameError || emailError) {
      setErrors({
        username: usernameError || undefined,
        email: emailError || undefined
      });
      return;
    }

    try {
      console.log('Saving profile data:', {
        userId: user?.id,
        username: formData.username,
        email: formData.email,
        bio: formData.bio,
        favoriteGames: formData.favoriteGames
      });
      
      // Validate email before sending
      if (!formData.email || formData.email.length < 5) {
        showToast('Please enter a valid email address', 'error');
        return;
      }

      // Call API to update user profile
      const response = await fetch('/api/users/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          username: formData.username,
          email: formData.email,
          bio: formData.bio,
          favoriteGames: formData.favoriteGames
        }),
      });

      console.log('Save response status:', response.status);

      if (response.ok) {
        const updatedUser = await response.json();
        console.log('Save successful:', updatedUser);
        setIsEditing(false);
        showToast('Profile updated successfully! ✨', 'success');
      } else {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        console.error('Response status:', response.status);
        console.error('Response headers:', response.headers);
        setErrors({
          username: errorData.message?.includes('username') ? errorData.message : undefined,
          email: errorData.message?.includes('email') ? errorData.message : undefined
        });
        showToast(`Failed to update profile: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile. Please try again.', 'error');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      bio: '',
      favoriteGames: []
    });
    setErrors({});
    setIsEditing(false);
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => {
      const isSelected = prev.favoriteGames.includes(category);
      
      if (isSelected) {
        // Remove category if already selected
        return {
          ...prev,
          favoriteGames: prev.favoriteGames.filter(cat => cat !== category)
        };
      } else {
        // Add category if not already selected
        if (prev.favoriteGames.length >= 3) {
          // Show popup if trying to select more than 3
          showToast('You can only select up to 3 favorite game categories!', 'error');
          return prev; // Don't update the state
        }
        
        return {
          ...prev,
          favoriteGames: [...prev.favoriteGames, category]
        };
      }
    });
  };

  const handleColorSave = async (colors: typeof profileColors) => {
    try {
      console.log('Saving colors for user:', user?.id, 'Colors:', colors);
      // Save colors to user profile
      const response = await fetch('/api/users/update-profile-colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          colors: colors
        }),
      });

      console.log('Save response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Colors saved successfully:', responseData);
        setProfileColors(colors);
        showToast('Profile colors saved successfully! 🎨', 'success');
      } else {
        const errorData = await response.json();
        console.error('Failed to save colors:', errorData);
        showToast('Failed to save colors. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error saving colors:', error);
      showToast('Error saving colors. Please try again.', 'error');
    }
  };

  const handleMakeAdmin = async () => {
    try {
      const response = await fetch('/api/users/make-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          username: user?.username,
          email: user?.email
        }),
      });

      if (response.ok) {
        setIsAdmin(true);
        showToast('Admin status granted! 👑', 'success');
      } else {
        const errorData = await response.json();
        showToast(`Failed to grant admin: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error granting admin:', error);
      showToast('Error granting admin status.', 'error');
    }
  };

  // Get user's dice avatar from My Dice page
  const getUserDiceAvatar = () => {
    // This will be integrated with the My Dice system
    // For now, return the default avatar
    return user?.avatar || '/DiceLogo.svg';
  };

  // Simple text color detection based on cover color brightness
  const isLightCover = () => {
    const color = profileColors.cover;
    
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    
    // If luminance is greater than 0.5, it's a light color
    return luminance > 0.5;
  };

  // Text color classes based on theme
  const getTextColorClass = (isCover = false) => {
    if (isCover) {
      const isLight = isLightCover();
      const colorClass = isLight ? 'text-gray-900' : 'text-white';
      return colorClass;
    }
    // For non-cover areas, use dark text on light backgrounds
    return 'text-gray-900';
  };

  const getSecondaryTextColorClass = (isCover = false) => {
    if (isCover) {
      const isLight = isLightCover();
      const colorClass = isLight ? 'text-gray-700' : 'text-white/90';
      return colorClass;
    }
    // For non-cover areas, use secondary dark text
    return 'text-gray-600';
  };

  const coverTextClass = getTextColorClass(true);
  const coverSecondaryTextClass = getSecondaryTextColorClass(true);

  return (
    <div className="min-h-screen" style={{ backgroundColor: profileColors.background }}>
        {/* Back button */}
      <div className="border-b border-gray-200 px-4 py-3" style={{ backgroundColor: profileColors.containers }}>
        <div className="max-w-6xl mx-auto">
          <Link 
            href="/" 
            className={`inline-flex items-center transition-colors ${getSecondaryTextColorClass()} hover:${getTextColorClass()}`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
        </div>

      {/* Cover Photo Section */}
      <div 
        className="relative h-64"
                style={{
          backgroundColor: profileColors.cover
        }}
      >
        <div className="relative max-w-6xl mx-auto px-4 py-6 h-full flex items-end">
          <div className="flex items-end space-x-6 w-full">
            {/* Profile Picture */}
            <div className="relative">
              <div 
                className="w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                style={{
                  backgroundImage: `url(${getUserDiceAvatar()})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
                onClick={() => setShowImageModal(true)}
                title="Click to view full size"
              />
            </div>

            {/* User Info */}
            <div className={`flex-1 ${coverTextClass}`}>
                  <div className="flex items-center space-x-3 mb-2">
                <h1 className={`text-3xl font-bold ${coverTextClass}`}>{user.username}</h1>
                {isAdmin && (
                  <div className="flex items-center space-x-1 bg-purple-600 px-3 py-1 rounded-full">
                    <span className="text-white text-sm font-semibold">👑</span>
                    <span className="text-white text-sm font-semibold">Admin</span>
                  </div>
                    )}
                  </div>
              <p className={`text-lg ${coverSecondaryTextClass} mb-3`}>Level {levelProgress.currentLevel} {levelProgress.currentLevelName}</p>
              
              {/* XP Progress Bar */}
              <div className="w-full max-w-md">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className={`${coverSecondaryTextClass} font-medium`}>
                    {levelProgress.currentXP} XP
                  </span>
                  <span className={`${coverSecondaryTextClass} font-medium`}>
                    {levelProgress.xpForNextLevel > 0 ? `${levelProgress.xpForNextLevel} to next level` : 'Max Level'}
                  </span>
                </div>
                <div className="w-full bg-black bg-opacity-20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${levelProgress.progressPercentage}%`,
                      boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
                    }}
                  />
                </div>
              </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors backdrop-blur-sm ${
                  isLightCover() 
                    ? 'bg-gray-900/20 hover:bg-gray-900/30' 
                    : 'bg-white/20 hover:bg-white/30'
                } ${coverTextClass}`}
              >
                <Edit className="w-4 h-4" />
                <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
              </button>
              {isEditing && (
                    <button
                  onClick={() => setShowColorCustomizer(true)}
                  className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors backdrop-blur-sm ${
                    isLightCover() 
                      ? 'bg-gray-900/20 hover:bg-gray-900/30' 
                      : 'bg-white/20 hover:bg-white/30'
                  } ${coverTextClass}`}
                >
                  <Palette className="w-4 h-4" />
                  <span>Colors</span>
                </button>
              )}
              <Link href="/settings" className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors font-semibold ${
                isLightCover() 
                  ? 'bg-white hover:bg-gray-100' 
                  : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
              } ${coverTextClass}`}>
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </div>
            </div>
          </div>
                  </div>
                  
        {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio Section */}
            <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">About</h2>
              {!isEditing ? (
                <div className="space-y-4">
                  <p className="leading-relaxed text-gray-700">
                    {formData.bio || "No bio written yet. Click 'Edit Profile' to add your bio and favorite game categories!"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.favoriteGames.length > 0 ? (
                      formData.favoriteGames.map((category, index) => (
                        <span key={index} className="px-3 py-1 bg-[#fbae17]/10 text-[#fbae17] rounded-full text-sm font-medium">
                          {category}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm italic text-gray-500">No favorite categories selected yet</p>
                    )}
                  </div>
               </div>
              ) : (
               <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbae17]"
                      rows={4}
                      placeholder="Tell us about yourself and your board game interests..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Favorite Game Categories</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                      {gameCategories.map((category) => {
                        const isSelected = formData.favoriteGames.includes(category);
                        const isDisabled = !isSelected && formData.favoriteGames.length >= 3;
                        
                        return (
                          <label 
                            key={category} 
                            className={`flex items-center space-x-2 p-2 rounded transition-colors ${
                              isDisabled 
                                ? 'cursor-not-allowed opacity-50' 
                                : 'cursor-pointer hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCategory(category)}
                              disabled={isDisabled}
                              className="w-4 h-4 text-[#fbae17] border-gray-300 rounded focus:ring-[#fbae17] disabled:cursor-not-allowed"
                            />
                            <span className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                              {category}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                    <p className="text-xs mt-1 text-gray-500">
                      Select your favorite game categories ({formData.favoriteGames.length}/3 selected)
                    </p>
                 </div>
                 <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleSave}
                     className="flex items-center space-x-2 px-6 py-2 bg-[#fbae17] hover:bg-[#fbae17]/90 text-white rounded-lg transition-colors font-medium"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </button>
                    <button
                      onClick={handleCancel}
                     className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                     Cancel
                    </button>
                  </div>
                </div>
              )}
             </div>

            {/* Game Collection Section */}
            <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">My Collection</h2>
                <button 
                  onClick={() => setShowGameSearchModal(true)}
                  className="text-[#fbae17] hover:text-[#fbae17]/80 font-medium"
                >
                  Add Games
                </button>
              </div>
              
              {/* Top Row: Games List and Favorite Card */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Games List */}
                <div className="space-y-4 flex flex-col h-full">
                  <h3 className="text-lg font-medium text-gray-900">Games List - Top 10</h3>
                  <div className="space-y-2 flex-1">
                    {gamesList.length > 0 ? (
                      gamesList.slice(0, 10).map((game, index) => (
                        <div 
                          key={game.id} 
                          className={`flex items-center justify-between p-3 rounded-lg group relative ${
                            index === 0 
                              ? 'bg-gradient-to-r from-[#fbae17]/10 to-[#fbae17]/5 border-2 border-[#fbae17]' 
                              : 'bg-gray-50'
                          }`}
                        >
                          {index === 0 && (
                            <div className="absolute -top-3 -right-2 bg-[#fbae17] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                              <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                              Favorite
                            </div>
                          )}
                          <div className="flex items-center space-x-3">
                            <span className={`text-sm font-medium w-6 ${
                              index === 0 ? 'text-[#fbae17] font-bold' : 'text-gray-500'
                            }`}>
                              {index + 1}.
                            </span>
                            <Link 
                              href={`/juego/${game.id}`}
                              className={`text-sm font-medium hover:text-[#fbae17] transition-colors ${
                                index === 0 ? 'text-gray-900 font-semibold' : 'text-gray-900'
                              }`}
                            >
                              {game.name}
                            </Link>
                            <span className={`text-xs ${
                              index === 0 ? 'text-gray-600' : 'text-gray-500'
                            }`}>
                              ({game.year})
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveGame(game.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        <p className="text-sm">No games added yet</p>
                        <p className="text-xs">Click "Add Games" to start building your collection</p>
                      </div>
                    )}
                  </div>
                  
                  {gamesList.length > 10 && (
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setShowAllGamesModal(true)}
                        className="text-[#fbae17] hover:text-[#fbae17]/80 font-medium text-sm"
                      >
                        Show All Games ({gamesList.length})
                      </button>
                    </div>
                  )}
                </div>

                {/* Favorite Card Section */}
                <div className="space-y-4 flex flex-col h-full">
                  <h3 className="text-lg font-medium text-gray-900">My Favorite Card</h3>
                  <div className="relative flex-1">
                    <div className="h-full bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#fbae17] transition-colors cursor-pointer group relative overflow-hidden">
                      {favoriteCard ? (
                        <>
                          <img
                            src={favoriteCard}
                            alt="Favorite card"
                            className="w-full h-full object-contain rounded-lg group-hover:opacity-90 transition-opacity cursor-pointer"
                            onClick={handleFavoriteCardClick}
                          />
                          {/* Hover overlay with delete option */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteFavoriteCardConfirm(true);
                                }}
                                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                              >
                                Delete
                              </button>
                              <button
                                onClick={handleFavoriteCardClick}
                                className="px-3 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/80 transition-colors text-sm font-medium"
                              >
                                View Full Size
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFavoriteCardUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            id="favorite-card-upload"
                          />
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-[#fbae17] transition-colors">
                            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <span className="text-sm font-medium">Upload Favorite Card</span>
                            <span className="text-xs">Click to add your favorite card</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Collection Photo */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Collection Photo</h3>
                  <div className="relative">
                    <div className="aspect-[4/3] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#fbae17] transition-colors cursor-pointer group relative overflow-hidden">
                      {collectionPhoto ? (
                        <>
                          <img
                            src={collectionPhoto}
                            alt="Collection photo"
                            className="w-full h-full object-contain rounded-lg group-hover:opacity-90 transition-opacity cursor-pointer"
                            onClick={handleCollectionPhotoClick}
                          />
                          {/* Hover overlay with delete option */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteCollectionPhotoConfirm(true);
                                }}
                                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                              >
                                Delete
                              </button>
                              <button
                                onClick={handleCollectionPhotoClick}
                                className="px-3 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/80 transition-colors text-sm font-medium"
                              >
                                View Full Size
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCollectionPhotoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            id="collection-photo-upload"
                          />
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-[#fbae17] transition-colors">
                            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <span className="text-sm font-medium">Upload Collection Photo</span>
                            <span className="text-xs">Click to add a photo of your game collection</span>
                          </div>
                        </>
                      )}
                    </div>
                </div>
              </div>
            </div>

            {/* Photo Gallery Section */}
            <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="text-[#fbae17] hover:text-[#fbae17]/80 font-medium"
                >
                  Add Photo
                </button>
                        </div>
              <div className="grid grid-cols-3 gap-2">
                {userImages.length > 0 ? (
                  userImages.slice(0, 6).map((image: GalleryImage) => (
                    <div 
                      key={image.id} 
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer relative"
                      onClick={async () => {
                        setSelectedImage({
                          url: image.imageUrl,
                          title: image.title,
                          description: image.description,
                          author: image.author,
                          createdAt: image.createdAt,
                          category: image.category,
                          isFeatured: image.category === 'dice-of-the-week' || image.category === 'card-of-the-week',
                          likeCount: image.votes.upvotes,
                          imageId: image.id
                        });
                        
                        // Load comments and check like status
                        await loadImageComments(image.id);
                        
                        // Check if user has liked this image
                        if (user?.id) {
                          // This would need to be implemented in the API to check user's vote status
                          // For now, we'll assume false and let the like button handle the state
                          setImageLikes(prev => ({
                            ...prev,
                            [image.id]: false // Will be updated when user clicks like
                          }));
                        }
                        
                        setShowImageModal(true);
                      }}
                    >
                      <img 
                        src={image.thumbnailUrl || image.imageUrl} 
                        alt={image.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      
                      {/* Engagement overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-end">
                        <div className="w-full p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                <span>{image.votes.upvotes}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                                </svg>
                                <span>{image.comments}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                              </svg>
                              <span>{image.views}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer">
                      <div className="w-full h-full flex items-center justify-center text-gray-400 group-hover:bg-gray-200 transition-colors">
                        <div className="text-center">
                          <div className="w-8 h-8 bg-gray-300 rounded mb-2 mx-auto"></div>
                          <div className="text-xs">Photo {i}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              {userImages.length > 6 && (
                <div className="mt-4 text-center">
                  <button 
                    onClick={() => router.push(`/community-gallery?author=${encodeURIComponent(user?.username || '')}`)}
                    className="text-[#fbae17] hover:text-[#fbae17]/80 font-medium"
                  >
                    View All {userImages.length} Photos
                  </button>
                </div>
              )}
          </div>
        </div>

          {/* Sidebar */}
          <div className="space-y-6">
                 
            {/* Friends & Followers Section */}
            <FriendsFollowersSection
              userId={user.id}
              currentUserId={user.id}
              isOwnProfile={true}
              profileColors={profileColors}
            />


                           {/* Recent Activity */}
            <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => {
                    const getActivityIcon = (activity: any) => {
                      // Use the icon and color from the activity data if available
                      if (activity.icon && activity.color) {
                        return (
                          <div className={`w-8 h-8 ${activity.color.split(' ')[0]} rounded-full flex items-center justify-center`}>
                            <span className="text-lg">{activity.icon}</span>
                          </div>
                        );
                      }
                      
                      // Fallback to old system for backward compatibility
                      switch (activity.type) {
                        case 'like':
                          return (
                  <div className="w-8 h-8 bg-[#fbae17]/20 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#fbae17]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                      </div>
                          );
                        case 'comment':
                          return (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                          </svg>
                        </div>
                          );
                        case 'upload':
                        case 'gallery_upload':
                          return (
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                              </svg>
                          </div>
                          );
                        case 'game_added':
                        case 'game_collection':
                          return (
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                          </div>
                          );
                        case 'forum_post':
                          return (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                              </svg>
                            </div>
                          );
                        default:
                          return (
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                            </div>
                          );
                      }
                    };

                    return (
                      <div key={activity.id} className="flex items-start space-x-3">
                        {getActivityIcon(activity)}
                  <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs">Start posting, commenting, or adding games to see your activity here!</p>
                  </div>
                )}
                    </div>
                  </div>
                </div>
              </div>
          </div>

      {/* Color Customizer Modal */}
      <ProfileColorCustomizer
        isOpen={showColorCustomizer}
        onClose={() => setShowColorCustomizer(false)}
        currentColors={profileColors}
        onSave={handleColorSave}
      />

      {/* Toast Notifications */}
      <ToastContainer />


      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4" style={{ backgroundColor: profileColors.containers }}>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Upload Image</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newImage.category}
                  onChange={(e) => setNewImage({...newImage, category: e.target.value})}
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
                  Description ({newImage.description.length}/500)
                </label>
                <textarea
                  value={newImage.description}
                  onChange={(e) => setNewImage({...newImage, description: e.target.value.slice(0, 500)})}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Describe your image..."
                  maxLength={500}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <TagSelector
                  selectedTags={newImage.tags}
                  onTagsChange={(tags) => setNewImage({...newImage, tags})}
                  placeholder="Select or create tags..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewImage({...newImage, file: e.target.files?.[0] || null})}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="file-upload"
                  />
                  <div className="flex items-center justify-between p-2 border border-gray-300 rounded-md bg-white">
                    <span className="text-gray-500">
                      {newImage.file ? newImage.file.name : "Choose file..."}
                    </span>
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadImage}
                className="px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/80 transition-colors"
              >
                Upload Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Search Modal */}
      <GameSearchModal
        isOpen={showGameSearchModal}
        onClose={() => setShowGameSearchModal(false)}
        onSelectGame={handleAddGame}
        existingGameIds={gamesList.map(game => game.id)}
      />

      {/* Collection Photo Full Size Modal */}
      {showCollectionPhotoModal && collectionPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowCollectionPhotoModal(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCollectionPhotoModal(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            <img
              src={collectionPhoto}
              alt="Collection photo - full size"
              className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            </div>
      )}

      {/* Delete Collection Photo Confirmation Modal */}
      {showDeleteCollectionPhotoConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Delete Collection Photo</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete your collection photo? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteCollectionPhotoConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCollectionPhoto}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorite Card Full Size Modal */}
      {showFavoriteCardModal && favoriteCard && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowFavoriteCardModal(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFavoriteCardModal(false)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            <img
              src={favoriteCard}
              alt="Favorite card - full size"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Delete Favorite Card Confirmation Modal */}
      {showDeleteFavoriteCardConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Delete Favorite Card</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete your favorite card? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteFavoriteCardConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFavoriteCard}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show All Games Modal */}
      {showAllGamesModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40"
          onClick={() => setShowAllGamesModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[80vh] overflow-y-auto" 
            style={{ backgroundColor: profileColors.containers }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">My Game Collection</h2>
              <button
                onClick={() => setShowAllGamesModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            {/* Collection Photo */}
            {collectionPhoto && (
              <div className="mb-6 flex justify-center">
                <div 
                  className="relative w-96 h-54 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowCollectionPhotoModal(true)}
                >
                  <img
                    src={collectionPhoto}
                    alt="Collection photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 transition-opacity">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Games List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  All Games ({gamesList.length})
                </h3>
                <p className="text-xs text-gray-500 flex items-center">
                  <GripVertical className="w-3 h-3 mr-1" />
                  Drag to reorder
                </p>
              </div>
              
              {gamesList.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={gamesList.map(game => game.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {gamesList.map((game, index) => (
                        <SortableGameItem
                          key={game.id}
                          game={game}
                          index={index}
                          onRemove={handleRemoveGame}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-2xl opacity-90 transform rotate-2">
                        <div className="flex items-center gap-3">
                          <div className="p-1">
                            <GripVertical className="w-4 h-4 text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-600 min-w-0 flex-1">
                            {gamesList.find(game => game.id === activeId)?.name} ({gamesList.find(game => game.id === activeId)?.year})
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                  </svg>
                  <p className="text-sm">No games in your collection yet</p>
                  <p className="text-xs">Click "Add Games" to start building your collection</p>
                </div>
              )}
            </div>
            
            {/* Footer Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAllGamesModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setShowGameSearchModal(true)}
                className="px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/80 transition-colors"
              >
                Add More Games
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setSelectedImage(null);
          setImageComments([]);
        }}
        imageUrl={selectedImage?.url || getUserDiceAvatar()}
        title={selectedImage?.title || `${user.username}'s Avatar`}
        alt="Profile picture"
        description={selectedImage?.description}
        author={selectedImage?.author}
        createdAt={selectedImage?.createdAt}
        category={selectedImage?.category}
        isFeatured={selectedImage?.isFeatured}
        likeCount={selectedImage?.likeCount}
        imageId={selectedImage?.imageId}
        isAuthenticated={isAuthenticated}
        currentUser={user}
        comments={imageComments}
        onLike={() => selectedImage?.imageId && handleImageLike(selectedImage.imageId)}
        onAddComment={handleAddComment}
        onLikeComment={handleCommentLike}
        onDeleteComment={handleCommentDelete}
        onReportComment={handleCommentReport}
        onRefreshComments={() => selectedImage?.imageId && loadImageComments(selectedImage.imageId)}
        onRefreshActivity={loadRecentActivity}
        onDelete={async () => {
          // TODO: Implement image delete functionality
          console.log('Delete clicked for image:', selectedImage?.imageId);
          // For now, just show a toast - the actual delete logic would go here
          showToast('Image delete functionality not yet implemented', 'info', 2000);
        }}
        onReport={async (reason: string, details?: string) => {
          // TODO: Implement image report functionality
          console.log('Report clicked for image:', selectedImage?.imageId, 'Reason:', reason, 'Details:', details);
          // For now, just show a toast - the actual report logic would go here
          showToast('Image report functionality not yet implemented', 'info', 2000);
        }}
        canDelete={selectedImage?.author?.name === user?.username}
        canReport={selectedImage?.author?.name !== user?.username}
        isLiked={selectedImage?.imageId ? imageLikes[selectedImage.imageId] || false : false}
        currentUserId={user?.id}
      />

    </div>
  );
} 