'use client';

import { useState, useEffect } from 'react';
import GameCardWithVote from '@/components/GameCardWithVote';
import { Search, Filter, Grid, List, Star, Users, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import BackButton from '@/components/BackButton';

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

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

      const response = await fetch(`/api/games?${params}`);
      const data = await response.json();
      
      setGames(data.games || []);
      setTotalPages(Math.ceil(data.total / gamesPerPage));
      setTotalGames(data.total);
    } catch (error) {
      console.error('Error loading games:', error);
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
    <div>
      {/* Back Button - Outside gradient background */}
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={() => window.history.back()} 
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
          title="Go back"
        >
          ←
        </button>
      </div>
      
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                All Games
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Explore our complete collection of {(totalGames || 0).toLocaleString()} board games
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
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

              {/* View Mode */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-dark-400'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-dark-400'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              {/* Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Players</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPlayers}
                      onChange={(e) => handleFilterChange('minPlayers', e.target.value)}
                      className="flex-1 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPlayers}
                      onChange={(e) => handleFilterChange('maxPlayers', e.target.value)}
                      className="flex-1 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Time (min)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minTime}
                      onChange={(e) => handleFilterChange('minTime', e.target.value)}
                      className="flex-1 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxTime}
                      onChange={(e) => handleFilterChange('maxTime', e.target.value)}
                      className="flex-1 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Year</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="From"
                      value={filters.minYear}
                      onChange={(e) => handleFilterChange('minYear', e.target.value)}
                      className="flex-1 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="To"
                      value={filters.maxYear}
                      onChange={(e) => handleFilterChange('maxYear', e.target.value)}
                      className="flex-1 px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Sort by</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 border border-dark-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="name">Name</option>
                    <option value="year">Year</option>
                    <option value="ranking">Ranking</option>
                    <option value="minPlayers">Players</option>
                  </select>
                </div>

                <div className="md:col-span-2 lg:col-span-4 flex justify-end space-x-2">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-dark-600 border border-dark-200 rounded-lg hover:bg-dark-50"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Info */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-dark-600">
              Showing {games.length} of {(totalGames || 0).toLocaleString()} games
            </p>
            <p className="text-dark-600">
              Page {currentPage} of {totalPages}
            </p>
          </div>

          {/* Games Grid/List */}
          {isLoading ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="h-48 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : games.length > 0 ? (
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {games.map((game) => (
                <div key={game.id} className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer">
                  <div className="relative h-40 bg-gray-200">
                    {game.image ? (
                      <Image
                        src={game.image}
                        alt={game.name}
                        fill
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
                    {game.ranking && (
                      <div className="absolute top-2 left-2 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded">
                        #{game.ranking}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold text-dark-900 group-hover:text-primary-600 transition-colors leading-tight line-clamp-2 flex-1 mr-2">
                        {game.name}
                      </h3>
                      <span className="text-xs text-dark-500 font-medium flex-shrink-0">
                        {game.year || 'N/A'}
                      </span>
                    </div>
                    
                    {/* Additional Info */}
                    <div className="flex items-center justify-between text-xs text-dark-500">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">👥 {formatPlayers(game.minPlayers, game.maxPlayers)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">⏱️ {formatPlayTime(game.minPlayTime, game.maxPlayTime)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">📦 No expansions</span>
                      </div>
                    </div>
                  </div>
                </div>
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