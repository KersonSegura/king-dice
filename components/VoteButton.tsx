'use client';

import { useState, useRef, useEffect } from 'react';
import { Star } from 'lucide-react';

interface VoteButtonProps {
  gameId: number;
  gameName: string;
  currentRating: number | null;
  userVotes: number;
  userHasVoted: boolean;
  onVote: (rating: number) => void;
}

export default function VoteButton({ 
  gameId, 
  gameName, 
  currentRating, 
  userVotes, 
  userHasVoted, 
  onVote 
}: VoteButtonProps) {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleVoteClick = () => {
    if (userHasVoted) {
      // Mostrar mensaje de que ya votó
      alert('You have already voted for this game');
      return;
    }
    setShowRatingModal(true);
  };

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleSubmitVote = async () => {
    if (selectedRating === 0) {
      alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      await onVote(selectedRating);
      setShowRatingModal(false);
      setSelectedRating(0);
    } catch (error) {
      console.error('Error al votar:', error);
      alert('Error sending your vote. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRating = (rating: number | null) => {
    if (!rating) return 'N/A';
    return rating.toFixed(1);
  };

  const handleMouseEnter = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 40,
        left: rect.left + rect.width / 2
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      {/* Botón de votación con tooltip personalizado */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleVoteClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={userHasVoted}
          className={`
            p-1 rounded transition-colors
            ${userHasVoted 
              ? 'text-green-600 hover:text-green-700' 
              : 'text-yellow-500 hover:text-yellow-600'
            }
          `}
        >
          <Star className="w-4 h-4" fill={userHasVoted ? 'currentColor' : 'none'} />
        </button>
        
        {/* Tooltip personalizado */}
        {showTooltip && (
          <div
            ref={tooltipRef}
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
            {userHasVoted ? (
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-green-400" fill="currentColor" />
                <span>You already voted for this game</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                <span>Rating: {formatRating(currentRating)} - Click to vote</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de calificación */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Rate "{gameName}"
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                What did you think of this game?
              </p>
              
              {/* Estrellas de calificación */}
              <div className="flex justify-center space-x-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRatingSelect(rating)}
                    className={`
                      p-1 rounded transition-colors
                      ${selectedRating >= rating 
                        ? 'text-yellow-500' 
                        : 'text-gray-300 hover:text-yellow-400'
                      }
                    `}
                  >
                    <Star 
                      className="w-6 h-6" 
                      fill={selectedRating >= rating ? 'currentColor' : 'none'} 
                    />
                  </button>
                ))}
              </div>
              
              {selectedRating > 0 && (
                <p className="text-center mt-2 text-sm text-gray-600">
                  Rating: {selectedRating}/10
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitVote}
                disabled={selectedRating === 0 || isSubmitting}
                className={`
                  flex-1 px-4 py-2 text-white rounded
                  ${selectedRating === 0 || isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-500 hover:bg-primary-600'
                  }
                `}
              >
                {isSubmitting ? 'Sending...' : 'Send Vote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 