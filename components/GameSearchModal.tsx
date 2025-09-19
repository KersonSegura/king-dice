'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, ExternalLink, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Game {
  id: number;
  name: string;
  nameEn: string;
  nameEs: string;
  year: number;
  image: string;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
}

interface GameSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (game: Game) => void;
  existingGameIds: number[];
}

export default function GameSearchModal({ 
  isOpen, 
  onClose, 
  onSelectGame, 
  existingGameIds 
}: GameSearchModalProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Search games from database with popularity prioritization
  const searchGames = async (query: string) => {
    if (!query.trim()) {
      setGames([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      // First, try to get popular games that match the search
      const popularResponse = await fetch(`/api/games/popular?limit=50&category=hot`);
      let popularGames: any[] = [];
      
      if (popularResponse.ok) {
        const popularData = await popularResponse.json();
        popularGames = popularData.games || [];
      }

      // Then get all matching games from the boardgames API
      const searchResponse = await fetch(`/api/boardgames?search=${encodeURIComponent(query)}&limit=50`);
      let searchResults: any[] = [];
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        searchResults = searchData.games || [];
      }

      // Create a map of popular games for quick lookup
      const popularGameIds = new Set(popularGames.map(game => game.id));
      
      // Transform and prioritize games
      const transformedGames = searchResults
        .map((game: any) => ({
          id: game.id,
          name: game.nameEn || game.name,
          nameEn: game.nameEn,
          nameEs: game.nameEs,
          year: game.yearRelease || game.year,
          image: game.imageUrl || game.image,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          durationMinutes: game.durationMinutes || game.maxPlayTime || 60,
          isPopular: popularGameIds.has(game.id),
          userRating: game.userRating || 0
        }))
        .sort((a, b) => {
          // First sort by popularity (popular games first)
          if (a.isPopular && !b.isPopular) return -1;
          if (!a.isPopular && b.isPopular) return 1;
          
          // Then sort by user rating (higher ratings first)
          if (a.userRating !== b.userRating) {
            return (b.userRating || 0) - (a.userRating || 0);
          }
          
          // Finally sort alphabetically by name
          return a.name.localeCompare(b.name);
        })
        .slice(0, 20); // Limit to 20 results
      
      setGames(transformedGames);
    } catch (error) {
      console.error('Error searching games:', error);
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGames(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelectGame = (game: Game) => {
    onSelectGame(game);
    onClose();
  };

  const isGameAlreadyAdded = (gameId: number) => {
    return existingGameIds.includes(gameId);
  };

  const formatPlayers = (min: number, max: number) => {
    if (min === max) return `${min} player${min === 1 ? '' : 's'}`;
    return `${min}-${max} players`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Add Game to Collection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for games by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fbae17] focus:border-transparent"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fbae17] mx-auto"></div>
              <p className="text-gray-500 mt-2">Searching games...</p>
            </div>
          )}

          {!isLoading && hasSearched && games.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No games found matching "{searchTerm}"</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
            </div>
          )}

          {!isLoading && !hasSearched && (
            <div className="text-center py-8">
              <p className="text-gray-500">Start typing to search for games</p>
            </div>
          )}

          {!isLoading && games.length > 0 && (
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors ${
                    isGameAlreadyAdded(game.id)
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : 'bg-white border-gray-200 hover:border-[#fbae17] hover:bg-yellow-50'
                  }`}
                >
                  {/* Game Image */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-gray-200">
                      {game.image ? (
                        <Image
                          src={game.image}
                          alt={game.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="w-8 h-8 bg-gray-300 rounded"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Game Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {game.name}
                      </h3>
                      {(game as any).isPopular && (
                        <Star className="w-4 h-4 text-[#fbae17] fill-current" title="Popular game" />
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <span>{game.year}</span>
                      <span>•</span>
                      <span>{formatPlayers(game.minPlayers, game.maxPlayers)}</span>
                      <span>•</span>
                      <span>{formatDuration(game.durationMinutes)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/juego/${game.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="View game details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    
                    {isGameAlreadyAdded(game.id) ? (
                      <span className="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded-full">
                        Already added
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelectGame(game)}
                        className="px-4 py-2 bg-[#fbae17] text-white rounded-lg hover:bg-[#fbae17]/80 transition-colors"
                      >
                        Add to Collection
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
