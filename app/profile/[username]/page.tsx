'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { User, Calendar, Award, ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, Heart, Eye, Download, X, Settings, Edit, Camera, Plus, Palette, GripVertical } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import ImageModal from '@/components/ImageModal';
import FriendsFollowersSection from '@/components/FriendsFollowersSection';
import ProfileColorCustomizer from '@/components/ProfileColorCustomizer';
import ProfileUploadModal from '@/components/ProfileUploadModal';
import LoadingScreen from '@/components/LoadingScreen';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  reputation: number;
  isVerified: boolean;
  isAdmin: boolean;
  joinDate: string;
  title?: string;
  bio?: string;
  favoriteGames?: string[];
  profileColors?: {
    cover: string;
    background: string;
    containers: string;
  };
  collectionPhoto?: string;
  favoriteCard?: string;
  gamesList?: Array<{id: number, name: string, year: number, image: string}>;
  levelProgress?: {
    currentLevel: number;
    currentLevelName: string;
    currentXP: number;
    xpForNextLevel: number;
    progressPercentage: number;
  };
}

// Sortable game item component
function SortableGameItem({ game, index, isOwnProfile, onRemove }: { game: any; index: number; isOwnProfile: boolean; onRemove: (gameId: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: game.id,
    transition: {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-lg group relative border-2 transition-all ${
        index === 0
          ? 'bg-gradient-to-br from-[#fbae17]/10 to-[#fbae17]/5 border-[#fbae17] shadow-lg'
          : 'bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300'
      } ${isDragging ? 'shadow-2xl scale-105' : ''}`}
    >
      {index === 0 && (
        <div className="absolute -top-2 -right-2 bg-[#fbae17] text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
          <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Favorite
        </div>
      )}

      {/* Game info - single line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {isOwnProfile && (
            <div 
              {...attributes} 
              {...listeners} 
              className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-gray-200 rounded"
              title="Drag to reorder"
            >
              <GripVertical className="w-5 h-5 text-gray-400 hover:text-gray-600 flex-shrink-0" />
            </div>
          )}
          <span
            className={`text-sm font-bold flex-shrink-0 ${
              index === 0 ? 'text-[#fbae17]' : 'text-gray-500'
            }`}
          >
            {index + 1}.
          </span>
          <Link
            href={`/juego/${game.id}`}
            className={`font-medium hover:text-[#fbae17] hover:underline transition-colors truncate cursor-pointer ${
              index === 0 ? 'text-gray-900' : 'text-gray-900'
            }`}
            title={game.name}
            onClick={(e) => {
              // Prevent navigation if we're dragging
              if (isDragging) {
                e.preventDefault();
              }
            }}
          >
            {game.name.length > 20 ? `${game.name.substring(0, 20)}...` : game.name}
          </Link>
        </div>
        {isOwnProfile && (
          <button
            className="text-red-500 hover:text-red-700 transition-colors p-1 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
            title="Remove from collection"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(game.id);
            }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = params?.username as string;
  const { showToast, ToastContainer } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Drag and drop sensors - optimized for smooth dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Only activate drag after moving 8px - prevents accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<ForumPost[]>([]);
  const [userImages, setUserImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [imageComments, setImageComments] = useState<any[]>([]);
  const [imageLikes, setImageLikes] = useState<{[imageId: string]: boolean}>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [showGamesListModal, setShowGamesListModal] = useState(false);
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tempGamesList, setTempGamesList] = useState<any[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBio, setEditingBio] = useState('');
  
  // Ref to track if we're currently closing the modal (to prevent reopening)
  const isClosingModal = useRef<boolean>(false);
  const [editingFavoriteGames, setEditingFavoriteGames] = useState<string[]>([]);
  const [uploadingCollectionPhoto, setUploadingCollectionPhoto] = useState(false);
  const [uploadingFavoriteCard, setUploadingFavoriteCard] = useState(false);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [showColorCustomizer, setShowColorCustomizer] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'favorite-card' | 'collection-photo'>('favorite-card');
  const [profileColors, setProfileColors] = useState({
    cover: '#fbae17',
    background: '#f5f5f5',
    containers: '#ffffff'
  });

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
    if (!userProfile?.id) return;
    
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/gallery/comments?imageId=${imageId}&userId=${userProfile.id}`);
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
    if (!userProfile?.id) return;

    try {
      const currentLikeStatus = imageLikes[imageId] || false;
      const newVoteType = currentLikeStatus ? null : 'up';
      
      const response = await fetch('/api/gallery/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId,
          voteType: newVoteType,
          userId: userProfile.id
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

  // Handle edit description
  const handleEditDescription = async (newDescription: string) => {
    if (!userProfile?.id || !selectedImage?.imageId) return;

    try {
      const response = await fetch(`/api/gallery/${selectedImage.imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: userProfile.id,
          description: newDescription
        })
      });

      if (response.ok) {
        // Update the image in userImages
        setUserImages(prev => prev.map(img => 
          img.id === selectedImage.imageId
            ? { ...img, description: newDescription }
            : img
        ));

        // Update selectedImage
        setSelectedImage(prev => prev ? {
          ...prev,
          description: newDescription
        } : null);

        showToast('Description updated successfully', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to update description', 'error');
      }
    } catch (error) {
      console.error('Error updating description:', error);
      showToast('Failed to update description', 'error');
    }
  };

  // Load user profile data
  const loadUserProfile = async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      
      // Load user profile data
      const response = await fetch(`/api/users/profile?username=${username}`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
        
        // Check if this is the current user's profile - Facebook-style approach
        const checkProfileOwnership = async () => {
          try {
            // Method 1: Check server-side session (like Facebook does)
            const sessionResponse = await fetch('/api/auth/me', {
              method: 'GET',
              credentials: 'include'
            });
            
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              if (sessionData.user && sessionData.user.username === data.user.username) {
                console.log('✅ Server session match:', sessionData.user.username);
                setIsOwnProfile(true);
                return;
              }
            }
            
            // Method 2: Check localStorage (fallback)
            const currentUser = localStorage.getItem('currentUser') || 
                               localStorage.getItem('username') || 
                               localStorage.getItem('user') ||
                               localStorage.getItem('loggedInUser');
            const isOwn = currentUser === data.user.username;
            
            // Method 3: Check sessionStorage (another fallback)
            const sessionUser = sessionStorage.getItem('currentUser') || 
                               sessionStorage.getItem('username') || 
                               sessionStorage.getItem('user');
            const isOwnSession = sessionUser === data.user.username;
            
            // Method 4: Check cookies (browser cookies)
            const getCookie = (name: string) => {
              const value = `; ${document.cookie}`;
              const parts = value.split(`; ${name}=`);
              if (parts.length === 2) return parts.pop()?.split(';').shift();
            };
            const cookieUser = getCookie('username') || getCookie('user') || getCookie('currentUser');
            const isOwnCookie = cookieUser === data.user.username;
            
            // Method 5: Check all localStorage keys for any match
            const allStorageKeys = Object.keys(localStorage);
            let foundMatch = false;
            
            // Check for the old project user ID and map it to current username
            const oldUserId = localStorage.getItem('reglas-de-mesa-user-id');
            if (oldUserId && oldUserId.includes('user_')) {
              console.log('🔍 Found old user ID:', oldUserId);
              // Map the old user ID to the current username 'kingdice'
              // This handles the migration from old project name
              if (data.user.username === 'kingdice') {
                foundMatch = true;
                console.log('✅ Using old user ID as ownership indicator for kingdice user');
              }
            }
            
            // Also check for direct username match
            for (const key of allStorageKeys) {
              const value = localStorage.getItem(key);
              if (value === data.user.username) {
                console.log(`✅ Found match in localStorage key "${key}":`, value);
                foundMatch = true;
                break;
              }
            }
            
            const finalResult = isOwn || isOwnSession || isOwnCookie || foundMatch;
            setIsOwnProfile(finalResult);
            
            // Debug logging (can be removed in production)
            console.log('Profile ownership check:', {
              profileUsername: data.user.username,
              finalResult,
              methods: {
                localStorage: isOwn,
                sessionStorage: isOwnSession,
                cookies: isOwnCookie,
                localStorageScan: foundMatch
              }
            });
            
          } catch (error) {
            console.error('Error checking profile ownership:', error);
            // Fallback to localStorage only
            const currentUser = localStorage.getItem('currentUser');
            setIsOwnProfile(currentUser === data.user.username);
          }
        };
        
        await checkProfileOwnership();
        
        // Set profile colors
        if (data.user.profileColors) {
          setProfileColors(data.user.profileColors);
        }
        
        // Load user's posts
        if (data.user?.id) {
          const postsResponse = await fetch(`/api/posts?author=${data.user.id}`);
          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            setUserPosts(postsData.posts || []);
          }
          
          // Load user's gallery images
          const galleryResponse = await fetch(`/api/gallery?author=${data.user.id}`);
          if (galleryResponse.ok) {
            const galleryData = await galleryResponse.json();
            setUserImages(galleryData.images || []);
          }
        }
      } else {
        showToast('User not found', 'error');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      showToast('Failed to load user profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [username]);

  // Handle URL photo parameter (for direct links to photos)
  useEffect(() => {
    const photoId = searchParams?.get('photo');
    
    // Only process if:
    // 1. There's a photo ID in the URL
    // 2. Images are loaded
    // 3. Modal is not already open
    // 4. We're not in the process of closing the modal
    if (photoId && userImages.length > 0 && !showImageModal && !isClosingModal.current) {
      // Find the image with the matching ID
      const image = userImages.find(img => img.id === photoId);
      
      if (image) {
        // Open the image modal
        openImageModal(image);
      }
    }
    
    // If there's no photo parameter, we're done closing
    if (!photoId && isClosingModal.current) {
      // Small delay to ensure URL has fully updated
      setTimeout(() => {
        isClosingModal.current = false;
      }, 100);
    }
  }, [searchParams, userImages, showImageModal]);

  // Search for games
  const searchGames = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/boardgames?search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.games || []);
      }
    } catch (error) {
      console.error('Error searching games:', error);
      showToast('Error searching games', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Add game to collection
  const addGameToCollection = async (game: any) => {
    if (!userProfile?.id) return;

    try {
      const currentGamesList = userProfile.gamesList || [];
      
      // Check if game already exists
      if (currentGamesList.some(g => g.id === game.id)) {
        showToast('Game already in collection', 'info');
        return;
      }

      // Add game to the list
      const newGame = {
        id: game.id,
        name: game.nameEn || game.name,
        year: game.yearRelease || new Date().getFullYear(),
        image: game.image || '/default-game.png'
      };

      const updatedGamesList = [...currentGamesList, newGame];

      // Update user profile
      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          gamesList: updatedGamesList
        })
      });

      if (response.ok) {
        // Update local state
        setUserProfile(prev => prev ? {
          ...prev,
          gamesList: updatedGamesList
        } : null);
        
        showToast('Game added to collection!', 'success');
        setShowAddGameModal(false);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        showToast('Failed to add game', 'error');
      }
    } catch (error) {
      console.error('Error adding game:', error);
      showToast('Failed to add game', 'error');
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGames(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Edit profile functions
  const handleEditProfile = () => {
    setIsEditing(true);
    setEditingBio(userProfile?.bio || '');
    setEditingFavoriteGames(userProfile?.favoriteGames || []);
  };

  const handleSaveProfile = async () => {
    if (!userProfile?.id) return;

    try {
      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          bio: editingBio,
          favoriteGames: editingFavoriteGames
        })
      });

      if (response.ok) {
        setUserProfile(prev => prev ? {
          ...prev,
          bio: editingBio,
          favoriteGames: editingFavoriteGames
        } : null);
        setIsEditing(false);
        showToast('Profile updated successfully!', 'success');
      } else {
        showToast('Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingBio(userProfile?.bio || '');
    setEditingFavoriteGames(userProfile?.favoriteGames || []);
  };

  const handleToggleFavoriteGame = (category: string) => {
    setEditingFavoriteGames(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else if (prev.length < 3) {
        return [...prev, category];
      }
      return prev;
    });
  };

  // Game categories list
  const gameCategories = [
    'Strategy', 'Family', 'Party', 'Cooperative', 'Competitive', 'Deck Building',
    'Worker Placement', 'Area Control', 'Drafting', 'Engine Building', 'Trading',
    'Negotiation', 'Deduction', 'Memory', 'Pattern Recognition', 'Social Deduction',
    'Role Playing', 'Miniatures', 'Legacy', 'Campaign', 'Solo', 'Two Player',
    'Quick Play', 'Heavy Strategy', 'Light Strategy', 'Euro Game', 'Ameritrash',
    'Abstract', 'Thematic', 'Historical', 'Fantasy', 'Sci-Fi', 'Horror', 'Adventure'
  ];

  // Open upload modal for collection photo
  const handleCollectionPhotoUpload = () => {
    setUploadCategory('collection-photo');
    setShowUploadModal(true);
  };

  // Open upload modal for favorite card
  const handleFavoriteCardUpload = () => {
    setUploadCategory('favorite-card');
    setShowUploadModal(true);
  };

  // Handle upload from modal
  const handleModalUpload = async (file: File, description: string, category: string) => {
    if (!userProfile?.id) return;

    const isCollectionPhoto = uploadCategory === 'collection-photo';
    
    if (isCollectionPhoto) {
      setUploadingCollectionPhoto(true);
    } else {
      setUploadingFavoriteCard(true);
    }

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', uploadCategory);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (uploadResponse.ok) {
        const { url } = await uploadResponse.json();
        
        // Update user profile
        const updateResponse = await fetch('/api/users/update-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userProfile.id,
            username: userProfile.username,
            email: userProfile.email,
            [isCollectionPhoto ? 'collectionPhoto' : 'favoriteCard']: url
          })
        });

        if (updateResponse.ok) {
          setUserProfile(prev => prev ? { 
            ...prev, 
            [isCollectionPhoto ? 'collectionPhoto' : 'favoriteCard']: url 
          } : null);
          
          // Post to gallery with custom description
          await fetch('/api/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: url,
              category: category,
              description: description || (isCollectionPhoto ? 'Collection photo' : 'Favorite card'),
              authorId: userProfile.id
            })
          });

          // Refresh user images
          const galleryResponse = await fetch(`/api/gallery?author=${userProfile.id}`);
          if (galleryResponse.ok) {
            const galleryData = await galleryResponse.json();
            setUserImages(galleryData.images || []);
          }

          // Refresh entire profile to show updated image
          await loadUserProfile();

          showToast(`${isCollectionPhoto ? 'Collection photo' : 'Favorite card'} uploaded successfully!`, 'success');
          setShowUploadModal(false);
        }
      }
    } catch (error) {
      console.error(`Error uploading ${uploadCategory}:`, error);
      showToast(`Failed to upload ${uploadCategory}`, 'error');
    } finally {
      if (isCollectionPhoto) {
        setUploadingCollectionPhoto(false);
      } else {
        setUploadingFavoriteCard(false);
      }
    }
  };


  // Remove favorite card
  const handleRemoveFavoriteCard = async () => {
    if (!userProfile?.id) return;

    try {
      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          favoriteCard: null
        })
      });

      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, favoriteCard: null } : null);
        // Refresh entire profile to ensure UI updates
        await loadUserProfile();
        showToast('Favorite card removed', 'success');
      }
    } catch (error) {
      console.error('Error removing favorite card:', error);
      showToast('Failed to remove favorite card', 'error');
    }
  };

  // Remove collection photo
  const handleRemoveCollectionPhoto = async () => {
    if (!userProfile?.id) return;

    try {
      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          collectionPhoto: null
        })
      });

      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, collectionPhoto: null } : null);
        // Refresh entire profile to ensure UI updates
        await loadUserProfile();
        showToast('Collection photo removed', 'success');
      }
    } catch (error) {
      console.error('Error removing collection photo:', error);
      showToast('Failed to remove collection photo', 'error');
    }
  };

  // Helper function to open image modal with URL update
  const openImageModal = async (galleryImage: GalleryImage) => {
    if (!galleryImage || !userProfile || isClosingModal.current) return;
    
    // Set up the selected image with full gallery data
    setSelectedImage({
      url: galleryImage.imageUrl,
      title: galleryImage.title,
      description: galleryImage.description,
      author: {
        id: galleryImage.author?.id || userProfile.id,
        name: galleryImage.author?.name || userProfile.username,
        avatar: galleryImage.author?.avatar || userProfile.avatar
      },
      createdAt: galleryImage.createdAt,
      category: galleryImage.category,
      isFeatured: galleryImage.isFeatured,
      likeCount: galleryImage.votes?.upvotes || 0,
      imageId: galleryImage.id
    });
    
    // Load comments and check like status
    await loadImageComments(galleryImage.id);
    
    // Check if user has liked this image
    if (userProfile?.id) {
      setImageLikes(prev => ({
        ...prev,
        [galleryImage.id]: galleryImage.votes?.voters?.includes(userProfile.id) || false
      }));
    }
    
    // Update URL with photo ID (like Facebook: /profile/username?photo=imageId)
    router.push(`/profile/${username}?photo=${galleryImage.id}`, { scroll: false });
    
    setShowImageModal(true);
  };

  // Handle opening favorite card in modal
  const handleOpenFavoriteCard = async () => {
    if (!userProfile?.favoriteCard) return;
    
    // Find the gallery image that matches the favorite card URL
    const galleryImage = userImages.find(img => img.imageUrl === userProfile.favoriteCard);
    
    if (galleryImage) {
      await openImageModal(galleryImage);
    }
  };

  // Handle opening collection photo in modal
  const handleOpenCollectionPhoto = async () => {
    if (!userProfile?.collectionPhoto) return;
    
    // Find the gallery image that matches the collection photo URL
    const galleryImage = userImages.find(img => img.imageUrl === userProfile.collectionPhoto);
    
    if (galleryImage) {
      await openImageModal(galleryImage);
    }
  };

  // Handle drag end for reordering games
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTempGamesList((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Remove game from collection
  const handleRemoveGame = (gameId: number) => {
    setTempGamesList((items) => items.filter((item) => item.id !== gameId));
    showToast('Game removed from collection', 'success', 1500);
  };

  // Save reordered games list
  const handleSaveGamesOrder = async () => {
    if (!userProfile?.id) return;

    try {
      console.log('Saving games order:', tempGamesList);
      
      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          gamesList: tempGamesList
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Games order saved successfully:', data);
        
        // Update local state with the new order
        setUserProfile(prev => prev ? { ...prev, gamesList: tempGamesList } : null);
        
        showToast('Games order updated!', 'success');
        setShowGamesListModal(false);
        
        // Reload profile data to ensure consistency
        await loadUserProfile();
      } else {
        const errorData = await response.json();
        console.error('Failed to save games order:', errorData);
        showToast('Failed to update games order', 'error');
      }
    } catch (error) {
      console.error('Error updating games order:', error);
      showToast('Failed to update games order', 'error');
    }
  };

  // Initialize temp games list when modal opens
  useEffect(() => {
    if (showGamesListModal && userProfile?.gamesList) {
      setTempGamesList([...userProfile.gamesList]);
    }
  }, [showGamesListModal, userProfile?.gamesList]);

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

  if (loading) {
    return <LoadingScreen message="Loading Profile" subMessage="Fetching user data..." />;
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User not found</h1>
          <Link href="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const levelInfo = getLevelColor(userProfile.levelProgress?.currentLevel || 1);

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
        {/* Settings Button - Top Right (Mobile & Desktop) */}
        {isOwnProfile && (
          <Link
            href="/settings"
            className={`absolute top-4 right-4 z-10 p-2 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              coverTextClass === 'text-white' 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
          >
            <Settings className="w-5 h-5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        )}

        <div className="relative max-w-6xl mx-auto px-4 py-6 h-full flex items-end">
          <div className="flex items-end space-x-6 w-full">
            {/* Profile Picture */}
            <div className="relative">
              <div 
                className="w-32 h-32 rounded-full border-4 border-black overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                style={{
                  backgroundColor: '#ffffff', // Ensure white background
                  backgroundImage: `url(${userProfile.avatar})`,
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
                <h1 className={`text-3xl font-bold ${coverTextClass}`}>{userProfile.username}</h1>
                {userProfile.isAdmin && (
                  <div className="flex items-center space-x-1 bg-purple-600 px-3 py-1 rounded-full">
                    <span className="text-white text-sm font-semibold">👑</span>
                    <span className="text-white text-sm font-semibold">Admin</span>
                  </div>
                )}
              </div>
              <p className={`text-lg ${coverSecondaryTextClass} mb-3`}>
                Level {userProfile.levelProgress?.currentLevel || 1}{userProfile.title ? ` ${userProfile.title}` : ` ${userProfile.levelProgress?.currentLevelName || 'Commoner'}`}
              </p>
              
              {/* XP Progress Bar */}
              {userProfile.levelProgress && (
                <div className="w-full max-w-md">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`${coverSecondaryTextClass} font-medium`}>
                      {userProfile.levelProgress.currentXP} XP
                    </span>
                    <span className={`${coverSecondaryTextClass} font-medium`}>
                      {userProfile.levelProgress.xpForNextLevel > 0 ? `${userProfile.levelProgress.xpForNextLevel} to next level` : 'Max Level'}
                    </span>
                  </div>
                  <div className="w-full bg-black bg-opacity-20 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${userProfile.levelProgress.progressPercentage}%`,
                        boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
                      }}
                    />
                  </div>
                </div>
              )}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">About</h2>
                {isOwnProfile && (
                  <div className="flex items-center space-x-2">
                    {isEditing && (
                      <button
                        onClick={() => setShowColorCustomizer(true)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <Palette className="w-4 h-4" />
                        <span>Customize Colors</span>
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        onClick={handleEditProfile}
                        className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        style={{ backgroundColor: profileColors.cover, color: 'white' }}
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={editingBio}
                      onChange={(e) => setEditingBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-transparent resize-none"
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Favorite Game Categories (Select up to 3)
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                      <div className="grid grid-cols-2 gap-2">
                        {gameCategories.map((category) => (
                          <button
                            key={category}
                            onClick={() => handleToggleFavoriteGame(category)}
                            disabled={!editingFavoriteGames.includes(category) && editingFavoriteGames.length >= 3}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              editingFavoriteGames.includes(category)
                                ? 'text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                            } ${
                              !editingFavoriteGames.includes(category) && editingFavoriteGames.length >= 3
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer'
                            }`}
                            style={{
                              backgroundColor: editingFavoriteGames.includes(category) ? profileColors.cover : undefined,
                              borderColor: editingFavoriteGames.includes(category) ? profileColors.cover : undefined
                            }}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 rounded-lg text-white transition-colors"
                      style={{ backgroundColor: profileColors.cover }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
              <div className="space-y-4">
                <p className="leading-relaxed text-gray-700">
                  {userProfile.bio || "No bio written yet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {userProfile.favoriteGames && userProfile.favoriteGames.length > 0 ? (
                    userProfile.favoriteGames.map((category, index) => (
                        <span 
                          key={index} 
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{ 
                            backgroundColor: `${profileColors.cover}1A`, // 10% opacity
                            color: profileColors.cover 
                          }}
                        >
                        {category}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm italic text-gray-500">No favorite categories selected yet</p>
                  )}
                </div>
              </div>
              )}
            </div>

            {/* Game Collection Section */}
            <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Game Collection</h2>
                {isOwnProfile && (
                  <button
                    onClick={() => setIsEditingCollection(!isEditingCollection)}
                    className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    style={{ backgroundColor: profileColors.cover, color: 'white' }}
                  >
                    <Edit className="w-4 h-4" />
                    <span>{isEditingCollection ? 'Cancel' : 'Edit'}</span>
                  </button>
                )}
              </div>
              
              {/* Top Row: Games List and Favorite Card */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Games List */}
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Games List - Top 10</h3>
                    {isEditingCollection && (
                      <button
                        onClick={() => setShowGamesListModal(true)}
                        className="text-sm hover:text-[#fbae17]/80 font-medium flex items-center space-x-1"
                        style={{ color: profileColors.cover }}
                      >
                        <span>Edit List</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div 
                    className="space-y-2 flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => setShowGamesListModal(true)}
                  >
                    {userProfile.gamesList && userProfile.gamesList.length > 0 ? (
                      userProfile.gamesList.slice(0, 10).map((game, index) => (
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
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                        <p className="text-sm">No games in collection yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Favorite Card Section */}
                <div className="space-y-4 flex flex-col h-full">
                  <h3 className="text-lg font-medium text-gray-900">Favorite Card</h3>
                  <div className="relative flex-1">
                    <div className="h-full bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 group relative overflow-hidden">
                      {userProfile.favoriteCard ? (
                        <>
                        <img
                          src={userProfile.favoriteCard}
                          alt="Favorite card"
                          className="w-full h-full object-contain rounded-lg cursor-pointer"
                            onClick={handleOpenFavoriteCard}
                          />
                          {isEditingCollection && (
                            <button
                              onClick={handleRemoveFavoriteCard}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors z-10"
                              title="Remove favorite card"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <button 
                          onClick={handleFavoriteCardUpload}
                          className="w-full h-full flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors"
                        >
                          <Camera className="w-12 h-12 mb-2" />
                          <span className="text-sm font-medium">
                            {uploadingFavoriteCard ? 'Uploading...' : 'No favorite card'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Collection Photo */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Collection Photo</h3>
                <div className="relative">
                  <div className="aspect-[4/3] bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 group relative overflow-hidden">
                    {userProfile.collectionPhoto ? (
                      <>
                      <img
                        src={userProfile.collectionPhoto}
                        alt="Collection photo"
                        className="w-full h-full object-contain rounded-lg cursor-pointer"
                          onClick={handleOpenCollectionPhoto}
                        />
                        {isEditingCollection && (
                          <button
                            onClick={handleRemoveCollectionPhoto}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg transition-colors z-10"
                            title="Remove collection photo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button 
                        onClick={handleCollectionPhotoUpload}
                        className="w-full h-full flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors"
                      >
                        <Camera className="w-12 h-12 mb-2" />
                        <span className="text-sm font-medium">
                          {uploadingCollectionPhoto ? 'Uploading...' : 'No collection photo'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Gallery Section */}
            <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Photos</h2>
              <div className="grid grid-cols-3 gap-2">
                {userImages.length > 0 ? (
                  userImages.slice(0, 6).map((image: GalleryImage) => (
                    <div 
                      key={image.id} 
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-pointer relative"
                      onClick={() => openImageModal(image)}
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
                                <Heart className="w-3 h-3" fill="currentColor" />
                                <span>{image.votes.upvotes}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="w-3 h-3" />
                                <span>{image.comments}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Eye className="w-3 h-3" />
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
                  <Link 
                    href={`/community-gallery?author=${encodeURIComponent(userProfile.username)}`}
                    className="text-[#fbae17] hover:text-[#fbae17]/80 font-medium"
                  >
                    View All {userImages.length} Photos
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Friends & Followers Section */}
            <FriendsFollowersSection
              userId={userProfile.id}
              currentUserId={undefined} // No current user for visitor view
              isOwnProfile={false}
              profileColors={profileColors}
            />

            {/* Recent Activity */}
            <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {userPosts.length > 0 || userImages.length > 0 ? (
                  <>
                    {userPosts.slice(0, 3).map((post) => (
                      <div key={post.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">Created a forum post</p>
                          <p className="text-xs text-gray-500">{post.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(post.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                    {userImages.slice(0, 2).map((image) => (
                      <div key={image.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">Uploaded to gallery</p>
                          <p className="text-xs text-gray-500">{image.title || 'Untitled image'}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(image.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => {
          // Set closing flag to prevent reopening during URL transition
          isClosingModal.current = true;
          
          setShowImageModal(false);
          setSelectedImage(null);
          setImageComments([]);
          
          // Remove photo parameter from URL when closing modal
          router.push(`/profile/${username}`, { scroll: false });
        }}
        imageUrl={selectedImage?.url || userProfile.avatar}
        title={selectedImage?.title || `${userProfile.username}'s Avatar`}
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
        onAddComment={() => showToast('Please log in to comment', 'info')}
        onLikeComment={() => showToast('Please log in to like comments', 'info')}
        onDeleteComment={() => showToast('Please log in to delete comments', 'info')}
        onReportComment={() => showToast('Please log in to report comments', 'info')}
        onRefreshComments={() => selectedImage?.imageId && loadImageComments(selectedImage.imageId)}
        onRefreshActivity={() => {}}
        onDelete={() => showToast('Please log in to delete images', 'info')}
        onReport={() => showToast('Please log in to report images', 'info')}
        onEditDescription={handleEditDescription}
        canDelete={!!(isAuthenticated && user && selectedImage?.author?.id === user.id)}
        canReport={!!(isAuthenticated && user)}
        canEdit={!!(isAuthenticated && user && selectedImage?.author?.id === user.id)}
        isLiked={selectedImage?.imageId ? imageLikes[selectedImage.imageId] || false : false}
        currentUserId={user?.id || ""}
      />

      {/* Profile Upload Modal */}
      <ProfileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleModalUpload}
        category={uploadCategory}
        isUploading={uploadingCollectionPhoto || uploadingFavoriteCard}
      />

      {/* Games List Modal */}
      {showGamesListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowGamesListModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Game Collection</h2>
              <button
                onClick={() => setShowGamesListModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {tempGamesList && tempGamesList.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={tempGamesList.map(g => g.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tempGamesList.map((game, index) => (
                        <SortableGameItem
                          key={game.id}
                          game={game}
                          index={index}
                          isOwnProfile={isOwnProfile}
                          onRemove={handleRemoveGame}
                        />
                      ))}
                      
                      {/* Add New Game Tile */}
                      {isOwnProfile && (
                        <div 
                          className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#fbae17] bg-gray-50 hover:bg-[#fbae17]/5 transition-all cursor-pointer group flex items-center justify-center"
                          onClick={() => setShowAddGameModal(true)}
                        >
                          <div className="flex items-center space-x-2 text-gray-400 group-hover:text-[#fbae17] transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                            <span className="text-sm font-medium">Add Game</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                  </svg>
                  <p className="text-lg">No games in collection yet</p>
                  <p className="text-sm text-gray-400 mt-2">Add games to your collection to see them here</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAddGameModal(true)}
                  className="flex-1 px-4 py-3 bg-[#fbae17] hover:bg-[#fbae17]/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  <span>Add Games to Collection</span>
                </button>
                {isOwnProfile && (
                  <button
                    onClick={handleSaveGamesOrder}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Save Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Game Modal */}
      {showAddGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddGameModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add Games to Collection</h2>
              <button
                onClick={() => setShowAddGameModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Search Input */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search for games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-transparent"
                />
              </div>

              {/* Search Results */}
              <div className="max-h-[50vh] overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fbae17]"></div>
                    <span className="ml-3 text-gray-600">Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((game) => (
                      <div 
                        key={game.id}
                        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {game.nameEn || game.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {game.yearRelease || 'Unknown year'}
                          </p>
                        </div>
                        <button
                          onClick={() => addGameToCollection(game)}
                          className="ml-4 px-4 py-2 bg-[#fbae17] hover:bg-[#fbae17]/90 text-white rounded-lg font-medium transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No games found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Start typing to search for games...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Color Customizer */}
      <ProfileColorCustomizer
        isOpen={showColorCustomizer}
        onClose={() => setShowColorCustomizer(false)}
        profileColors={profileColors}
        onPreview={(newColors) => {
          // Real-time preview - update local state only
          setProfileColors(newColors);
        }}
        onSave={async (newColors) => {
          try {
            const response = await fetch('/api/users/update-profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userProfile?.id,
                username: userProfile?.username,
                email: userProfile?.email,
                profileColors: newColors
              })
            });

            if (response.ok) {
              setProfileColors(newColors);
              showToast('Profile colors updated!', 'success');
            } else {
              showToast('Failed to update colors', 'error');
            }
          } catch (error) {
            console.error('Error updating colors:', error);
            showToast('Failed to update colors', 'error');
          }
        }}
      />
    </div>
  );
}