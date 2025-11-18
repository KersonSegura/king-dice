'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Users, Clock, Calendar, Package, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface Game {
  id: number;
  bggId: number;
  name: string;
  year: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlayTime: number | null;
  maxPlayTime: number | null;
  image: string | null;
  ranking: number | null;
  averageRating: number | null;
  numVotes: number | null;
  userRating?: number | null;
  userVotes?: number;
  bggRanking?: number | null;
  bggRating?: number | null;
  bggVotes?: number | null;
  expansions?: number | null;
  isExpansion?: boolean;
  rank?: number; // For ranking badge
}

interface GameCardWithVoteProps {
  game: Game;
}

export default function GameCardWithVote({ game }: GameCardWithVoteProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [selectedStars, setSelectedStars] = useState(0);
  const [existingUserRatingStars, setExistingUserRatingStars] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [localUserRating, setLocalUserRating] = useState<number | null>(game.userRating ?? null);
  const [localUserVotes, setLocalUserVotes] = useState<number>(game.userVotes ?? 0);
  const [modalError, setModalError] = useState<string | null>(null);
  const [hasUserVoted, setHasUserVoted] = useState<boolean>(false);
  const [userVoteStars, setUserVoteStars] = useState<number | null>(null);
  const starButtonRef = useRef<HTMLButtonElement>(null);
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    setLocalUserRating(game.userRating ?? null);
    setLocalUserVotes(game.userVotes ?? 0);
  }, [game.id, game.userRating, game.userVotes]);

  // Check if user has voted when component mounts or user changes
  useEffect(() => {
    const checkUserVote = async () => {
      if (!isAuthenticated || !user?.id) {
        setHasUserVoted(false);
        setUserVoteStars(null);
        return;
      }

      try {
        const response = await fetch(`/api/games/${game.id}/vote?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setHasUserVoted(data.hasVoted || false);
          setUserVoteStars(data.userRatingStars || null);
        }
      } catch (error) {
        // Silently fail - we'll check when modal opens
        console.error('Error checking user vote:', error);
      }
    };

    checkUserVote();
  }, [game.id, user?.id, isAuthenticated]);

  useEffect(() => {
    console.log('Modal state changed:', isRatingModalOpen);
  }, [isRatingModalOpen]);

  useEffect(() => {
    if (!isRatingModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRatingModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRatingModalOpen]);

  const formatRating = (rating: number | null) => {
    if (!rating) return 'N/A';
    return rating.toFixed(1);
  };

  const formatPlayers = (min: number | null, max: number | null) => {
    if (!min || !max) return 'N/A';
    return min === max ? `${min}` : `${min}-${max}`;
  };

  const formatPlayTime = (min: number | null, max: number | null) => {
    if (!min || !max) return 'N/A';
    return min === max ? `${min} min` : `${min}-${max} min`;
  };

  // Calculate combined rating (BGG + users)
  // Convert BGG rating (1-10 scale) and user rating (1-10 scale) to combined average
  const combinedRating = game.bggRating && localUserRating 
    ? ((game.bggRating * (game.bggVotes || 0)) + (localUserRating * (localUserVotes || 0))) / 
      ((game.bggVotes || 0) + (localUserVotes || 0))
    : game.bggRating || (localUserRating ? localUserRating : null);

  const communityRatingStars = localUserRating ? localUserRating / 2 : null;

  const closeRatingModal = () => {
    setIsRatingModalOpen(false);
    setHoveredRating(null);
    if (existingUserRatingStars) {
      setSelectedStars(existingUserRatingStars);
    } else {
      setSelectedStars(0);
    }
  };

  const openRatingModal = async () => {
    console.log('Opening rating modal for game:', game.id);
    setIsRatingModalOpen(true);
    setModalLoading(true);
    setModalError(null);

    const queryParam = user ? `?userId=${user.id}` : '';

    try {
      const response = await fetch(`/api/games/${game.id}/vote${queryParam}`);
      
      // If the request fails, don't show an error - just continue without previous vote data
      if (!response.ok) {
        console.warn('Could not load previous vote data, continuing without it');
        setExistingUserRatingStars(null);
        setSelectedStars(0);
        setModalLoading(false);
        return;
      }

      const data = await response.json();
      const previousRating =
        typeof data.userRatingStars === 'number' ? data.userRatingStars : null;
      setExistingUserRatingStars(previousRating);
      setSelectedStars(previousRating ?? 0);
      
      // Track if user has voted
      setHasUserVoted(data.hasVoted || false);
      setUserVoteStars(previousRating);

      if (typeof data.averageUserRatingRaw === 'number') {
        setLocalUserRating(data.averageUserRatingRaw);
      }

      if (typeof data.totalVotes === 'number') {
        setLocalUserVotes(data.totalVotes);
      }
    } catch (error) {
      // Only log the error, don't show it to the user if it's just a network issue
      console.error('Error loading rating modal data:', error);
      // Silently continue - user can still rate even if we couldn't load previous data
      setExistingUserRatingStars(null);
      setSelectedStars(0);
    } finally {
      setModalLoading(false);
    }
  };

  const submitRating = async () => {
    console.log('submitRating called with selectedStars:', selectedStars);
    
    if (!selectedStars || selectedStars < 0.5 || selectedStars > 5.0) {
      console.warn('Invalid rating selected:', selectedStars);
      showToast('Please select a star rating to vote', 'info');
      return;
    }

    if (!isAuthenticated || !user) {
      showToast('Please sign in to vote', 'info');
      return;
    }
    
    if (!user.id) {
      console.error('User ID is missing');
      showToast('User authentication error. Please try again.', 'error');
      return;
    }

    setIsSubmittingVote(true);
    setModalError(null);

    try {
      const response = await fetch(`/api/games/${game.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: selectedStars,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        // Try to parse error response, but handle cases where it's not JSON
        let errorMessage = 'An unexpected error occurred. Please try again later.';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.error || errorMessage;
          } else {
            // If response is HTML (like an error page), use generic message
            errorMessage = 'An unexpected error occurred. Please try again later.';
          }
        } catch (parseError) {
          // If we can't parse the error, use generic message
          errorMessage = 'An unexpected error occurred. Please try again later.';
        }
        throw new Error(errorMessage);
      }

      // Parse JSON response, handle errors gracefully
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        // If response is not valid JSON (e.g., HTML error page), throw user-friendly error
        throw new Error('An unexpected error occurred. Please try again later.');
      }

      setLocalUserRating(result.userRating ?? localUserRating);
      setLocalUserVotes(result.userVotes ?? localUserVotes);
      setExistingUserRatingStars(selectedStars);
      setHasUserVoted(true);
      setUserVoteStars(selectedStars);
      const successMessage = result.message || (result.isNewVote ? 'Thanks for your vote!' : 'Rating updated!');
      showToast(successMessage, 'success');
      closeRatingModal();
    } catch (error) {
      console.error('Error voting:', error);
      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Show user-friendly error message
      const userFriendlyMessage = error instanceof Error 
        ? (error.message.includes('Unexpected token') || error.message.includes('<!DOCTYPE')
          ? 'An unexpected error occurred. Please try again later.'
          : error.message.includes('Database error')
          ? 'Database connection issue. Please try again later.'
          : error.message)
        : 'An unexpected error occurred. Please try again later.';
      setModalError(userFriendlyMessage);
      showToast('Failed to submit vote', 'error');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleStarMouseEnter = () => {
    if (starButtonRef.current) {
      const rect = starButtonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 40,
        left: rect.left + rect.width / 2
      });
    }
    setShowTooltip(true);
  };

  const handleStarMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Star button clicked, opening modal...');
    openRatingModal();
  };

  const getDisplayRating = () => {
    if (hoveredRating !== null) return hoveredRating;
    return selectedStars;
  };

  const displayRating = getDisplayRating();

  const handleRatingStarClick = (starIndex: number, isLeftHalf: boolean) => {
    const rating = starIndex + (isLeftHalf ? 0.5 : 1.0);
    setSelectedStars(rating);
    setHoveredRating(null);
  };

  const handleStarHover = (starIndex: number, isLeftHalf: boolean) => {
    const rating = starIndex + (isLeftHalf ? 0.5 : 1.0);
    setHoveredRating(rating);
  };

  const starButtons = (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const fullRating = starIndex + 1;
          const halfRating = starIndex + 0.5;
          const isHalfFilled = displayRating >= halfRating && displayRating < fullRating;
          const isFilled = displayRating >= fullRating;
          
          return (
            <div
              key={starIndex}
              className="relative cursor-pointer"
              onMouseLeave={() => setHoveredRating(null)}
            >
              <div className="relative w-10 h-10">
                {/* Left half (0.5) */}
                <div
                  className="absolute left-0 top-0 w-1/2 h-full z-10"
                  onMouseEnter={() => handleStarHover(starIndex, true)}
                  onClick={() => handleRatingStarClick(starIndex, true)}
                  title={`${halfRating} stars`}
                />
                {/* Right half (1.0) */}
                <div
                  className="absolute right-0 top-0 w-1/2 h-full z-10"
                  onMouseEnter={() => handleStarHover(starIndex, false)}
                  onClick={() => handleRatingStarClick(starIndex, false)}
                  title={`${fullRating} star${fullRating === 1 ? '' : 's'}`}
                />
                {/* Star icon */}
                <div className="relative w-full h-full">
                  {/* Background star (always visible) */}
                  <Star
                    className="w-10 h-10 absolute"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth={2}
                  />
                  {/* Filled portion */}
                  {isFilled ? (
                    <Star
                      className="w-10 h-10 absolute"
                      fill="#fbae17"
                      stroke="#fbae17"
                      strokeWidth={2}
                    />
                  ) : isHalfFilled ? (
                    <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                      <Star
                        className="w-10 h-10"
                        fill="#fbae17"
                        stroke="#fbae17"
                        strokeWidth={2}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center mt-2">
        <p className="text-sm font-medium text-gray-700">
          {displayRating > 0 ? `${displayRating.toFixed(1)} / 5.0` : 'Select your rating'}
        </p>
      </div>
    </div>
  );

  const ratingModal = !isRatingModalOpen ? null : (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={closeRatingModal}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
          onClick={closeRatingModal}
          aria-label="Close rating modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Rate {game.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {existingUserRatingStars 
              ? `Your current rating: ${existingUserRatingStars.toFixed(1)}/5. You can change it.`
              : 'Share your rating with the community'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Overall Rating</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">
            {combinedRating ? `${combinedRating.toFixed(1)}/10` : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            {((game.bggVotes || 0) + (localUserVotes || 0)) > 0 
              ? `${((game.bggVotes || 0) + (localUserVotes || 0)).toLocaleString()} vote${((game.bggVotes || 0) + (localUserVotes || 0)) === 1 ? '' : 's'}`
              : 'No votes yet'}
          </p>
        </div>

        {modalLoading ? (
          <div className="py-8 text-center text-gray-500">Loading…</div>
        ) : (
          <>
            {starButtons}
            {!isAuthenticated && (
              <p className="text-sm text-gray-500 text-center">
                Sign in to save your rating.
              </p>
            )}
            {modalError && <p className="text-sm text-red-500 text-center">{modalError}</p>}
            <button
              type="button"
              onClick={submitRating}
              disabled={isSubmittingVote || !isAuthenticated || !selectedStars}
              className="mt-4 w-full rounded-xl bg-[#fbae17] py-3 text-white font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {isSubmittingVote 
                ? 'Saving...' 
                : selectedStars 
                  ? `${existingUserRatingStars ? 'Update' : 'Submit'} ${selectedStars.toFixed(1)} ★` 
                  : 'Select a star'}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200">
      {ratingModal}
      <div className="flex h-48">
        {/* Left Section - Game Image (40% width) */}
        <div className="relative w-2/5 bg-gray-200 overflow-hidden">
          {/* Ranking Badge */}
          {game.rank && (
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-[#fbae17] text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
                #{game.rank}
              </div>
            </div>
          )}
          
          {game.image ? (
            <Image
              src={game.image}
              alt={game.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image
                src="/DiceLogo.svg"
                alt="Dados"
                width={48}
                height={48}
                className="opacity-50"
              />
            </div>
          )}
        </div>
        
        {/* Right Section - Game Information (60% width) */}
        <div className="w-3/5 bg-white p-4 flex flex-col justify-between relative">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
              {game.name}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{formatPlayers(game.minPlayers, game.maxPlayers)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatPlayTime(game.minPlayTime, game.maxPlayTime)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{game.year || 'N/A'}</span>
              </div>
              {game.isExpansion && (
                <div className="flex items-center space-x-1 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                  <Package className="w-3 h-3" />
                  <span>Expansion</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Link href={`/game/${game.id}`} className="flex-1 text-white text-sm font-medium p-2 rounded transition-colors flex items-center justify-center h-8 hover:opacity-90" style={{ backgroundColor: '#fbae17' }}>
              {game.ranking ? `#${game.ranking}` : 'See More'}
            </Link>
            <div className="relative">
              <button 
                type="button"
                ref={starButtonRef}
                className={`p-2 rounded transition-colors h-8 w-8 hover:opacity-90 flex items-center justify-center ${
                  hasUserVoted 
                    ? 'bg-white border-2 border-[#fbae17]' 
                    : 'text-white'
                }`}
                style={hasUserVoted ? {} : { backgroundColor: '#fbae17' }}
                onMouseEnter={handleStarMouseEnter}
                onMouseLeave={handleStarMouseLeave}
                onClick={handleStarClick}
                title={hasUserVoted ? `You voted ${userVoteStars?.toFixed(1)}/5 stars` : 'Rate this game'}
              >
                <Star 
                  className={`w-4 h-4 ${hasUserVoted ? 'text-[#fbae17] fill-[#fbae17]' : 'text-white'}`} 
                  fill={hasUserVoted ? 'currentColor' : 'none'}
                />
              </button>
              
              {/* Tooltip for star button */}
              {showTooltip && (
                <div
                  className="
                    fixed px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg
                    pointer-events-none z-[9999] whitespace-nowrap
                    before:content-[''] before:absolute before:top-full before:left-1/2 
                    before:transform before:-translate-x-1/2 before:border-4 
                    before:border-transparent before:border-t-gray-900
                  "
                  style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                      <span>Rank #{game.bggRanking || 'N/A'} • Rating: {game.bggRating ? `${game.bggRating.toFixed(1)}/10` : 'N/A'}</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      {localUserVotes > 0 ? (
                        <span>Community: {localUserVotes} vote{localUserVotes === 1 ? '' : 's'} • Avg: {localUserRating ? (localUserRating / 2).toFixed(1) : '0'}/5</span>
                      ) : (
                        <span>No community votes yet</span>
                      )}
                    </div>
                    {hasUserVoted && userVoteStars && (
                      <div className="text-xs text-green-300">
                        Your vote: {userVoteStars.toFixed(1)}/5 ⭐
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 