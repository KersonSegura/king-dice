'use client';

import { useState, useEffect } from 'react';
import GameCardWithVote from '@/components/GameCardWithVote';
import { Trophy, Info, Filter } from 'lucide-react';

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

export default function PopularesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopularGames = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/games/popular?limit=50');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setGames(data.games || []);
        }
      } catch (err) {
        setError('Error al cargar los juegos populares');
        console.error('Error fetching popular games:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularGames();
  }, []);

  const formatPlayers = (min: number | null, max: number | null) => {
    if (!min || !max) return 'N/A';
    return min === max ? `${min}` : `${min}-${max}`;
  };

  const formatPlayTime = (min: number | null, max: number | null) => {
    if (!min || !max) return 'N/A';
    return min === max ? `${min} min` : `${min}-${max} min`;
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  if (loading) {
    return (
      <div>
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-300 rounded w-64 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-96 mx-auto"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="h-48 bg-gray-300 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-primary-500 mr-3" />
              <h1 className="text-4xl font-bold text-dark-900">
                Popular Games
              </h1>
            </div>
            <p className="text-xl text-dark-600 max-w-3xl mx-auto">
              The most popular and searched games by our community, 
              based on BoardGameGeek ranking.
            </p>
          </div>

          {/* Info Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-start space-x-3">
              <Info className="w-6 h-6 text-primary-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-dark-900 mb-2">
                  How is popularity calculated?
                </h3>
                <p className="text-dark-600 mb-3">
                  Popular games are based on BoardGameGeek ranking, 
                  which considers factors such as:
                </p>
                <ul className="text-dark-600 space-y-1">
                  <li>• Number of votes and ratings</li>
                  <li>• Community activity</li>
                  <li>• Current trends</li>
                  <li>• New releases and expansions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Games Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {games.map((game) => (
              <GameCardWithVote key={game.id} game={game} />
            ))}
          </div>

          {/* Stats */}
          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-dark-900 mb-4">
                Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-primary-500">
                    {games.length}
                  </div>
                  <div className="text-dark-600">Popular Games</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-500">
                    {games.filter(g => g.year && g.year >= 2020).length}
                  </div>
                  <div className="text-dark-600">Modern Games</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-500">
                    {games.filter(g => g.ranking && g.ranking <= 10).length}
                  </div>
                  <div className="text-dark-600">Top 10</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 