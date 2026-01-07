'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Camera, Edit, X, GripVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ImageModal from '@/components/ImageModal';
import ProfileUploadModal from '@/components/ProfileUploadModal';
import { useTranslations } from 'next-intl';
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
  gamesList?: Array<{id: number, name: string, year: number, image: string}>;
}

// Sortable game item component
function SortableGameItem({ game, index, isOwnProfile, onRemove, t }: { 
  game: any; 
  index: number; 
  isOwnProfile: boolean; 
  onRemove: (gameId: number) => void;
  t: any;
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

// Removed - no longer needed

export default function CollectionPage() {
  // COLLECTION PAGE - Re-enable translations properly
  // Use the same pattern as profile page which works
  const tResult = useTranslations('profile');
  const tCommonResult = useTranslations('common');
  
  // Ensure t is always a function - critical fix for the error
  const t: (key: string, params?: any) => string = typeof tResult === 'function' 
    ? tResult 
    : ((key: string) => {
        console.warn('[CollectionPage] t is not a function, using fallback for key:', key);
        return key;
      });
  
  const tCommon: (key: string, params?: any) => string = typeof tCommonResult === 'function'
    ? tCommonResult
    : ((key: string) => key);
  
  console.log('[CollectionPage] Component rendering with translations:', typeof t, typeof tCommon);
  
  // Now define other hooks and variables
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  const { showToast, ToastContainer } = useToast();
  const { user } = useAuth();

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
  } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
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
  const [uploadingCollectionPhoto, setUploadingCollectionPhoto] = useState(false);
  const [uploadingFavoriteCard, setUploadingFavoriteCard] = useState(false);

  // Load user profile data
  const loadUserProfile = useCallback(async () => {
    if (!username) return;
    
    console.log('[loadUserProfile] Starting');
    
    try {
      setLoading(true);
      
      // Use no-store cache to ensure fresh data
      const response = await fetch(`/api/users/profile?username=${username}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        // Ensure email is included
        setUserProfile({
          ...data.user,
          email: data.user.email || user?.email || ''
        });
      } else {
        showToast(t('userNotFound'), 'error');
        router.push('/');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      showToast(t('failedToLoadCollection'), 'error');
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [username, user?.email, router, showToast, t]);

  useEffect(() => {
    loadUserProfile();
  }, [username]);

  // Update isOwnProfile when user or userProfile changes
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

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchGames(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Refresh data when page comes into focus or becomes visible
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
  }, [username]);

  const handleOpenCollectionPhoto = () => {
    if (userProfile?.collectionPhoto) {
      setSelectedImage({
        url: userProfile.collectionPhoto,
        title: 'Collection Photo'
      });
      setShowImageModal(true);
    }
  };

  const handleOpenFavoriteCard = () => {
    if (userProfile?.favoriteCard) {
      setSelectedImage({
        url: userProfile.favoriteCard,
        title: 'Favorite Card'
      });
      setShowImageModal(true);
    }
  };

  // Search for games
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

      // Ensure we have email - fetch it if missing
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

  // Save reordered games list
  const handleSaveGamesOrder = async () => {
    if (!userProfile?.id) return;

    try {
      // Ensure we have email - fetch it if missing
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
        
        // Ensure we have email
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

  // Remove favorite card
  const handleRemoveFavoriteCard = async () => {
    if (!userProfile?.id) return;

    try {
      // Ensure we have email
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

  // Remove collection photo
  const handleRemoveCollectionPhoto = async () => {
    if (!userProfile?.id) return;

    try {
      // Ensure we have email
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
            <p className="text-gray-300">Loading collection...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Collection not found</p>
          <Link href="/" className="text-[#fbae17] hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-nowrap">
            <Link 
              href={`/profile/${username}`}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">Back to Profile</span>
            </Link>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate px-2 flex-1 text-center">{userProfile.username}'s Collection</h1>
            {isOwnProfile && (
              <button
                onClick={() => setIsEditingCollection(!isEditingCollection)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium whitespace-nowrap bg-[#fbae17] hover:bg-[#fbae17]/90 text-white"
              >
                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{isEditingCollection ? 'Cancel' : 'Edit'}</span>
              </button>
            )}
            {!isOwnProfile && <div className="w-16 sm:w-20 flex-shrink-0"></div>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Collection Photo */}
        <div className="mb-8">
          {userProfile.collectionPhoto ? (
            <div className="relative w-full aspect-[16/9] bg-gray-100 rounded-xl overflow-hidden cursor-pointer group"
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
                    handleRemoveCollectionPhoto();
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors z-10"
                  title="Remove collection photo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : isEditingCollection ? (
            <button 
              onClick={handleCollectionPhotoUpload}
              className="w-full aspect-[16/9] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors"
            >
              <Camera className="w-12 h-12 mb-2" />
              <span className="text-sm font-medium">{uploadingCollectionPhoto ? 'Uploading...' : 'Add Collection Photo'}</span>
            </button>
          ) : null}
        </div>

        {/* Favorite Card and Favorite Game Image Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Favorite Game Image (Left) */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Favorite Game</h2>
            {favoriteGame ? (
              <Link href={`/game/${favoriteGame.id}`} className="block">
                <div className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden group cursor-pointer flex items-center justify-center">
                  <img
                    src={favoriteGame.image || '/DefaultDiceAvatar.svg'}
                    alt={favoriteGame.name}
                    className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-lg mb-1">{favoriteGame.name}</h3>
                    <p className="text-white/90 text-sm">{favoriteGame.year}</p>
                  </div>
                  <div className="absolute top-4 right-4 bg-[#fbae17] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                    <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Favorite
                  </div>
                </div>
              </Link>
            ) : (
              <div className="aspect-[4/3] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center text-gray-300">
                  <Camera className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm text-white">No favorite game</p>
                </div>
              </div>
            )}
          </div>

          {/* Favorite Card (Right) */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Favorite Card</h2>
            {userProfile.favoriteCard ? (
              <div 
                className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden cursor-pointer group"
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
                      handleRemoveFavoriteCard();
                    }}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors z-10"
                    title="Remove favorite card"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : isEditingCollection ? (
              <button 
                onClick={handleFavoriteCardUpload}
                className="w-full aspect-[4/3] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <Camera className="w-12 h-12 mb-2" />
                <span className="text-sm font-medium">{uploadingFavoriteCard ? 'Uploading...' : 'No favorite card'}</span>
              </button>
            ) : (
              <div className="aspect-[4/3] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center text-gray-300">
                  <Camera className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm text-white">No favorite card</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* All Games Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">
              All Games ({userProfile.gamesList?.length || 0})
            </h2>
            {isEditingCollection && (
              <button
                onClick={() => setShowGamesListModal(true)}
                className="text-sm hover:text-[#fbae17]/80 font-medium flex items-center space-x-1 text-[#fbae17]"
              >
                <span>Edit List</span>
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
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-white text-lg">No games in collection</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <ImageModal
          isOpen={showImageModal}
          onClose={() => {
            setShowImageModal(false);
            setSelectedImage(null);
          }}
          imageUrl={selectedImage.url}
          title={selectedImage.title}
        />
      )}

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
                          t={t}
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
                  <p className="text-lg">No games in collection</p>
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
                  <span>Add Games</span>
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
                  placeholder="Search games..."
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
                    <span className="ml-3 text-gray-600">Loading...</span>
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
                    <p>Start typing to search for games</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {ToastContainer}
    </div>
  );
}

