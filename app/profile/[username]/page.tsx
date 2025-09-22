'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { User, Calendar, Award, ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, Heart, Eye, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/Toast';
import ImageModal from '@/components/ImageModal';
import FriendsFollowersSection from '@/components/FriendsFollowersSection';

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

export default function UserProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { showToast, ToastContainer } = useToast();

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fbae17] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
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
  const profileColors = userProfile.profileColors || {
    cover: '#fbae17',
    background: '#f5f5f5',
    containers: '#ffffff'
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
              <h2 className="text-xl font-semibold mb-4 text-gray-900">About</h2>
              <div className="space-y-4">
                <p className="leading-relaxed text-gray-700">
                  {userProfile.bio || "No bio written yet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {userProfile.favoriteGames && userProfile.favoriteGames.length > 0 ? (
                    userProfile.favoriteGames.map((category, index) => (
                      <span key={index} className="px-3 py-1 bg-[#fbae17]/10 text-[#fbae17] rounded-full text-sm font-medium">
                        {category}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm italic text-gray-500">No favorite categories selected yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Game Collection Section */}
            <div className="rounded-lg shadow-sm border border-gray-200 p-6" style={{ backgroundColor: profileColors.containers }}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Game Collection</h2>
              
              {/* Top Row: Games List and Favorite Card */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Games List */}
                <div className="space-y-4 flex flex-col h-full">
                  <h3 className="text-lg font-medium text-gray-900">Games List - Top 10</h3>
                  <div className="space-y-2 flex-1">
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
                        <img
                          src={userProfile.favoriteCard}
                          alt="Favorite card"
                          className="w-full h-full object-contain rounded-lg cursor-pointer"
                          onClick={() => setShowImageModal(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                          </svg>
                          <span className="text-sm font-medium">No favorite card</span>
                        </div>
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
                      <img
                        src={userProfile.collectionPhoto}
                        alt="Collection photo"
                        className="w-full h-full object-contain rounded-lg cursor-pointer"
                        onClick={() => setShowImageModal(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        <span className="text-sm font-medium">No collection photo</span>
                      </div>
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
          setShowImageModal(false);
          setSelectedImage(null);
          setImageComments([]);
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
        isAuthenticated={false}
        currentUser={null}
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
        canDelete={false}
        canReport={false}
        isLiked={false}
        currentUserId=""
      />
    </div>
  );
}
