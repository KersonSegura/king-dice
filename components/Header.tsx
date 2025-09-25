'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, Menu, X, User, Settings, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import { getUserPostCount } from '@/lib/user-posts';
import LoginModal from './LoginModal';
import FeaturesDropdown from './FeaturesDropdown';
import BoardgamesDropdown from './BoardgamesDropdown';
import SearchBar from './SearchBar';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [userStats, setUserStats] = useState({ level: 1, posts: 0 });
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  const userMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simple hover handlers - no delays, just immediate response
  const openMenu = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsUserMenuOpen(true);
  };

  const closeMenu = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsUserMenuOpen(false);
    }, 100);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Fetch user stats when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchUserStats = async () => {
        try {
          // Fetch reputation data to get level
          const reputationResponse = await fetch(`/api/reputation?userId=${user.id}`);
          if (reputationResponse.ok) {
            const reputationData = await reputationResponse.json();
            setUserStats(prev => ({ ...prev, level: reputationData.user?.level || 1 }));
          }

          // Fetch forum posts count
          const postsResponse = await fetch('/api/posts');
          let forumPostsCount = 0;
          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            const allPosts = postsData.posts || postsData;
            forumPostsCount = getUserPostCount(allPosts, user.id, user.username);
          }

          // Fetch gallery images count
          const galleryResponse = await fetch('/api/gallery');
          let galleryImagesCount = 0;
          if (galleryResponse.ok) {
            const galleryData = await galleryResponse.json();
            const allImages = galleryData.images || galleryData;
            galleryImagesCount = allImages.filter((image: any) => 
              image.author?.id === user.id || image.author?.name === user.username
            ).length;
          }

          // Set total posts count (forum + gallery)
          setUserStats(prev => ({ ...prev, posts: forumPostsCount + galleryImagesCount }));
        } catch (error) {
          console.error('Error fetching user stats:', error);
        }
      };

      fetchUserStats();
    }
  }, [isAuthenticated, user]);

  return (
    <header className="bg-white shadow-md border-b border-dark-200">
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center w-full h-16">
          {/* Left (Logo) */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-3 p-2 -m-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 relative">
                <Image
                  src="/DiceLogo.svg"
                  alt="King Dice"
                  width={40}
                  height={40}
                  className="w-full h-full"
                />
              </div>
              <span className="text-xl font-bold text-dark-900 hidden sm:inline">King Dice</span>
            </Link>
          </div>

          {/* Search Bar */}
          <SearchBar />

          {/* Center (Navigation) */}
          <nav className="hidden md:flex flex-1 justify-center space-x-8">
            <Link href="/" className="text-dark-700 hover:text-primary-500 transition-colors font-medium flex items-center space-x-2">
              <Image
                src="/HomeIcon.svg"
                alt="Home Icon"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              <span>Home</span>
            </Link>
            <BoardgamesDropdown />
            <Link href="/forums" className="text-dark-700 hover:text-primary-500 transition-colors font-medium flex items-center space-x-2">
              <Image
                src="/ForumsIcon.svg"
                alt="Forums Icon"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span>Forums</span>
            </Link>
            <Link href="/community-gallery" className="text-dark-700 hover:text-primary-500 transition-colors font-medium flex items-center space-x-2">
              <Image
                src="/GalleryIcon.svg"
                alt="Gallery Icon"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span>Gallery</span>
            </Link>
          </nav>

                     {/* Right (Actions) */}
           <div className="flex items-center justify-end flex-shrink-0 space-x-4">
             {/* Features Dropdown */}
             <FeaturesDropdown />

            {/* User Menu Button */}
            <div 
              className="relative"
              ref={userMenuRef}
              onMouseEnter={openMenu}
              onMouseLeave={closeMenu}
            >
              {isAuthenticated ? (
                <>
                  {/* Avatar Button - Full clickable area */}
                  <div
                    className="w-10 h-10 rounded-full border-2 border-black overflow-hidden hover:border-primary-500 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: '#ffffff', // Ensure white background
                      backgroundImage: `url(${user?.avatar || '/DefaultDiceAvatar.svg'})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                    
                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-1 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-4 z-50 backdrop-blur-sm bg-white/95">
                      {/* User Info Section */}
                      <div className="px-6 py-4 border-b border-gray-100">
                                                 <div className="flex items-center space-x-3">
                                                       <div 
                                className="w-16 h-16 rounded-full border-2 border-black overflow-hidden"
                                style={{
                                  backgroundColor: '#ffffff', // Ensure white background
                                  backgroundImage: `url(${user?.avatar || '/DefaultDiceAvatar.svg'})`,
                                  backgroundSize: 'contain',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat'
                                }}
                              />
                                                     <div className="flex-1 min-w-0 space-y-1">
                             <p className="text-sm font-semibold text-gray-900 truncate">{user?.username}</p>
                             {user?.title && (
                               <p className="text-xs text-yellow-600 font-medium truncate">
                                 {user.title}
                               </p>
                             )}
                             <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                             <div className="flex items-center space-x-2">
                               <span className="text-xs text-gray-600">Level {userStats.level}</span>
                               <span className="text-xs text-gray-400">•</span>
                               <span className="text-xs text-gray-600">{userStats.posts} total posts</span>
                             </div>
                           </div>
                          
                        </div>
                      </div>
                      
                      {/* Menu Items */}
                      <div className="py-2">
                        <Link 
                          href="/profile" 
                          className="flex items-center space-x-3 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-all duration-200 group"
                        >
                                                     <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                             <Image
                               src="/ProfileIconOn.svg"
                               alt="Profile Icon"
                               width={26}
                               height={26}
                               className="w-6 h-6"
                             />
                           </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium">Profile</span>
                            <p className="text-xs text-gray-500">View your profile</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                        
                        <Link 
                          href="/settings" 
                          className="flex items-center space-x-3 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-all duration-200 group"
                        >
                                                     <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                             <Image
                               src="/SettingsIcon.svg"
                               alt="Settings Icon"
                               width={26}
                               height={26}
                               className="w-6 h-6"
                             />
                           </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium">Settings</span>
                            <p className="text-xs text-gray-500">Manage your account</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      </div>
                      
                      {/* Divider */}
                      <div className="border-t border-gray-100 my-2"></div>
                      
                      {/* Logout Section */}
                      <div className="py-2">
                        <button 
                          className="flex items-center space-x-3 w-full px-6 py-3 text-red-600 hover:bg-red-50 transition-all duration-200 group"
                          onClick={() => {
                            logout();
                          }}
                        >
                                                     <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                             <Image
                               src="/SingOutIcon.svg"
                               alt="Sign Out Icon"
                               width={30}
                               height={30}
                               className="w-7 h-7 ml-2"
                             />
                           </div>
                          <div className="flex-1 text-left">
                            <span className="text-sm font-medium">Sign Out</span>
                            <p className="text-xs text-red-500">Log out of your account</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : isLoading ? (
                <div className="flex items-center space-x-2 px-3 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  <span className="text-gray-600">Loading...</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg transition-colors font-medium"
                >
                  <Image
                    src="/ProfileIconWhite.svg"
                    alt="Profile Icon"
                    width={16}
                    height={16}
                    className="w-4 h-4"
                  />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-dark-700 hover:text-primary-500 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-200">
            {/* Mobile Search */}
            <div className="px-4 mb-4">
              <SearchBar />
            </div>
            
            <nav className="flex flex-col space-y-4">
              {/* Mobile Home Link */}
              <Link 
                href="/" 
                className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Image
                  src="/HomeIcon.svg"
                  alt="Home Icon"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span>Home</span>
              </Link>
              
              {/* Mobile Boardgames Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">Board Games</h3>
                <Link 
                  href="/all-games" 
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Image
                    src="/AllIcon.svg"
                    alt="All Games"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span>All Games</span>
                </Link>
                <Link 
                  href="/hot-games" 
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Image
                    src="/FireIcon.svg"
                    alt="Hot Games"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span>Hot Games</span>
                </Link>
                <Link 
                  href="/top-ranked" 
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Image
                    src="/TrophyIcon.svg"
                    alt="Top Ranked"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span>Top Ranked</span>
                </Link>
              </div>
              <Link 
                href="/forums" 
                className="text-dark-700 hover:text-primary-500 transition-colors font-medium flex items-center space-x-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Image
                  src="/ForumsIcon.svg"
                  alt="Forums Icon"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span>Forums</span>
              </Link>
              <Link 
                href="/community-gallery" 
                className="text-dark-700 hover:text-primary-500 transition-colors font-medium flex items-center space-x-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Image
                  src="/GalleryIcon.svg"
                  alt="Gallery Icon"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span>Gallery</span>
              </Link>
              
              {/* Mobile Features Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4">Features</h3>
                <Link
                  href="/catan-map-generator"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbae17' }}>
                    <Image
                      src="/CatanIcon.svg"
                      alt="Catan Maps"
                      width={20}
                      height={20}
                      className="w-5 h-5"
                    />
                  </div>
                  <span>Catan Maps</span>
                </Link>
                
                <Link
                  href="/pixel-canvas"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbae17' }}>
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  </div>
                  <span>Pixel Canvas</span>
                </Link>
                
                <Link
                  href="/boardle"
                  className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbae17' }}>
                    <Image
                      src="/BoardleIcon.svg"
                      alt="Boardle"
                      width={20}
                      height={20}
                      className="w-5 h-5"
                    />
                  </div>
                  <span>Boardle</span>
                </Link>
                
                {isAuthenticated && (
                  <Link
                    href="/my-dice"
                    className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbae17' }}>
                      <Image
                        src="/MyDiceIcon.svg"
                        alt="My Dice"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    </div>
                    <span>My Dice</span>
                  </Link>
                )}
              </div>
              
              {/* Mobile Discord Button */}
              <a
                href="https://discord.gg/3xh7yUnnnW"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Join Discord</span>
              </a>
            </nav>
          </div>
        )}
      </div>
      
      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </header>
  );
} 