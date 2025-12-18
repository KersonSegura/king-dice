'use client';

import { useState, useEffect } from 'react';
import GameCardWithVote from '@/components/GameCardWithVote';
import { Search, Filter, Star, Users, Clock, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { fetchJsonWithRetry } from '@/utils/fetchWithRetry';

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
  expansions?: number | null;
}

interface GameFilters {
  query: string;
  minPlayers: string;
  maxPlayers: string;
  minTime: string;
  maxTime: string;
  minYear: string;
  maxYear: string;
  sortBy: string;
}

export default function AllGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalGames, setTotalGames] = useState(0);
  const [filters, setFilters] = useState<GameFilters>({
    query: '',
    minPlayers: '',
    maxPlayers: '',
    minTime: '',
    maxTime: '',
    minYear: '',
    maxYear: '',
    sortBy: 'name'
  });

  const gamesPerPage = 24;

  useEffect(() => {
    loadGames();
  }, [currentPage, filters]);

  const loadGames = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: gamesPerPage.toString(),
        sortBy: filters.sortBy,
        ...(filters.query && { search: filters.query }),
        ...(filters.minPlayers && { minPlayers: filters.minPlayers }),
        ...(filters.maxPlayers && { maxPlayers: filters.maxPlayers }),
        ...(filters.minTime && { minPlayTime: filters.minTime }),
        ...(filters.maxTime && { maxPlayTime: filters.maxTime }),
        ...(filters.minYear && { minYear: filters.minYear }),
        ...(filters.maxYear && { maxYear: filters.maxYear })
      });

      const data = await fetchJsonWithRetry(`/api/games?${params}`, {}, {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 15000
      });
      
      setGames(data.games || []);
      setTotalPages(Math.ceil((data.total || 0) / gamesPerPage));
      setTotalGames(data.total || 0);
    } catch (error) {
      console.error('Error loading games:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load games. Please try again.';
      setError(errorMessage);
      setGames([]);
      setTotalPages(1);
      setTotalGames(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof GameFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadGames();
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      minPlayers: '',
      maxPlayers: '',
      minTime: '',
      maxTime: '',
      minYear: '',
      maxYear: '',
      sortBy: 'name'
    });
    setCurrentPage(1);
  };

  const formatPlayers = (min: number | null, max: number | null) => {
    if (!min || !max) return 'N/A';
    return min === max ? `${min}` : `${min}-${max}`;
  };

  const formatPlayTime = (min: number | null, max: number | null) => {
    if (!min || !max) return 'N/A';
    return min === max ? `${min} min` : `${min}-${max} min`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Games
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-dark-900 mb-4">
            All Games
          </h1>
          <p className="text-xl text-dark-600 max-w-3xl mx-auto">
            Explore our complete collection of {(totalGames || 0).toLocaleString()} board games
          </p>
        </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-row gap-4 items-center">
              {/* Search */}
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search games..."
                    value={filters.query}
                    onChange={(e) => handleFilterChange('query', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center sm:space-x-2 px-3 sm:px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap flex-shrink-0"
                aria-label="Filters"
              >
                <Filter className="w-5 h-5" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-dark-700 mb-1">Players</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPlayers}
                        onChange={(e) => handleFilterChange('minPlayers', e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPlayers}
                        onChange={(e) => handleFilterChange('maxPlayers', e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-medium text-dark-700 mb-1">Time (min)</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minTime}
                        onChange={(e) => handleFilterChange('minTime', e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxTime}
                        onChange={(e) => handleFilterChange('maxTime', e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-medium text-dark-700 mb-1">Year</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        placeholder="From"
                        value={filters.minYear}
                        onChange={(e) => handleFilterChange('minYear', e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="To"
                        value={filters.maxYear}
                        onChange={(e) => handleFilterChange('maxYear', e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="block text-sm font-medium text-dark-700 mb-1">Sort by</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="w-full px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="name">Name</option>
                      <option value="year">Year</option>
                      <option value="ranking">Ranking</option>
                      <option value="minPlayers">Players</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-dark-600 border border-dark-200 rounded-lg hover:bg-dark-50 transition-colors text-sm"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline font-bold">Error loading games:</span>
              <span className="block sm:inline ml-0 sm:ml-2">{error}</span>
              <button
                onClick={loadGames}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Results Info */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-dark-600">
              Showing {games.length} of {(totalGames || 0).toLocaleString()} games
            </p>
            <p className="text-dark-600">
              Page {currentPage} of {totalPages}
            </p>
          </div>

          {/* Games Grid */}
          {isLoading ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="h-48 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : games.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => (
                <GameCardWithVote key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <p className="font-bold">No games found</p>
                <p>Try adjusting the search filters.</p>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-dark-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-50"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg ${
                        page === currentPage
                          ? 'bg-primary-500 text-white'
                          : 'border border-dark-200 hover:bg-dark-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-dark-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 