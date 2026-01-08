'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, User, Settings, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';

import { getUserPostCount } from '@/lib/user-posts';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { closeChatOnNavigation, closeMenusOnChatOpen } from '@/lib/closeChat';
import LoginModal from './LoginModal';
import FeaturesDropdown from './FeaturesDropdown';
import BoardgamesDropdown from './BoardgamesDropdown';
import SearchBar from './SearchBar';
import { useNotifications } from '@/hooks/useNotifications';
import { useLoginModal } from '@/hooks/useLoginModal';

export default function Header() {
  const t = useTranslations('header');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useLoginModal();
  const [userStats, setUserStats] = useState({ level: 1, posts: 0 });
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { items: notifItems, unread: notifUnread, markAllRead, markOneRead } = useNotifications();

  const userMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  
  // Desktop hamburger menu for when space is limited
  const [isDesktopNavOpen, setIsDesktopNavOpen] = useState(false);
  const [showDesktopHamburger, setShowDesktopHamburger] = useState(false);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const desktopNavButtonRef = useRef<HTMLButtonElement>(null);
  const desktopNavMenuRef = useRef<HTMLDivElement>(null);
  const desktopNavHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simple hover handlers - no delays, just immediate response
  const openMenu = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsUserMenuOpen(true);
    setShowNotificationsPanel(false);
    // Close chat when opening profile menu on mobile
    closeChatOnNavigation();
  };

  const closeMenu = () => {
    setIsUserMenuOpen(false);
    setShowNotificationsPanel(false);
  };

  // Close the avatar menu when navigating to a new page (Header persists across routes)
  useEffect(() => {
    setIsUserMenuOpen(false);
    setShowNotificationsPanel(false);
  }, [pathname]);

  // Helper function to close menu and chat on mobile navigation
  const handleMobileNavigation = () => {
    setIsMenuOpen(false);
    closeChatOnNavigation();
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Listen for chat open events to close menus on mobile
  useEffect(() => {
    const handleCloseMenus = () => {
      // Only close on mobile devices
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsMenuOpen(false);
        setIsUserMenuOpen(false);
        setShowNotificationsPanel(false);
      }
    };

    window.addEventListener('closeMenusOnChatOpen', handleCloseMenus);
    
    return () => {
      window.removeEventListener('closeMenusOnChatOpen', handleCloseMenus);
    };
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }

    return () => {
      if (isMenuOpen) {
        unlockBodyScroll();
      }
    };
  }, [isMenuOpen]);

  // Check if desktop navigation items fit and determine if hamburger is needed
  useEffect(() => {
    const checkNavFit = () => {
      // Only check on desktop (md and above, which is 768px+)
      if (typeof window === 'undefined' || window.innerWidth < 768) {
        setShowDesktopHamburger(false);
        return;
      }

      // Use a width-based breakpoint to determine when to show hamburger
      // Show hamburger when window width is less than ~1900px to ensure Shop button never goes behind Features menu
      // This appears much earlier to prevent any overlap issues (Shop button already goes behind at 1630px)
      setShowDesktopHamburger(window.innerWidth < 1900);
    };

    // Check on mount and resize
    checkNavFit();
    window.addEventListener('resize', checkNavFit);
    
    // Also check after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(checkNavFit, 100);

    return () => {
      window.removeEventListener('resize', checkNavFit);
      clearTimeout(timeoutId);
    };
  }, []);

  // Desktop nav menu hover handlers
  const handleDesktopNavMouseEnter = () => {
    // Clear any existing timeout
    if (desktopNavHoverTimeoutRef.current) {
      clearTimeout(desktopNavHoverTimeoutRef.current);
      desktopNavHoverTimeoutRef.current = null;
    }
    setIsDesktopNavOpen(true);
  };

  const handleDesktopNavMouseLeave = () => {
    // Add a small delay before closing to prevent flickering
    desktopNavHoverTimeoutRef.current = setTimeout(() => {
      setIsDesktopNavOpen(false);
    }, 150);
  };

  // Cleanup desktop nav hover timeout on unmount
  useEffect(() => {
    return () => {
      if (desktopNavHoverTimeoutRef.current) {
        clearTimeout(desktopNavHoverTimeoutRef.current);
      }
    };
  }, []);

  // Prevent scroll chaining on mobile menu when at boundaries
  useEffect(() => {
    if (!isMenuOpen || !mobileMenuRef.current) return;

    const menuElement = mobileMenuRef.current;

    const handleWheel = (e: WheelEvent) => {
      const scrollTop = menuElement.scrollTop;
      const scrollHeight = menuElement.scrollHeight;
      const clientHeight = menuElement.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop >= maxScroll - 1;

      // If at boundary and trying to scroll beyond it, prevent to stop body scroll
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollTop = menuElement.scrollTop;
      const scrollHeight = menuElement.scrollHeight;
      const clientHeight = menuElement.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      const isAtTop = scrollTop <= 1;
      const isAtBottom = scrollTop >= maxScroll - 1;

      // If at boundary, prevent touch move from propagating
      if (isAtTop || isAtBottom) {
        // Allow the menu to scroll within bounds, but prevent chaining to body
        // The CSS overscroll-behavior should handle this, but we reinforce it here
      }
    };

    // Use capture phase to catch events before they bubble
    menuElement.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    menuElement.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });

    return () => {
      menuElement.removeEventListener('wheel', handleWheel, { capture: true } as any);
      menuElement.removeEventListener('touchmove', handleTouchMove, { capture: true } as any);
    };
  }, [isMenuOpen]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Don't close if clicking on the menu button itself
      if (mobileMenuButtonRef.current && mobileMenuButtonRef.current.contains(target)) {
        return;
      }
      // Don't close if clicking inside the menu
      if (mobileMenuRef.current && mobileMenuRef.current.contains(target)) {
        return;
      }
      // Otherwise, close the menu
        setIsMenuOpen(false);
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [isMenuOpen]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [isUserMenuOpen]);

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
      <div className="w-full px-2 sm:px-6 md:px-8 lg:px-12">
        <div className="flex justify-between items-center w-full h-16 gap-2">
          {/* Left (Logo) */}
          <div className="flex items-center flex-shrink-0">
            <Link 
              href="/" 
              className="flex items-center space-x-3 p-2 -m-2 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={closeChatOnNavigation}
            >
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

          {/* Search Bar - Always visible on mobile, centered on desktop */}
          <div className="flex-1 min-w-0 md:flex md:items-center md:justify-center">
            <SearchBar />
          </div>

          {/* Center (Navigation) */}
          <nav ref={desktopNavRef} className="hidden md:flex md:flex-1 md:justify-center space-x-8">
            {/* Individual navigation items - shown when there's enough space */}
            {!showDesktopHamburger && (
              <>
                <Link href="/" className="text-dark-700 hover:text-primary-500 transition-colors font-medium flex items-center space-x-2">
                  <Image
                    src="/HomeIcon.svg"
                    alt="Home Icon"
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <span>{t('home')}</span>
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
                  <span>{t('forums')}</span>
                </Link>
                <Link href="/community-gallery" className="text-dark-700 hover:text-primary-500 transition-colors font-medium flex items-center space-x-2">
                  <Image
                    src="/GalleryIcon.svg"
                    alt="Gallery Icon"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span>{t('gallery')}</span>
                </Link>
                <Link href="/shop" className="text-dark-700 hover:text-primary-500 transition-colors font-medium flex items-center space-x-2">
                  <img
                    src="/ShopIcon.svg?v=3"
                    alt="Shop Icon"
                    className="w-6 h-6"
                  />
                  <span>{t('shop')}</span>
                </Link>
              </>
            )}
          </nav>

                     {/* Right (Actions) - Always visible on mobile */}
           <div className="flex items-center justify-end flex-shrink-0 space-x-1 md:space-x-4">
             {/* Desktop hamburger menu button - shown when space is limited, right next to Features */}
             {showDesktopHamburger && (
               <div 
                 className="relative"
                 onMouseEnter={handleDesktopNavMouseEnter}
                 onMouseLeave={handleDesktopNavMouseLeave}
               >
                 <button
                   ref={desktopNavButtonRef}
                   className="p-2 text-gray-600 hover:text-primary-500 transition-colors rounded-lg hover:bg-gray-100"
                   aria-label="Navigation Menu"
                 >
                   <Menu className="w-5 h-5" />
                 </button>

                 {/* Desktop Navigation Dropdown */}
                 {isDesktopNavOpen && (
                   <div
                     ref={desktopNavMenuRef}
                     className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                   >
                     <Link
                       href="/"
                       onClick={() => setIsDesktopNavOpen(false)}
                       className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                     >
                       <Image
                         src="/HomeIcon.svg"
                         alt="Home Icon"
                         width={20}
                         height={20}
                         className="w-5 h-5"
                       />
                       <span>{t('home')}</span>
                     </Link>
                     
                     {/* Board Games Section */}
                     <div className="border-t border-gray-200 my-2"></div>
                     <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                       {t('boardGames')}
                     </div>
                     <Link
                       href="/all-games"
                       onClick={() => setIsDesktopNavOpen(false)}
                       className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                     >
                       <Image
                         src="/AllIcon.svg"
                         alt="All Games"
                         width={24}
                         height={24}
                         className="w-6 h-6"
                       />
                       <span>{t('allGames')}</span>
                     </Link>
                     <Link
                       href="/hot-games"
                       onClick={() => setIsDesktopNavOpen(false)}
                       className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                     >
                       <Image
                         src="/FireIcon.svg"
                         alt="Hot Games"
                         width={24}
                         height={24}
                         className="w-6 h-6"
                       />
                       <span>{t('hotGames')}</span>
                     </Link>
                     <Link
                       href="/top-ranked"
                       onClick={() => setIsDesktopNavOpen(false)}
                       className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                     >
                       <Image
                         src="/TrophyIcon.svg"
                         alt="Top Ranked"
                         width={24}
                         height={24}
                         className="w-6 h-6"
                       />
                       <span>{t('topRanked')}</span>
                     </Link>
                     
                     <div className="border-t border-gray-200 my-2"></div>
                     
                     <Link
                       href="/forums"
                       onClick={() => setIsDesktopNavOpen(false)}
                       className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                     >
                       <Image
                         src="/ForumsIcon.svg"
                         alt="Forums Icon"
                         width={24}
                         height={24}
                         className="w-6 h-6"
                       />
                       <span>{t('forums')}</span>
                     </Link>
                     <Link
                       href="/community-gallery"
                       onClick={() => setIsDesktopNavOpen(false)}
                       className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                     >
                       <Image
                         src="/GalleryIcon.svg"
                         alt="Gallery Icon"
                         width={24}
                         height={24}
                         className="w-6 h-6"
                       />
                       <span>{t('gallery')}</span>
                     </Link>
                     <Link
                       href="/shop"
                       onClick={() => setIsDesktopNavOpen(false)}
                       className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                     >
                       <img
                         src="/ShopIcon.svg?v=3"
                         alt="Shop Icon"
                         className="w-6 h-6"
                       />
                       <span>{t('shop')}</span>
                     </Link>
                   </div>
                 )}
               </div>
             )}
             
             {/* Features Dropdown */}
             <FeaturesDropdown />

            {/* User Menu Button - Always visible on mobile */}
            <div 
              className="relative flex-shrink-0 z-10"
              ref={userMenuRef}
            >
              {isAuthenticated ? (
                <>
                  {/* Avatar Button with notification badge */}
                  <div className="relative" onClick={() => {
                    setIsUserMenuOpen(v => {
                      const newMenuState = !v;
                      // Close chat when opening profile menu on mobile
                      if (newMenuState) {
                        closeChatOnNavigation();
                      }
                      return newMenuState;
                    });
                  }}>
                    <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden hover:border-primary-500 transition-colors cursor-pointer flex items-center justify-center bg-white">
                      <Image
                        src={user?.avatar || '/DefaultDiceAvatar.svg'}
                        alt={user?.username || 'User avatar'}
                        width={40}
                        height={40}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {!isUserMenuOpen && notifUnread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-4 px-1.5 rounded-full min-w-[16px] text-center">
                        {notifUnread > 99 ? '99+' : notifUnread}
                      </span>
                    )}
                  </div>
                    
                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-1 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-4 z-50 backdrop-blur-sm bg-white/95">
                      {showNotificationsPanel ? (
                        <>
                          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <button
                              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 text-gray-700"
                              onClick={() => setShowNotificationsPanel(false)}
                              aria-label="Back"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                              <span className="text-sm">{t('back')}</span>
                            </button>
                            <div className="flex items-center gap-2">
                              <Image src="/NotificationsIcon.svg" alt="Notifications" width={18} height={18} className="opacity-80" />
                              <span className="text-sm font-semibold tracking-wide">{t('notifications')}</span>
                              {notifUnread > 0 && (
                                <span className="ml-1 bg-red-500 text-white text-[10px] leading-4 px-1.5 rounded-full min-w-[16px] text-center">{notifUnread > 99 ? '99+' : notifUnread}</span>
                              )}
                            </div>
                            {notifUnread > 0 ? (
                              <button className="text-xs text-blue-600 hover:underline" onClick={markAllRead}>{t('markAll')}</button>
                            ) : <span className="text-xs text-gray-400"></span>}
                          </div>
                          <div className="max-h-96 overflow-y-auto">
                            {notifItems.length === 0 ? (
                              <div className="p-4 text-sm text-gray-500">{t('noNotifications')}</div>
                            ) : (
                              <ul className="divide-y">
                                {notifItems.map((n) => (
                                  <li key={n.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0"></div>
                                    <div className="min-w-0">
                                      <p className="text-sm text-gray-800 truncate">{n.title}</p>
                                      <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* User Info Section */}
                          <div className="px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center space-x-3">
                              <div className="w-16 h-16 rounded-full border-2 border-black overflow-hidden flex items-center justify-center bg-white">
                                <Image
                                  src={user?.avatar || '/DefaultDiceAvatar.svg'}
                                  alt={user?.username || 'User avatar'}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{user?.username}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-600">{t('level')} {userStats.level}</span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-600">{userStats.posts} {t('totalPosts')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Menu Items */}
                          <div className="py-2">
                            {/* Notifications preview */}
                            {notifItems.length > 0 && (
                              <div className="px-6 pb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">{t('notifications')}</span>
                                  {notifUnread > 0 && (
                                    <button className="text-xs text-blue-600" onClick={markAllRead}>{t('markAllRead')}</button>
                                  )}
                                </div>
                                <ul className="max-h-56 overflow-y-auto divide-y rounded-lg border border-gray-100">
                                  {notifItems.slice(0, 6).map((n) => (
                                    <li key={n.id} onMouseEnter={() => markOneRead(n.id)} className="p-3 flex items-center gap-3 bg-white hover:bg-gray-50 cursor-pointer" onClick={() => { if (n.url) window.location.href = n.url; }}>
                                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0"></div>
                                      <div className="min-w-0">
                                        <p className="text-sm text-gray-800 truncate">{n.title}</p>
                                        <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <Link href={`/profile/${user?.username}`} onClick={closeMenu} className="flex items-center space-x-3 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-all duration-200 group">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                                <Image src="/ProfileIconOn.svg" alt="Profile Icon" width={26} height={26} className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium">{t('profile')}</span>
                                <p className="text-xs text-gray-500">{t('viewProfile')}</p>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </div>
                            </Link>
                            <Link href={`/collection/${user?.username}`} onClick={closeMenu} className="flex items-center space-x-3 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-all duration-200 group">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                                <Image src="/MyCollectionIcon.svg" alt="My Collection Icon" width={26} height={26} className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium">{t('myCollection')}</span>
                                <p className="text-xs text-gray-500">{t('viewCollection')}</p>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </div>
                            </Link>
                            <button onClick={() => setShowNotificationsPanel(true)} className="w-full flex items-center space-x-3 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-all duration-200 group">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center relative">
                                <Image src="/NotificationsIcon.svg" alt="Notifications Icon" width={24} height={24} className="w-6 h-6" />
                                {isUserMenuOpen && notifUnread > 0 && (
                                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-4 px-1 rounded-full min-w-[14px] text-center">
                                    {notifUnread > 99 ? '99+' : notifUnread}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 text-left"><span className="text-sm font-medium">{t('notifications')}</span><p className="text-xs text-gray-500">{t('viewNotifications')}</p></div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></div>
                            </button>
                            <Link href="/settings" onClick={closeMenu} className="flex items-center space-x-3 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-all duration-200 group">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center"><Image src="/SettingsIcon.svg" alt="Settings Icon" width={26} height={26} className="w-6 h-6" /></div>
                              <div className="flex-1"><span className="text-sm font-medium">{t('settings')}</span><p className="text-xs text-gray-500">{t('manageAccount')}</p></div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></div>
                            </Link>
                          </div>
                        </>
                      )}
                      
                      {!showNotificationsPanel && (
                        <>
                          {/* Divider */}
                          <div className="border-t border-gray-100 my-2"></div>
                          {/* Logout Section */}
                          <div className="py-2">
                            <button 
                              className="flex items-center space-x-3 w-full px-6 py-3 text-red-600 hover:bg-red-50 transition-all duration-200 group"
                              onClick={() => { closeMenu(); logout(); }}
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                                <Image src="/SingOutIcon.svg" alt="Sign Out Icon" width={30} height={30} className="w-7 h-7 ml-2" />
                              </div>
                              <div className="flex-1 text-left">
                                <span className="text-sm font-medium">{t('signOut')}</span>
                                <p className="text-xs text-red-500">{t('logoutDescription')}</p>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : isLoading ? (
                <div className="flex items-center space-x-2 px-3 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  <span className="text-gray-600">{tCommon('loading')}...</span>
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
          
          {/* Mobile menu button - Always visible on mobile */}
          <button
            ref={mobileMenuButtonRef}
            className="md:hidden flex-shrink-0 p-2 text-dark-700 hover:text-primary-500 transition-colors z-10 ml-1"
            onClick={(e) => {
              e.stopPropagation();
              const newMenuState = !isMenuOpen;
              setIsMenuOpen(newMenuState);
              // Close chat when opening hamburger menu on mobile
              if (newMenuState) {
                closeChatOnNavigation();
              }
            }}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div 
            ref={mobileMenuRef}
            className="md:hidden py-4 border-t border-dark-200 max-h-[70vh] overflow-y-auto bg-gray-50"
            style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            data-menu-scrollable
          >
            <nav className="flex flex-col space-y-3 px-3">
              {/* Mobile Home Link */}
              <Link 
                href="/" 
                className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                onClick={handleMobileNavigation}
              >
                <Image
                  src="/HomeIcon.svg"
                  alt="Home Icon"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span className="font-medium">{t('home')}</span>
              </Link>
              
              {/* Mobile Boardgames Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-1">{t('boardGames')}</h3>
                <Link 
                  href="/all-games" 
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  onClick={handleMobileNavigation}
                >
                  <Image
                    src="/AllIcon.svg"
                    alt="All Games"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="font-medium">{t('allGames')}</span>
                </Link>
                <Link 
                  href="/hot-games" 
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  onClick={handleMobileNavigation}
                >
                  <Image
                    src="/FireIcon.svg"
                    alt="Hot Games"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="font-medium">{t('hotGames')}</span>
                </Link>
                <Link 
                  href="/top-ranked" 
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  onClick={handleMobileNavigation}
                >
                  <Image
                    src="/TrophyIcon.svg"
                    alt="Top Ranked"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="font-medium">{t('topRanked')}</span>
                </Link>
              </div>
              <Link 
                href="/forums" 
                className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                onClick={handleMobileNavigation}
              >
                <Image
                  src="/ForumsIcon.svg"
                  alt="Forums Icon"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span className="font-medium">{t('forums')}</span>
              </Link>
              <Link 
                href="/community-gallery" 
                className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                onClick={handleMobileNavigation}
              >
                <Image
                  src="/GalleryIcon.svg"
                  alt="Gallery Icon"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span className="font-medium">{t('gallery')}</span>
              </Link>
              <Link 
                href="/shop" 
                className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                onClick={handleMobileNavigation}
              >
                <img
                  src="/ShopIcon.svg?v=3"
                  alt="Shop Icon"
                  className="w-6 h-6"
                />
                <span className="font-medium">{t('shop')}</span>
              </Link>
              
              {/* Mobile Features Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-1">{t('features')}</h3>
                
                {isAuthenticated && (
                  <Link
                    href="/my-dice"
                    className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                    onClick={handleMobileNavigation}
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
                    <span className="font-medium">{t('myDice')}</span>
                  </Link>
                )}
                
                <Link
                  href="/catan-map-generator"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  onClick={handleMobileNavigation}
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
                  <span className="font-medium">{t('catanMaps')}</span>
                </Link>
                
                <Link
                  href="/pixel-canvas"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  onClick={handleMobileNavigation}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbae17' }}>
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  </div>
                  <span className="font-medium">{t('pixelCanvas')}</span>
                </Link>
                
                <Link
                  href="/boardle"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  onClick={handleMobileNavigation}
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
                  <span className="font-medium">{t('boardle')}</span>
                </Link>
                
                <Link
                  href="/dice-roller"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  onClick={handleMobileNavigation}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbae17' }}>
                    <Image
                      src="/DiceRollerIcon.svg"
                      alt="Dice Roller"
                      width={20}
                      height={20}
                      className="w-5 h-5"
                    />
                  </div>
                  <span className="font-medium">{t('diceRoller')}</span>
                </Link>
                
                <Link
                  href="/digital-corner"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                  onClick={handleMobileNavigation}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fbae17' }}>
                    <Image
                      src="/PCIcon.svg"
                      alt="Digital Corner"
                      width={20}
                      height={20}
                      className="w-5 h-5"
                    />
                  </div>
                  <span className="font-medium">{t('digitalCorner')}</span>
                </Link>
              </div>
              
              {/* Mobile Discord Button */}
              <a
                href="https://discord.gg/3xh7yUnnnW"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-3 rounded-lg transition-colors font-medium shadow-sm"
                onClick={handleMobileNavigation}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>{t('joinDiscord')}</span>
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