'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, User, Trophy, Star } from 'lucide-react';
import Image from 'next/image';
import CatanMapGenerator from '@/components/CatanMapGenerator';
import { useUserId } from '@/hooks/useUserId';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import BackButton from '@/components/BackButton';
import Footer from '@/components/Footer';
// import BackToTopButton from '@/components/BackToTopButton'; // Removed - using global one from layout

interface Nomination {
  id: number;
  mapData: {
    terrains: string[];
    numbers: (number | null)[];
    timestamp: string;
  };
  imageData: string;
  customRules: any;
  createdAt: string;
  votes: number;
  status: string;
  userId?: string;
  username?: string;
  avatar?: string;
}

export default function CatanMapGeneratorPage() {
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedCount, setDisplayedCount] = useState(5); // Changed from currentPage to displayedCount
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track initial load to prevent jumpiness
  const [userVotedNominations, setUserVotedNominations] = useState<Set<number>>(new Set());
  const [selectedMap, setSelectedMap] = useState<Nomination | null>(null); // Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false); // Add modal open state
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For infinite scroll loading
  const [hasMoreMaps, setHasMoreMaps] = useState(true); // Check if there are more maps to load
  const itemsPerPage = 5; // This now represents how many more to show each time
  const currentUserId = useUserId();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchNominations();
  }, [currentUserId, user, isAuthenticated]);


  const fetchNominations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/catan-nominations');
      if (response.ok) {
        const data = await response.json();
        
        if (data.nominations && data.nominations.length > 0) {
          // Nominations data available
        }
        
        setNominations(data.nominations || []);
        // Only reset infinite scroll state if not initial load
        if (!isInitialLoad) {
          setDisplayedCount(5);
          setHasMoreMaps((data.nominations || []).length > 5);
        } else {
          // On initial load, set up the state properly
          const nominationsData = data.nominations || [];
          setHasMoreMaps(nominationsData.length > 5);
          setIsInitialLoad(false);
        }
        setIsLoadingMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch nominations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (nominationId: number) => {
    if (!isAuthenticated || !user) {
      alert('Please log in to vote.');
      return;
    }

    if (!currentUserId) {
      alert('User ID not available. Please refresh the page and try again.');
      return;
    }

    const hasVoted = userVotedNominations.has(nominationId);

    try {
      // Optimistically update the UI
      setNominations(prev => prev.map(nom => 
        nom.id === nominationId 
          ? { ...nom, votes: hasVoted ? nom.votes - 1 : nom.votes + 1 }
          : nom
      ));
      
      // Also update selectedMap if it's the same nomination
      setSelectedMap(prev => prev && prev.id === nominationId 
        ? { ...prev, votes: hasVoted ? prev.votes - 1 : prev.votes + 1 }
        : prev
      );
      
      // Toggle the voted state
      setUserVotedNominations(prev => {
        const newSet = new Set(prev);
        if (hasVoted) {
          newSet.delete(nominationId);
        } else {
          newSet.add(nominationId);
        }
        return newSet;
      });

      // Send vote to API
      const response = await fetch(`/api/catan-nominations/${nominationId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) {
        // Revert optimistic update if API call fails
        setNominations(prev => prev.map(nom => 
          nom.id === nominationId 
            ? { ...nom, votes: hasVoted ? nom.votes + 1 : nom.votes - 1 }
            : nom
        ));
        
        // Also revert selectedMap if it's the same nomination
        setSelectedMap(prev => prev && prev.id === nominationId 
          ? { ...prev, votes: hasVoted ? prev.votes + 1 : prev.votes - 1 }
          : prev
        );
        
        // Revert the voted state
        setUserVotedNominations(prev => {
          const newSet = new Set(prev);
          if (hasVoted) {
            newSet.add(nominationId);
          } else {
            newSet.delete(nominationId);
          }
          return newSet;
        });
        
        throw new Error('Failed to update vote');
      }

      const result = await response.json();
      
      // Show success message
      showToast(hasVoted ? 'Vote removed successfully!' : 'Vote submitted successfully!', 'success');
    } catch (error) {
      console.error('Failed to submit vote:', error);
      showToast('Failed to submit vote. Please try again.', 'error');
    }
  };

  const handleLoadMap = (nomination: Nomination) => {
    setSelectedMap(nomination);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMap(null);
  };

  const loadMoreMaps = () => {
    if (isLoadingMore || !hasMoreMaps) return;
    
    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedCount(prev => {
        const newCount = prev + itemsPerPage;
        // Check if we've shown all available maps
        if (newCount >= nominations.length) {
          setHasMoreMaps(false);
          return nominations.length;
        }
        return newCount;
      });
      setIsLoadingMore(false);
    }, 500);
  };

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
        loadMoreMaps();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMoreMaps, nominations.length, displayedCount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header */}
        <div className="flex items-center justify-center mb-8 pt-8 sm:pt-0">
          <div className="flex items-center space-x-4 max-w-full">
            <div className="hidden sm:block">
              <BackButton />
            </div>
            <div className="text-center flex-1 min-w-0">
              <h1 className="text-4xl font-bold text-gray-900 mb-2 break-words">Catan Map Generator</h1>
              <p className="text-lg text-gray-600 break-words">
                <span className="block sm:hidden">Create and share your<br />custom Catan maps</span>
                <span className="hidden sm:block">Create and share your custom Catan maps</span>
              </p>
            </div>
          </div>
        </div>
        
        
        <CatanMapGenerator />
        
                {/* Top 10 Community Favorite Maps */}
        <div className="mt-4 sm:mt-6 bg-white rounded-lg p-8 shadow-md">
          <h2 className="text-2xl font-bold text-dark-900 mb-6 text-center flex items-center justify-center gap-2">
            <Trophy className="w-8 h-8" style={{ color: '#fbae17' }} />
            Top 10 Community Favorite Maps
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: '#fbae17' }}></div>
              <p className="mt-2 text-dark-600">Loading top maps...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {nominations.slice(0, 10).map((nomination, index) => (
                  <div 
                    key={nomination.id} 
                    className="bg-gray-50 rounded-lg p-2 border-2 border-transparent hover:border-yellow-400 transition-colors cursor-pointer relative"
                    onClick={() => handleLoadMap(nomination)}
                  >
                    {/* Ranking Badge */}
                    <div className="absolute top-2 left-2 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10" style={{ backgroundColor: '#fbae17' }}>
                      #{index + 1}
        </div>
        
                    <div className="w-full h-20 bg-white rounded mb-2 flex items-center justify-center overflow-hidden">
                      {nomination.imageData ? (
                        <img 
                          src={nomination.imageData} 
                          alt={`Catan Map ${nomination.id}`}
                          className="w-full h-full object-cover"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto'
                          }}
                        />
                      ) : (
                        <span className="text-2xl">🎲</span>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="flex justify-between items-center text-xs">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(nomination.id);
                          }}
                          title={userVotedNominations.has(nomination.id) ? 'Remove vote' : 'Add vote'}
                          className={`text-xs transition-colors ${
                            userVotedNominations.has(nomination.id)
                              ? 'text-green-600 hover:text-green-700'
                              : 'text-gray-600 hover:text-gray-700'
                          }`}
                        >
                          <ThumbsUp className={`h-4 w-4 inline-block mr-1 ${
                            userVotedNominations.has(nomination.id) ? 'fill-current' : ''
                          }`} /> {nomination.votes}
                        </button>
                        <span className="text-gray-600">
                          <User className="h-3 w-3 inline-block mr-1" />
                          {nomination.username ? (
                            nomination.username
                          ) : (
                            nomination.userId ? `User_${nomination.userId.slice(-6)}` : 'Anonymous'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                                 {/* Show centered icon if no nominations yet */}
                 {nominations.length === 0 && (
                   <div className="col-span-full flex justify-center items-center py-12">
                     <div className="text-center">
                       <img 
                         src="/CatanMapGenerator/CatanMapLoadingIcon.svg" 
                         alt="No maps available" 
                         className="w-24 h-24 opacity-60 mx-auto mb-4"
                       />
                       <p className="text-gray-500 text-lg">No maps available yet</p>
                       <p className="text-gray-400 text-sm">Be the first to create and nominate a map!</p>
                     </div>
                   </div>
                 )}
              </div>
            </>
          )}
          </div>
          
        {/* Community Nominated Maps */}
        <div className="mt-4 sm:mt-6 bg-white rounded-lg p-8 shadow-md">
                     <h2 className="text-2xl font-bold text-dark-900 mb-6 text-center flex items-center justify-center gap-2">
             <Star className="w-8 h-8" style={{ color: '#fbae17' }} />
             Community Nominated Maps
           </h2>
          <p className="text-center text-dark-600 mb-8">Discover amazing maps created and nominated by the King Dice community</p>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Skeleton loaders */}
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-gray-200 rounded-lg p-2 animate-pulse">
                  <div className="w-full h-20 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
               {/* Maps Grid - More per row */}
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {nominations.slice(0, displayedCount).map((nomination) => (
                                     <div 
                     key={nomination.id} 
                     className="bg-gray-50 rounded-lg p-2 border-2 border-transparent hover:border-yellow-400 hover:shadow-md transition-all cursor-pointer"
                     onClick={() => handleLoadMap(nomination)}
                   >
                    <div className="w-full h-20 bg-white rounded mb-2 flex items-center justify-center overflow-hidden">
                      {nomination.imageData ? (
                        <img 
                          src={nomination.imageData} 
                          alt={`Nominated Map ${nomination.id}`}
                          className="w-full h-full object-cover"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto'
                          }}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="text-2xl">🎲</span>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="flex justify-between items-center text-xs">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(nomination.id);
                          }}
                          title={userVotedNominations.has(nomination.id) ? 'Remove vote' : 'Add vote'}
                          className={`text-xs transition-colors ${
                            userVotedNominations.has(nomination.id)
                              ? 'text-green-600 hover:text-green-700'
                              : 'text-gray-700 hover:text-gray-800'
                          }`}
                        >
                          <ThumbsUp className={`h-4 w-4 inline-block mr-1 ${
                            userVotedNominations.has(nomination.id) ? 'fill-current' : ''
                          }`} /> {nomination.votes}
                        </button>
                        <span className="text-gray-600">
                          <User className="h-3 w-3 inline-block mr-1" />
                          {nomination.username ? (
                            nomination.username
                          ) : (
                            nomination.userId ? `User_${nomination.userId.slice(-6)}` : 'Anonymous'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading indicator for infinite scroll */}
                {isLoadingMore && (
                  <div className="col-span-full flex justify-center items-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Loading more maps...</span>
                    </div>
                  </div>
                )}
                
                
                {/* End of maps message */}
                {!hasMoreMaps && nominations.length > 0 && (
                  <div className="col-span-full flex justify-center py-4">
                    <span className="text-gray-500 text-sm">You've reached the end! No more maps to load.</span>
                  </div>
                )}
                
                                 {/* Show centered icon if no nominations yet */}
                 {nominations.length === 0 && (
                   <div className="col-span-full flex justify-center items-center py-12">
                     <div className="text-center">
                       <img 
                         src="/CatanMapGenerator/CatanMapLoadingIcon.svg" 
                         alt="No maps available" 
                         className="w-24 h-24 opacity-60 mx-auto mb-4"
                       />
                       <p className="text-gray-500 text-lg">No maps available yet</p>
                       <p className="text-gray-400 text-sm">Be the first to create and nominate a map!</p>
                     </div>
                   </div>
                 )}
          </div>
          
               {/* Load More Button */}
               {!isLoadingMore && hasMoreMaps && displayedCount < nominations.length && (
                 <div className="text-center mt-8">
                   <button 
                     className="px-6 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     style={{
                       backgroundColor: '#fbae17'
                     }}
                     onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#e69c0f')}
                     onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#fbae17')}
                     onClick={loadMoreMaps}
                     disabled={isLoadingMore}
                   >
                     Show More Maps
                   </button>
                 </div>
               )}
            </>
          )}
          </div>
        </div>
        
             {/* Map Modal */}
       {isModalOpen && selectedMap && (
         <div 
           className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
           onClick={closeModal}
         >
           <div 
             className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto relative"
             onClick={(e) => e.stopPropagation()}
           >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold z-10"
            >
              ×
            </button>
            
            {/* Modal Content */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-dark-900 mb-4 text-center">
                Catan Map by {selectedMap.username || (selectedMap.userId ? `User_${selectedMap.userId.slice(-6)}` : 'Anonymous')}
              </h3>
              
                             {/* Map Image */}
               <div className="flex justify-center">
                 <img
                   src={selectedMap.imageData}
                   alt={`Catan Map ${selectedMap.id}`}
                   className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                   style={{
                     width: '615px',
                     height: '532px',
                     maxWidth: '100%',
                     maxHeight: '70vh',
                     objectFit: 'contain'
                   }}
                 />
            </div>
              
              {/* Like Button with Count */}
              <div className="text-center mt-4">
                <button 
                  onClick={() => handleVote(selectedMap.id)}
                  title={userVotedNominations.has(selectedMap.id) ? 'Remove vote' : 'Add vote'}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full transition-colors mx-auto ${
                    userVotedNominations.has(selectedMap.id)
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ThumbsUp className={`h-5 w-5 ${userVotedNominations.has(selectedMap.id) ? 'fill-current' : ''}`} />
                  <span className="font-medium">
                    {selectedMap.votes} {selectedMap.votes === 1 ? 'like' : 'likes'}
                  </span>
                </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Back to Top Button */}
      {/* <BackToTopButton /> */}

      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
