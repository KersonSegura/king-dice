'use client';

import Image from 'next/image';
import Link from 'next/link';
import GameCardWithVote from '@/components/GameCardWithVote';
import { useState, useEffect } from 'react';
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

export default function TopRankedPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopRankedGames = async () => {
      try {
        const response = await fetch('/api/games/ranked?limit=50');
        const data = await response.json();
        setGames(data.games || []);
      } catch (error) {
        console.error('Error fetching top ranked games:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopRankedGames();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <BackButton />
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
                <Image 
                  src="/TrophyIcon.svg" 
                  alt="Trophy Icon" 
                  width={48} 
                  height={48}
                  className="w-12 h-12"
                />
                Top Ranked Games
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                The highest-rated board games of all time. 
                These games have earned their place at the top through exceptional gameplay and design.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-48"></div>
            ))}
          </div>
        ) : games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <GameCardWithVote key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p className="font-bold">No top ranked games available</p>
              <p>Games will be loaded soon from the database.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 