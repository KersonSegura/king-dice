'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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

export default function MasVotadosPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(9);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        console.log('🔍 Fetching top ranked games...');
        const response = await fetch(`/api/games/mas-votados?limit=${currentLimit}`);
        const data = await response.json();
        console.log('📦 Received data:', data);
        setGames(data.games || []);
      } catch (error) {
        console.error('❌ Error fetching top ranked games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [currentLimit]);

  const loadMoreGames = async () => {
    try {
      setLoadingMore(true);
      const newLimit = currentLimit + 9;
      const response = await fetch(`/api/games/mas-votados?limit=${newLimit}`);
      const data = await response.json();
      setGames(data.games || []);
      setCurrentLimit(newLimit);
    } catch (error) {
      console.error('❌ Error loading more games:', error);
    } finally {
      setLoadingMore(false);
    }
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
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-900 mb-4">
            Most Voted
          </h1>
          <p className="text-xl text-dark-600 mb-8">
            Discover the board games with the best historical ranking according to the BoardGameGeek community
          </p>
          
          {games.length > 0 && (
            <p className="text-center text-dark-600">
              Showing {games.length} of the most voted games
            </p>
          )}
        </div>
      </section>

      {/* Games Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
              ))}
            </div>
          ) : games.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                         {game.averageRating && (
                       <div className="absolute top-2 left-2 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded">
                         ⭐ {game.averageRating.toFixed(1)}
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
                         <span className="text-xs">👥 {game.numVotes?.toLocaleString() || 'N/A'} votes</span>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <p className="font-bold">No games available</p>
                <p>Games will be loaded soon from the database.</p>
              </div>
            </div>
          )}

          <div className="text-center mt-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={loadMoreGames}
                disabled={loadingMore}
                className="btn-primary"
              >
                {loadingMore ? 'Loading...' : 'View More Games'}
              </button>
              <Link href="/populares" className="btn-secondary">
                View Popular
              </Link>
              <Link href="/juegos" className="btn-secondary">
                View All Games
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 