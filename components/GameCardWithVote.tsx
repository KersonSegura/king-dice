'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Users, Clock, Calendar, Package } from 'lucide-react';
import { useState, useRef } from 'react';
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
  const [isVoting, setIsVoting] = useState(false);
  const starButtonRef = useRef<HTMLButtonElement>(null);
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

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
  const combinedRating = game.averageRating && game.userRating 
    ? ((game.averageRating * (game.numVotes || 0)) + (game.userRating * (game.userVotes || 0))) / 
      ((game.numVotes || 0) + (game.userVotes || 0))
    : game.averageRating || game.userRating || null;

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

  const handleStarClick = async () => {
    if (!isAuthenticated || !user) {
      showToast('Please sign in to vote', 'info');
      return;
    }

    if (isVoting) return;

    setIsVoting(true);
    try {
      const response = await fetch(`/api/games/${game.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: 8, // Default rating for now - could be made configurable
          userId: user.id,
        }),
      });

      if (response.ok) {
        showToast('Vote submitted successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to submit vote', 'error');
      }
    } catch (error) {
      console.error('Error voting:', error);
      showToast('Failed to submit vote', 'error');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200">
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
                ref={starButtonRef}
                className="text-white p-2 rounded transition-colors h-8 w-8 hover:opacity-90 disabled:opacity-50" 
                style={{ backgroundColor: '#fbae17' }}
                onMouseEnter={handleStarMouseEnter}
                onMouseLeave={handleStarMouseLeave}
                onClick={handleStarClick}
                disabled={isVoting}
              >
                <Star className="w-4 h-4" />
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
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                    <span>Rank #{game.bggRanking || 'N/A'} • Rating: {game.bggRating ? `${game.bggRating.toFixed(1)}/10` : 'N/A'}</span>
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