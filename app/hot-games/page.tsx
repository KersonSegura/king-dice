'use client';

import Image from 'next/image';
import Link from 'next/link';
import GameCardWithVote from '@/components/GameCardWithVote';
import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import { fetchJsonWithRetry } from '@/utils/fetchWithRetry';
import { useAuth } from '@/contexts/AuthContext';

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

export default function HotGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [votes, setVotes] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchHotGames = async () => {
      try {
        setLoading(true);
        const data = await fetchJsonWithRetry('/api/games/hotness?limit=50', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }, {
          maxRetries: 3,
          retryDelay: 1000,
          timeout: 15000
        });
        
        const gamesList = data.games || [];
        setGames(gamesList);
        setLoading(false); // Show games immediately
        // Votes will be loaded on-demand when users hover/click the star button
      } catch (error) {
        console.error('Error fetching hot games:', error);
        setGames([]);
        setLoading(false);
      }
    };

    fetchHotGames();
  }, [user?.id, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <BackButton />
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
                <Image 
                  src="/FireIcon.svg" 
                  alt="Fire Icon" 
                  width={48} 
                  height={48}
                  className="w-12 h-12"
                />
                Hot Games
              </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The 50 hottest games today according to BoardGameGeek.
              These games are generating the most buzz and interest right now.
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
            {games.map((game, index) => (
              <GameCardWithVote 
                key={game.id} 
                game={{ ...game, rank: index + 1 }} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p className="font-bold">No hot games available</p>
              <p>Games will be loaded soon from the database.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 