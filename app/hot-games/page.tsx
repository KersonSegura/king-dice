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
  // Initialize with 50 placeholder slots (null = loading skeleton)
  const [games, setGames] = useState<(Game | null)[]>(Array(50).fill(null));
  const [loading, setLoading] = useState(true);
  // Vote data is now loaded on-demand when users interact with star buttons
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchHotGames = async () => {
      try {
        setLoading(true);
        // Fetch first 10 games immediately
        const firstData = await fetchJsonWithRetry('/api/games/hotness?limit=10', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }, {
          maxRetries: 2,
          retryDelay: 500,
          timeout: 8000
        });
        
        const firstGamesList = firstData.games || [];
        // Update first slots with real games, keep rest as null (skeletons)
        const updatedGames = [...games];
        firstGamesList.forEach((game: Game, index: number) => {
          updatedGames[index] = game;
        });
        setGames(updatedGames);
        setLoading(false); // Show first games immediately
        
        // Load remaining games in background
        try {
          const allData = await fetchJsonWithRetry('/api/games/hotness?limit=50', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          }, {
            maxRetries: 2,
            retryDelay: 1000,
            timeout: 20000
          });
          
          const allGamesList = allData.games || [];
          // Update all slots with real games
          const finalGames = Array(50).fill(null);
          allGamesList.forEach((game: Game, index: number) => {
            if (index < 50) {
              finalGames[index] = game;
            }
          });
          setGames(finalGames);
        } catch (error) {
          console.error('Error loading more hot games:', error);
          // Keep the games we already have
        }
      } catch (error) {
        console.error('Error fetching hot games:', error);
        setLoading(false);
        // Keep skeletons showing, don't show error message
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, index) => {
            if (game === null) {
              // Show loading skeleton for empty slots
              return (
                <div key={`skeleton-${index}`} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div className="flex h-48">
                    <div className="w-2/5 bg-gray-200 animate-pulse"></div>
                    <div className="w-3/5 p-4 space-y-3">
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-2/3"></div>
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-1/3"></div>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <GameCardWithVote 
                key={game.id} 
                game={{ ...game, rank: index + 1 }}
                imagePriority={index < 10}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
} 