'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Camera, Edit, X, GripVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ImageModal from '@/components/ImageModal';
import ProfileUploadModal from '@/components/ProfileUploadModal';
import PhotoSelectionModal from '@/components/PhotoSelectionModal';
import { useTranslations } from 'next-intl';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
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

interface UserProfile {
  id: string;
  username: string;
  email?: string;
  collectionPhoto?: string;
  favoriteCard?: string;
  favoriteGames?: string[];
  gamesList?: Array<{id: number, name: string, year: number, image: string}>;
}

interface GalleryImage {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl?: string;
  author: { id: string; name: string; avatar: string; reputation?: number };
  category: string;
  createdAt: string;
  votes?: { upvotes: number; downvotes: number };
}

// Sortable game item component - NO t prop needed
function SortableGameItem({ game, index, isOwnProfile, onRemove }: { 
  game: any; 
  index: number; 
  isOwnProfile: boolean; 
  onRemove: (gameId: number) => void;
}) {
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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {isOwnProfile ? (
            <div 
              {...attributes} 
              {...listeners} 
              className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-gray-200 rounded"
              title="Drag to reorder"
            >
              <GripVertical className="w-5 h-5 text-gray-400 hover:text-gray-600 flex-shrink-0" />
            </div>
          ) : null}
          <span
            className={`text-sm font-bold flex-shrink-0 ${
              index === 0 ? 'text-[#fbae17]' : 'text-gray-500'
            }`}
          >
            {index + 1}.
          </span>
          <Link
            href={`/game/${game.id}`}
            className={`font-medium hover:text-[#fbae17] hover:underline transition-colors truncate cursor-pointer ${
              index === 0 ? 'text-gray-900' : 'text-gray-900'
            }`}
            title={game.name}
            onClick={(e) => {
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

export default function CollectionPage() {
  // Add global error handler for this component to catch t errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const errorHandler = (event: ErrorEvent) => {
        if (event.message?.includes('t is not defined') || event.message?.includes('ReferenceError: t')) {
          console.error('🔴 [CollectionPage Error Handler] Caught t error:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            stack: event.error?.stack,
            componentStack: (event.error as any)?.componentStack,
            timestamp: new Date().toISOString()
          });
          // Log current component state
          console.error('🔴 [CollectionPage Error Handler] Current state:', {
            hasT: typeof (window as any).__collectionPageT !== 'undefined',
            tType: typeof (window as any).__collectionPageT
          });
        }
      };
      
      window.addEventListener('error', errorHandler);
      return () => window.removeEventListener('error', errorHandler);
    }
  }, []);
  
  // EXACT order from working profile page - hooks in same sequence
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = params?.username as string;
  const { showToast, ToastContainer } = useToast();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  
  // EXACT pattern from working profile page - simple direct assignment
  const tRaw = useTranslations('profile');
  const tCommonRaw = useTranslations('common');
  
  // DEBUG: Log translation initialization
  if (typeof window !== 'undefined') {
    console.log('[CollectionPage] Translation initialization:', {
      tRawType: typeof tRaw,
      tRawIsFunction: typeof tRaw === 'function',
      tCommonRawType: typeof tCommonRaw,
      tCommonRawIsFunction: typeof tCommonRaw === 'function',
      stack: new Error().stack
    });
  }
  
  // Ensure t is always a function to prevent undefined errors
  const t: (key: string, params?: any) => string = typeof tRaw === 'function' 
    ? ((key: string, params?: any) => {
        try {
          const result = tRaw(key, params);
          if (typeof window !== 'undefined' && (result === undefined || result === null)) {
            console.warn('[CollectionPage] Translation returned undefined/null for key:', key, 'params:', params);
          }
          return result || key;
        } catch (error) {
          console.error('[CollectionPage] Error calling translation function:', error, 'key:', key);
          return key;
        }
      })
    : ((key: string) => {
        if (typeof window !== 'undefined') {
          console.error('[CollectionPage] t is not a function! tRaw type:', typeof tRaw, 'key:', key);
        }
        return key;
      });
  
  const tCommon: (key: string, params?: any) => string = typeof tCommonRaw === 'function' 
    ? ((key: string, params?: any) => {
        try {
          return tCommonRaw(key, params) || key;
        } catch (error) {
          console.error('[CollectionPage] Error calling tCommon:', error, 'key:', key);
          return key;
        }
      })
    : ((key: string) => key);
  
  // DEBUG: Verify t is defined
  if (typeof window !== 'undefined') {
    console.log('[CollectionPage] After initialization:', {
      tType: typeof t,
      tIsFunction: typeof t === 'function',
      tCommonType: typeof tCommon,
      tCommonIsFunction: typeof tCommon === 'function'
    });
  }
  
  // Store t in ref to ensure it's always accessible in callbacks
  const tRef = useRef(t);
  const isClosingModal = useRef(false);
  useEffect(() => {
    tRef.current = t;
    // Also store on window for debugging (remove in production if needed)
    if (typeof window !== 'undefined') {
      (window as any).__collectionPageT = t;
      console.log('[CollectionPage] Updated tRef.current, t type:', typeof t);
    }
  }, [t]);
  
  // Create a safe wrapper for t that logs errors
  const safeT = useCallback((key: string, params?: any): string => {
    try {
      if (typeof t !== 'function') {
        console.error('[CollectionPage] safeT: t is not a function!', {
          tType: typeof t,
          key,
          stack: new Error().stack
        });
        return key;
      }
      const result = t(key, params);
      return result || key;
    } catch (error) {
      console.error('[CollectionPage] safeT error:', {
        error,
        key,
        params,
        tType: typeof t,
        stack: new Error().stack
      });
      return key;
    }
  }, [t]);

  // Drag and drop sensors
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

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    title: string;
    description?: string;
    author?: { name: string; avatar: string };
    createdAt?: string;
    category?: string;
    likeCount?: number;
    imageId?: string;
  } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [userImages, setUserImages] = useState<GalleryImage[]>([]);
  const [imageComments, setImageComments] = useState<any[]>([]);
  const [imageLikes, setImageLikes] = useState<Record<string, boolean>>({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [showGamesListModal, setShowGamesListModal] = useState(false);
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [tempGamesList, setTempGamesList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'collection-photo' | 'favorite-card'>('collection-photo');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPhotoSelectionModal, setShowPhotoSelectionModal] = useState(false);
  const [uploadingCollectionPhoto, setUploadingCollectionPhoto] = useState(false);
  const [uploadingFavoriteCard, setUploadingFavoriteCard] = useState(false);
  const [pendingRemoveFeatured, setPendingRemoveFeatured] = useState<null | 'favorite-card' | 'collection-photo'>(null);
  const [editingFavoriteGames, setEditingFavoriteGames] = useState<string[]>([]);

  // Prevent background scrolling when modals are open (mobile + desktop)
  useEffect(() => {
    if (showGamesListModal || showAddGameModal) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    unlockBodyScroll();
  }, [showGamesListModal, showAddGameModal]);

  // Load user profile data - PLAIN async function like working version
  const loadUserProfile = async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/users/profile?username=${username}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile({
          ...data.user,
          email: data.user.email || user?.email || ''
        });

        // Load user's gallery images so collection photo / favorite card are linked to their posts
        if (data.user?.id) {
          try {
            const galleryUrl = user?.id
              ? `/api/gallery?author=${data.user.id}&userId=${user.id}`
              : `/api/gallery?author=${data.user.id}`;
            const galleryResponse = await fetch(galleryUrl);
            if (galleryResponse.ok) {
              const galleryData = await galleryResponse.json();
              setUserImages(galleryData.images || []);
            }
          } catch (e) {
            console.error('Error loading gallery images:', e);
          }
        }
      } else {
        // Use hardcoded string to avoid t closure issue in event handlers
        showToast('User not found', 'error');
        router.push('/');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Use hardcoded string to avoid t closure issue in event handlers
      showToast('Failed to load collection', 'error');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, user?.id]);

  // Update isOwnProfile
  useEffect(() => {
    if (user && userProfile) {
      const isOwn = user.id === userProfile.id || user.username === userProfile.username;
      setIsOwnProfile(isOwn);
    }
  }, [user, userProfile]);

  // Initialize temp games list when modal opens
  useEffect(() => {
    if (showGamesListModal && userProfile?.gamesList) {
      setTempGamesList([...userProfile.gamesList]);
    } else if (showGamesListModal && (!userProfile?.gamesList || userProfile.gamesList.length === 0)) {
      setTempGamesList([]);
    }
  }, [showGamesListModal, userProfile?.gamesList]);

  // Initialize editing favorite games when editing starts
  useEffect(() => {
    if (isEditingCollection && userProfile?.favoriteGames) {
      setEditingFavoriteGames([...userProfile.favoriteGames]);
    } else if (!isEditingCollection) {
      setEditingFavoriteGames([]);
    }
  }, [isEditingCollection, userProfile?.favoriteGames]);

  // Debounced search - useCallback to prevent recreation
  const searchGames = useCallback(async (query: string) => {
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
  }, [showToast]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchGames(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchGames]);

  // Refresh data when page comes into focus - EXACT pattern from working version
  useEffect(() => {
    if (!username) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUserProfile();
      }
    };

    const handleFocus = () => {
      loadUserProfile();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Handle URL image/photo parameter (direct links to featured posts)
  useEffect(() => {
    const imageId = searchParams?.get('image') || searchParams?.get('photo');
    if (!imageId) return;
    if (isClosingModal.current) return;
    if (showImageModal) return;
    if (userImages.length === 0) return;

    const image = userImages.find(img => img.id === imageId);
    if (!image) return;

    // Canonicalize legacy `photo` param to `image`
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('image') !== imageId) {
        url.searchParams.set('image', imageId);
      }
      url.searchParams.delete('photo');
      window.history.replaceState({}, '', url);
    } catch {}

    void openImageModal(image);
  }, [searchParams, userImages, showImageModal]);

  // Load comments for an image (for ImageModal counters and thread)
  const loadImageComments = async (imageId: string) => {
    const viewerId = user?.id;
    if (!viewerId) return;

    setLoadingComments(true);
    try {
      const response = await fetch(`/api/gallery/comments?imageId=${imageId}&userId=${viewerId}`);
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

  const handleImageLike = async (imageId: string) => {
    const viewerId = user?.id;
    if (!viewerId) {
      showToast(tCommon('pleaseSignIn'), 'info');
      return;
    }

    try {
      const currentLikeStatus = imageLikes[imageId] || false;
      const newVoteType = currentLikeStatus ? null : 'up';

      const response = await fetch('/api/gallery/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId,
          voteType: newVoteType,
          userId: viewerId
        })
      });

      if (response.ok) {
        const data = await response.json();

        setImageLikes(prev => ({
          ...prev,
          [imageId]: !currentLikeStatus
        }));

        setUserImages(prev => prev.map(img =>
          img.id === imageId
            ? { ...img, votes: { ...img.votes, upvotes: data.image.votes.upvotes } }
            : img
        ));

        if (selectedImage?.imageId === imageId) {
          setSelectedImage(prev => prev ? { ...prev, likeCount: data.image.votes.upvotes } : null);
        }
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const openImageModal = async (galleryImage: GalleryImage) => {
    if (!galleryImage) return;

    setSelectedImage({
      url: galleryImage.imageUrl,
      title: galleryImage.title || safeT('untitledImage'),
      description: galleryImage.description,
      author: {
        name: galleryImage.author?.name || userProfile?.username || 'Unknown User',
        avatar: galleryImage.author?.avatar || (userProfile as any)?.avatar || ''
      },
      createdAt: galleryImage.createdAt,
      category: galleryImage.category,
      likeCount: galleryImage.votes?.upvotes || 0,
      imageId: galleryImage.id
    });

    // Load comments + initialize like state
    if (user?.id) {
      await loadImageComments(galleryImage.id);
    } else {
      setImageComments([]);
    }
    setImageLikes(prev => ({ ...prev, [galleryImage.id]: (galleryImage as any).userVote === 'up' }));

    // Update URL with image id (and keep legacy `photo` links working)
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('image', galleryImage.id);
      url.searchParams.delete('photo');
      window.history.pushState({}, '', url);
    } catch {}

    setShowImageModal(true);
  };

  const handleAddGalleryComment = async (content: string) => {
    if (!selectedImage?.imageId) return;
    if (!user?.id) {
      showToast(tCommon('pleaseSignIn'), 'info');
      return;
    }

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
            avatar: user.avatar || '/DefaultDiceAvatar.svg',
            reputation: (user as any).reputation || 0
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast(errorData.error || tCommon('error'), 'error');
      }
    } catch (e) {
      console.error('Error adding comment:', e);
      showToast(tCommon('error'), 'error');
    }
  };

  const handleDeleteGalleryComment = async (commentId: string) => {
    if (!selectedImage?.imageId) return;
    if (!user?.id) {
      showToast(tCommon('pleaseSignIn'), 'info');
      return;
    }

    try {
      const response = await fetch(`/api/gallery/comments/${commentId}?userId=${user.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast(errorData.error || tCommon('error'), 'error');
        return;
      }
      await loadImageComments(selectedImage.imageId);
    } catch (e) {
      console.error('Error deleting gallery comment:', e);
      showToast(tCommon('error'), 'error');
    }
  };

  const handleLikeGalleryComment = async (commentId: string) => {
    if (!user?.id) {
      showToast(tCommon('pleaseSignIn'), 'info');
      return;
    }

    try {
      const response = await fetch('/api/gallery/comments/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userId: user.id
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast(errorData.error || tCommon('error'), 'error');
        return;
      }
      if (selectedImage?.imageId) {
        await loadImageComments(selectedImage.imageId);
      }
    } catch (e) {
      console.error('Error liking gallery comment:', e);
      showToast(tCommon('error'), 'error');
    }
  };

  const handleReplyToGalleryComment = async (commentId: string, content: string) => {
    if (!selectedImage?.imageId) return;
    if (!user?.id) {
      showToast(tCommon('pleaseSignIn'), 'info');
      return;
    }

    try {
      const response = await fetch('/api/gallery/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          content,
          author: {
            id: user.id,
            name: user.username,
            avatar: user.avatar || '/DefaultDiceAvatar.svg'
          }
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast(errorData.error || tCommon('error'), 'error');
        return;
      }
      await loadImageComments(selectedImage.imageId);
    } catch (e) {
      console.error('Error replying to gallery comment:', e);
      showToast(tCommon('error'), 'error');
    }
  };

  const handleReportGalleryComment = async (commentId: string, reason: string, details?: string) => {
    if (!user?.id) {
      showToast(tCommon('pleaseSignIn'), 'info');
      return;
    }

    try {
      const response = await fetch('/api/gallery/comments/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          reason,
          details: details || '',
          reporterId: user.id
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast(errorData.error || tCommon('error'), 'error');
        return;
      }
      showToast(tCommon('reportSubmittedSuccess'), 'success');
    } catch (e) {
      console.error('Error reporting gallery comment:', e);
      showToast(tCommon('reportSubmitError'), 'error');
    }
  };

  const handleOpenCollectionPhoto = () => {
    if (userProfile?.collectionPhoto) {
      const galleryImage = userImages.find(img => img.imageUrl === userProfile.collectionPhoto);
      if (galleryImage) {
        void openImageModal(galleryImage);
      } else {
        setSelectedImage({
          url: userProfile.collectionPhoto,
          title: tRef.current?.('collectionPhoto') || 'Collection Photo'
        });
        setImageComments([]);
        setShowImageModal(true);
      }
    }
  };

  const handleOpenFavoriteCard = () => {
    if (userProfile?.favoriteCard) {
      const galleryImage = userImages.find(img => img.imageUrl === userProfile.favoriteCard);
      if (galleryImage) {
        void openImageModal(galleryImage);
      } else {
        setSelectedImage({
          url: userProfile.favoriteCard,
          title: tRef.current?.('favoriteCard') || 'Favorite Card'
        });
        setImageComments([]);
        setShowImageModal(true);
      }
    }
  };

  // Add game to collection
  const addGameToCollection = async (game: any) => {
    if (!userProfile?.id) return;

    try {
      const currentGamesList = userProfile.gamesList || [];
      
      if (currentGamesList.some(g => g.id === game.id)) {
        showToast('Game already in collection', 'info');
        return;
      }

      const newGame = {
        id: game.id,
        name: game.nameEn || game.name,
        year: game.yearRelease || new Date().getFullYear(),
        image: game.image || '/default-game.png'
      };

      const updatedGamesList = [...currentGamesList, newGame];

      let email = userProfile.email;
      if (!email && userProfile.id) {
        try {
          const profileResponse = await fetch(`/api/users/profile?username=${userProfile.username}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            email = profileData.user?.email || '';
          }
        } catch (e) {
          console.error('Error fetching email:', e);
        }
      }

      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: email || user?.email || '',
          gamesList: updatedGamesList
        })
      });

      if (response.ok) {
        setUserProfile(prev => prev ? {
          ...prev,
          gamesList: updatedGamesList
        } : null);
        
        showToast('Game added to collection!', 'success');
        setShowAddGameModal(false);
        setSearchQuery('');
        setSearchResults([]);
        await loadUserProfile();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast(`Failed to add game: ${errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error adding game:', error);
      showToast('Failed to add game', 'error');
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

  // Game categories list (same as profile page)
  const gameCategories = [
    { value: 'Strategy', key: 'strategy' },
    { value: 'Family', key: 'family' },
    { value: 'Party', key: 'party' },
    { value: 'Cooperative', key: 'cooperative' },
    { value: 'Competitive', key: 'competitive' },
    { value: 'Deck Building', key: 'deckBuilding' },
    { value: 'Worker Placement', key: 'workerPlacement' },
    { value: 'Area Control', key: 'areaControl' },
    { value: 'Drafting', key: 'drafting' },
    { value: 'Engine Building', key: 'engineBuilding' },
    { value: 'Trading', key: 'trading' },
    { value: 'Negotiation', key: 'negotiation' },
    { value: 'Deduction', key: 'deduction' },
    { value: 'Memory', key: 'memory' },
    { value: 'Pattern Recognition', key: 'patternRecognition' },
    { value: 'Social Deduction', key: 'socialDeduction' },
    { value: 'Role Playing', key: 'rolePlaying' },
    { value: 'Miniatures', key: 'miniatures' },
    { value: 'Legacy', key: 'legacy' },
    { value: 'Campaign', key: 'campaign' },
    { value: 'Solo', key: 'solo' },
    { value: 'Two Player', key: 'twoPlayer' },
    { value: 'Quick Play', key: 'quickPlay' },
    { value: 'Heavy Strategy', key: 'heavyStrategy' },
    { value: 'Light Strategy', key: 'lightStrategy' },
    { value: 'Euro Game', key: 'euroGame' },
    { value: 'Ameritrash', key: 'ameritrash' },
    { value: 'Abstract', key: 'abstract' },
    { value: 'Thematic', key: 'thematic' },
    { value: 'Historical', key: 'historical' },
    { value: 'Fantasy', key: 'fantasy' },
    { value: 'Sci-Fi', key: 'sciFi' },
    { value: 'Horror', key: 'horror' },
    { value: 'Adventure', key: 'adventure' }
  ] as const;

  const getGameCategoryLabel = (categoryValue: string) => {
    const match = gameCategories.find(c => c.value === categoryValue);
    return match ? safeT(`gameCategories.${match.key}`) : categoryValue;
  };

  const handleToggleFavoriteGame = (category: string) => {
    setEditingFavoriteGames(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else if (prev.length < 3) {
        return [...prev, category];
      } else {
        showToast('You can only select up to 3 favorite game categories!', 'error');
        return prev;
      }
    });
  };

  const handleSaveFavoriteGames = async () => {
    if (!userProfile?.id) return;

    try {
      let email = userProfile.email;
      if (!email && userProfile.id) {
        try {
          const profileResponse = await fetch(`/api/users/profile?username=${userProfile.username}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            email = profileData.user?.email || '';
          }
        } catch (e) {
          console.error('Error fetching email:', e);
        }
      }

      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: email || user?.email || '',
          favoriteGames: editingFavoriteGames
        })
      });

      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, favoriteGames: editingFavoriteGames } : null);
        showToast('Favorite categories updated!', 'success');
        setIsEditingCollection(false);
        await loadUserProfile();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showToast(`Failed to update categories: ${errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating favorite games:', error);
      showToast('Failed to update favorite categories', 'error');
    }
  };

  // Save reordered games list
  const handleSaveGamesOrder = async () => {
    if (!userProfile?.id) return;

    try {
      let email = userProfile.email;
      if (!email && userProfile.id) {
        try {
          const profileResponse = await fetch(`/api/users/profile?username=${userProfile.username}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            email = profileData.user?.email || '';
          }
        } catch (e) {
          console.error('Error fetching email:', e);
        }
      }

      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: email || user?.email || '',
          gamesList: tempGamesList
        })
      });

      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, gamesList: tempGamesList } : null);
        showToast('Games order updated!', 'success');
        setShowGamesListModal(false);
        setIsEditingCollection(false);
        await loadUserProfile();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save games order:', errorData);
        showToast(`Failed to update games order: ${errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error updating games order:', error);
      showToast('Failed to update games order', 'error');
    }
  };

  // Upload handlers
  const handleCollectionPhotoUpload = () => {
    setUploadCategory('collection-photo');
    setShowPhotoSelectionModal(true);
  };

  const handleFavoriteCardUpload = () => {
    setUploadCategory('favorite-card');
    setShowPhotoSelectionModal(true);
  };

  // Handle selecting existing image
  const handleSelectExistingImage = async (imageUrl: string) => {
    if (!userProfile?.id) return;

    const isCollectionPhoto = uploadCategory === 'collection-photo';
    
    if (isCollectionPhoto) {
      setUploadingCollectionPhoto(true);
    } else {
      setUploadingFavoriteCard(true);
    }

    try {
      let email = userProfile.email;
      if (!email && userProfile.id) {
        try {
          const profileResponse = await fetch(`/api/users/profile?username=${userProfile.username}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            email = profileData.user?.email || '';
          }
        } catch (e) {
          console.error('Error fetching email:', e);
        }
      }

      const updateResponse = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: email || user?.email || '',
          [isCollectionPhoto ? 'collectionPhoto' : 'favoriteCard']: imageUrl
        })
      });

      if (updateResponse.ok) {
        setUserProfile(prev => prev ? { 
          ...prev, 
          [isCollectionPhoto ? 'collectionPhoto' : 'favoriteCard']: imageUrl 
        } : null);
        
        await loadUserProfile();
        showToast(isCollectionPhoto ? 'Collection photo updated!' : 'Favorite card updated!', 'success');
      }
    } catch (error) {
      console.error(`Error selecting ${uploadCategory}:`, error);
      showToast(`Failed to select ${uploadCategory}`, 'error');
    } finally {
      if (isCollectionPhoto) {
        setUploadingCollectionPhoto(false);
      } else {
        setUploadingFavoriteCard(false);
      }
    }
  };

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
        
        let email = userProfile.email;
        if (!email && userProfile.id) {
          try {
            const profileResponse = await fetch(`/api/users/profile?username=${userProfile.username}`);
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              email = profileData.user?.email || '';
            }
          } catch (e) {
            console.error('Error fetching email:', e);
          }
        }

        const updateResponse = await fetch('/api/users/update-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userProfile.id,
            username: userProfile.username,
            email: email || user?.email || '',
            [isCollectionPhoto ? 'collectionPhoto' : 'favoriteCard']: url
          })
        });

        if (updateResponse.ok) {
          setUserProfile(prev => prev ? { 
            ...prev, 
            [isCollectionPhoto ? 'collectionPhoto' : 'favoriteCard']: url 
          } : null);

          // Post to gallery (so the image has a real post + canonical link)
          try {
            const galleryPostResponse = await fetch('/api/gallery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageUrl: url,
                category,
                description: description || (isCollectionPhoto ? 'Collection photo' : 'Favorite card'),
                authorId: userProfile.id
              })
            });

            if (galleryPostResponse.ok) {
              // Refresh user images so clicks link to the same post everywhere
              const galleryResponse = await fetch(`/api/gallery?author=${userProfile.id}`);
              if (galleryResponse.ok) {
                const galleryData = await galleryResponse.json();
                setUserImages(galleryData.images || []);
              }
            }
          } catch (e) {
            console.error('Error posting to gallery:', e);
          }
          
          await loadUserProfile();
          showToast(isCollectionPhoto ? 'Collection photo uploaded!' : 'Favorite card uploaded!', 'success');
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

  const handleRemoveFavoriteCard = async () => {
    if (!userProfile?.id) return;

    try {
      let email = userProfile.email;
      if (!email && userProfile.id) {
        try {
          const profileResponse = await fetch(`/api/users/profile?username=${userProfile.username}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            email = profileData.user?.email || '';
          }
        } catch (e) {
          console.error('Error fetching email:', e);
        }
      }

      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: email || user?.email || '',
          favoriteCard: null
        })
      });

      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, favoriteCard: undefined } : null);
        await loadUserProfile();
        showToast('Favorite card removed', 'success');
      }
    } catch (error) {
      console.error('Error removing favorite card:', error);
      showToast('Failed to remove favorite card', 'error');
    }
  };

  const handleRemoveCollectionPhoto = async () => {
    if (!userProfile?.id) return;

    try {
      let email = userProfile.email;
      if (!email && userProfile.id) {
        try {
          const profileResponse = await fetch(`/api/users/profile?username=${userProfile.username}`);
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            email = profileData.user?.email || '';
          }
        } catch (e) {
          console.error('Error fetching email:', e);
        }
      }

      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          username: userProfile.username,
          email: email || user?.email || '',
          collectionPhoto: null
        })
      });

      if (response.ok) {
        setUserProfile(prev => prev ? { ...prev, collectionPhoto: undefined } : null);
        await loadUserProfile();
        showToast('Collection photo removed', 'success');
      }
    } catch (error) {
      console.error('Error removing collection photo:', error);
      showToast('Failed to remove collection photo', 'error');
    }
  };

  const favoriteGame = userProfile?.gamesList && userProfile.gamesList.length > 0 
    ? userProfile.gamesList[0] 
    : null;

  if (loading) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#111827',
          zIndex: 99999
        }}
      >
        <div 
          style={{
            backgroundColor: 'transparent',
            padding: '2rem',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0
          }}
        >
          <div className="text-center">
            <Image 
              src="/DiceLogo.svg" 
              alt="Loading..." 
              width={64} 
              height={64} 
              className="opacity-60 mx-auto mb-4 animate-pulse"
            />
            <p className="text-gray-300 whitespace-nowrap text-sm">{safeT('loadingCollection')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 mb-4">{safeT('collectionNotFound')}</p>
          <Link href="/" className="text-[#fbae17] hover:underline">{safeT('goBackHome')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-900 shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-nowrap">
            <Link 
              href={`/profile/${username}`}
              className="flex items-center space-x-2 text-white/90 hover:text-white transition-colors whitespace-nowrap flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">{safeT('backToProfile')}</span>
            </Link>
            <div className="flex-1" />
            {isOwnProfile && (
              <button
                onClick={() => setIsEditingCollection(!isEditingCollection)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium whitespace-nowrap bg-[#fbae17] hover:bg-[#fbae17]/90 text-white"
              >
                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{isEditingCollection ? tCommon('cancel') : tCommon('edit')}</span>
              </button>
            )}
            {!isOwnProfile && <div className="w-16 sm:w-20 flex-shrink-0"></div>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title (moved from header) */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight text-center">
            {safeT('collectionTitle', { username: userProfile.username })}
          </h1>
        </div>

        {/* Collection Photo */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#fbae17] mb-2">{safeT('collectionPhoto')}</h2>
          {userProfile.collectionPhoto ? (
            <div className="relative w-full aspect-[16/9] bg-transparent rounded-xl overflow-hidden cursor-pointer group"
              onClick={handleOpenCollectionPhoto}
            >
              <img
                src={userProfile.collectionPhoto}
                alt="Collection photo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
              {isEditingCollection && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingRemoveFeatured('collection-photo');
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-11 h-11 p-0 min-h-0 min-w-0 flex items-center justify-center shadow-lg transition-colors z-10"
                  title="Remove collection photo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button 
              onClick={isOwnProfile ? handleCollectionPhotoUpload : undefined}
              disabled={!isOwnProfile}
              className={`w-full aspect-[16/9] bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-400 transition-colors ${
                isOwnProfile ? 'cursor-pointer hover:bg-gray-700' : 'cursor-default'
              }`}
            >
              <Camera className="w-12 h-12 mb-2" />
              <span className="text-sm font-medium">{isOwnProfile ? (uploadingCollectionPhoto ? 'Uploading...' : 'Add Collection Photo') : safeT('noCollectionPhoto')}</span>
            </button>
          )}
        </div>

        {/* Favorite Card and Favorite Game Image Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Favorite Game Image (Left) */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-[#fbae17]">{safeT('favoriteGame')}</h2>
            {favoriteGame ? (
              <Link href={`/game/${favoriteGame.id}`} className="block">
                <div className="relative aspect-[4/3] bg-transparent rounded-xl overflow-hidden group cursor-pointer">
                  <img
                    src={favoriteGame.image || '/DefaultDiceAvatar.svg'}
                    alt={favoriteGame.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-[#fbae17] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {safeT('favorite')}
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-white font-bold text-lg leading-tight">{favoriteGame.name}</h3>
                  <p className="text-white/90 text-sm">{favoriteGame.year}</p>
                </div>
              </Link>
            ) : (
              <div className="aspect-[4/3] bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Camera className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">{safeT('noFavoriteGame')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Favorite Card (Right) */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-[#fbae17]">{safeT('favoriteCard')}</h2>
            {userProfile.favoriteCard ? (
              <div 
                className="relative aspect-[4/3] bg-transparent rounded-xl overflow-hidden cursor-pointer group"
                onClick={handleOpenFavoriteCard}
              >
                <img
                  src={userProfile.favoriteCard}
                  alt="Favorite card"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-300"></div>
                {isEditingCollection && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingRemoveFeatured('favorite-card');
                    }}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-11 h-11 p-0 min-h-0 min-w-0 flex items-center justify-center shadow-lg transition-colors z-10"
                    title="Remove favorite card"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={isOwnProfile ? handleFavoriteCardUpload : undefined}
                disabled={!isOwnProfile}
                className={`w-full aspect-[4/3] bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-400 transition-colors ${
                  isOwnProfile ? 'cursor-pointer hover:bg-gray-700' : 'cursor-default'
                }`}
              >
                <Camera className="w-12 h-12 mb-2" />
                <span className="text-sm font-medium">{uploadingFavoriteCard ? 'Uploading...' : safeT('noFavoriteCard')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Favorite Categories Section */}
        <div className="mb-8 space-y-2">
          <h3 className="text-lg font-semibold text-[#fbae17]">{safeT('favoriteGameCategories')}</h3>
          {isEditingCollection && isOwnProfile ? (
            <div className="space-y-3">
              <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-lg p-3 bg-gray-800">
                <div className="grid grid-cols-2 gap-2">
                  {gameCategories.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => handleToggleFavoriteGame(category.value)}
                      disabled={!editingFavoriteGames.includes(category.value) && editingFavoriteGames.length >= 3}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editingFavoriteGames.includes(category.value)
                          ? 'text-white bg-[#fbae17]'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } ${
                        !editingFavoriteGames.includes(category.value) && editingFavoriteGames.length >= 3
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'
                      }`}
                    >
                      {getGameCategoryLabel(category.value)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-400 md:whitespace-nowrap">
                  <span className="block md:inline">{safeT('selectFavoriteCategories')}</span>{' '}
                  <span className="block md:inline">({editingFavoriteGames.length}/3 {safeT('selected')})</span>
                </p>
                <button
                  onClick={handleSaveFavoriteGames}
                  className="px-4 py-2 bg-[#fbae17] hover:bg-[#fbae17]/90 text-white rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                >
                  {tCommon('save')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {userProfile.favoriteGames && userProfile.favoriteGames.length > 0 ? (
                userProfile.favoriteGames.map((category, index) => (
                  <span 
                    key={index} 
                    className="px-4 py-1.5 rounded-full text-sm font-medium bg-[#fbae17] text-white"
                  >
                    {getGameCategoryLabel(category)}
                  </span>
                ))
              ) : (
                <p className="text-sm italic text-gray-400 text-center md:text-left">{safeT('noFavoriteCategoriesSelected')}</p>
              )}
            </div>
          )}
        </div>

        {/* All Games Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">
              {safeT('allGames')} ({userProfile.gamesList?.length || 0})
            </h2>
            {isEditingCollection && (
              <button
                onClick={() => setShowGamesListModal(true)}
                className="text-sm hover:text-[#fbae17]/80 font-medium flex items-center space-x-1 text-[#fbae17]"
              >
                <span>{safeT('editList')}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </button>
            )}
          </div>
          {userProfile.gamesList && userProfile.gamesList.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {userProfile.gamesList.map((game, index) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="group"
                >
                  <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer flex items-center justify-center">
                    <img
                      src={game.image || '/DefaultDiceAvatar.svg'}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {index === 0 && (
                      <div className="absolute top-2 right-2 bg-[#fbae17] text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <h3 className="text-white font-semibold text-sm truncate">{game.name}</h3>
                      <p className="text-white/90 text-xs">{game.year}</p>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Add tile (editing only): opens Edit List modal */}
              {isEditingCollection && isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setShowGamesListModal(true)}
                  className="group"
                  aria-label={safeT('editList')}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-600 bg-gray-800/40 hover:border-[#fbae17] hover:bg-[#fbae17]/10 transition-colors">
                    <svg className="w-8 h-8 text-gray-300 group-hover:text-[#fbae17] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-white text-lg">{safeT('noGamesInCollection')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <ImageModal
          isOpen={showImageModal}
          onClose={() => {
            isClosingModal.current = true;
            setShowImageModal(false);
            setSelectedImage(null);
            setImageComments([]);
            // Remove image/photo parameter from URL without triggering Next.js scroll-to-top
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('image');
              url.searchParams.delete('photo');
              window.history.replaceState({}, '', url);
            } catch {}
            setTimeout(() => {
              isClosingModal.current = false;
            }, 100);
          }}
          imageUrl={selectedImage.url}
          title={selectedImage.title}
          description={selectedImage.description}
          author={selectedImage.author}
          createdAt={selectedImage.createdAt}
          category={selectedImage.category}
          likeCount={selectedImage.likeCount}
          imageId={selectedImage.imageId}
          isAuthenticated={isAuthenticated}
          currentUser={user}
          currentUserId={user?.id || ''}
          comments={imageComments}
          onLike={() => selectedImage.imageId && handleImageLike(selectedImage.imageId)}
          onAddComment={handleAddGalleryComment}
          onRefreshComments={() => selectedImage.imageId && loadImageComments(selectedImage.imageId)}
          isLiked={selectedImage?.imageId ? imageLikes[selectedImage.imageId] || false : false}
          onDeleteComment={handleDeleteGalleryComment}
          onLikeComment={handleLikeGalleryComment}
          onReplyToComment={handleReplyToGalleryComment}
          onReportComment={handleReportGalleryComment}
        />
      )}

      {/* Profile Upload Modal */}
      <PhotoSelectionModal
        isOpen={showPhotoSelectionModal}
        onClose={() => setShowPhotoSelectionModal(false)}
        onSelectExisting={handleSelectExistingImage}
        onUploadNew={() => {
          setShowPhotoSelectionModal(false);
          setShowUploadModal(true);
        }}
        category={uploadCategory}
        userImages={userImages}
        isLoadingImages={false}
      />

      <ProfileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleModalUpload}
        category={uploadCategory}
        isUploading={uploadingCollectionPhoto || uploadingFavoriteCard}
      />

      {/* Games List Modal - EXACT pattern from working profile page */}
      {showGamesListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[200] p-4" onClick={() => setShowGamesListModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">{safeT('gameCollection')}</h2>
              <button
                onClick={() => setShowGamesListModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
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
                            <span className="text-sm font-medium">{safeT('addGame')}</span>
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
                  <p className="text-lg">{safeT('noGamesInCollection')}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50 shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAddGameModal(true)}
                  className="flex-1 px-4 py-3 bg-[#fbae17] hover:bg-[#fbae17]/90 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  <span>{safeT('addGames')}</span>
                </button>
                {isOwnProfile && (
                  <button
                    onClick={handleSaveGamesOrder}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {tCommon('save')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Game Modal */}
      {showAddGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[200] p-4" onClick={() => setShowAddGameModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">{safeT('addGamesToCollection')}</h2>
              <button
                onClick={() => setShowAddGameModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Search Input */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder={safeT('searchGamesPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-transparent"
                />
              </div>

              {/* Search Results */}
              <div className="overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fbae17]"></div>
                    <span className="ml-3 text-gray-600">{tCommon('loading')}...</span>
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
                            {game.yearRelease || safeT('unknownYear')}
                          </p>
                        </div>
                        <button
                          onClick={() => addGameToCollection(game)}
                          className="ml-4 px-4 py-2 bg-[#fbae17] hover:bg-[#fbae17]/90 text-white rounded-lg font-medium transition-colors"
                        >
                          {safeT('add')}
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
                    <p>{tCommon('startTypingToSearch')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm remove featured image (same as Profile page) */}
      {pendingRemoveFeatured && (
        <div className="fixed inset-0 bg-black/50 z-[220] flex items-center justify-center p-4" onClick={() => setPendingRemoveFeatured(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {pendingRemoveFeatured === 'favorite-card' ? safeT('confirmRemoveFavoriteCardTitle') : safeT('confirmRemoveCollectionPhotoTitle')}
              </h3>
              <p className="text-sm text-gray-600">
                {safeT('confirmRemoveFeaturedPhotoBody')}
              </p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                onClick={() => setPendingRemoveFeatured(null)}
              >
                {tCommon('cancel')}
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                onClick={async () => {
                  const type = pendingRemoveFeatured;
                  setPendingRemoveFeatured(null);
                  if (type === 'favorite-card') {
                    await handleRemoveFavoriteCard();
                  } else {
                    await handleRemoveCollectionPhoto();
                  }
                }}
              >
                {tCommon('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {ToastContainer}
    </div>
  );
}
