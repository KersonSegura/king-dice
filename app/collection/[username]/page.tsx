'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import ImageModal from '@/components/ImageModal';

interface UserProfile {
  id: string;
  username: string;
  collectionPhoto?: string;
  favoriteCard?: string;
  gamesList?: Array<{id: number, name: string, year: number, image: string}>;
}

export default function CollectionPage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  const { showToast, ToastContainer } = useToast();
  const { user } = useAuth();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Load user profile data
  const loadUserProfile = async () => {
    if (!username) return;
    
    try {
      setLoading(true);
      
      // Use no-store cache to ensure fresh data
      const response = await fetch(`/api/users/profile?username=${username}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
      } else {
        showToast('User not found', 'error');
        router.push('/');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      showToast('Failed to load collection', 'error');
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [username]);

  // Refresh data when page comes into focus or becomes visible
  // This ensures data is fresh when navigating back from the profile page
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

  const favoriteGame = userProfile?.gamesList && userProfile.gamesList.length > 0 
    ? userProfile.gamesList[0] 
    : null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
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
            <div className="w-16 sm:w-20 flex-shrink-0"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Collection Photo */}
        {userProfile.collectionPhoto && (
          <div className="mb-8">
            <div className="relative w-full aspect-[16/9] bg-gray-100 rounded-xl overflow-hidden cursor-pointer group"
              onClick={handleOpenCollectionPhoto}
            >
              <img
                src={userProfile.collectionPhoto}
                alt="Collection photo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300"></div>
            </div>
          </div>
        )}

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
              </div>
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
          <h2 className="text-2xl font-semibold text-white">
            All Games ({userProfile.gamesList?.length || 0})
          </h2>
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
              <p className="text-white text-lg">No games in collection yet</p>
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

      {ToastContainer}
    </div>
  );
}

