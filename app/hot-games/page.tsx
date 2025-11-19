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
        const data = await fetchJsonWithRetry('/api/games/hotness?limit=50', {}, {
          maxRetries: 3,
          retryDelay: 1000,
          timeout: 15000
        });
        console.log('📦 Raw API response:', { 
          gamesCount: data.games?.length, 
          total: data.total,
          firstFew: data.games?.slice(0, 3).map((g: any) => ({ id: g.id, name: g.nameEn || g.nameEs || g.name }))
        });
        
        const mappedGames = (data.games || []).map((game: any) => ({
          ...game,
          id: game.id, // Ensure ID is present
          bggId: game.bggId || game.bgg_id,
          name: game.name || game.nameEn || game.nameEs || 'Unknown Game',
          year: game.year || game.yearRelease || game.year_release,
          minPlayers: game.minPlayers || game.min_players,
          maxPlayers: game.maxPlayers || game.max_players,
          minPlayTime: game.minPlayTime || game.durationMinutes || game.duration_minutes,
          maxPlayTime: game.maxPlayTime || game.durationMinutes || game.duration_minutes,
          image: game.image || game.imageUrl || game.image_url || game.thumbnailUrl || game.thumbnail_url,
          averageRating: game.userRating || game.user_rating || game.bggRating || game.bgg_rating,
          numVotes: game.userVotes || game.user_votes || game.bggVotes || game.bgg_votes,
          ranking: game.bggRanking || game.bgg_ranking
        })).filter((g: any) => g.id); // Filter out games without IDs
        
        console.log('📊 Mapped games:', mappedGames.length, 'games with IDs');
        setGames(mappedGames);
        
        // Fetch votes in batch
        if (mappedGames.length > 0 && isAuthenticated && user?.id) {
          try {
            const gameIds = mappedGames.map((g: any) => g.id).filter((id: any) => id);
            if (gameIds.length > 0) {
              const votesData = await fetchJsonWithRetry('/api/games/votes/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameIds, userId: user.id })
              }, {
                maxRetries: 2,
                retryDelay: 500,
                timeout: 10000
              });
              console.log('✅ Batch votes fetched for hot games:', Object.keys(votesData).length);
              setVotes(votesData);
            }
          } catch (error) {
            console.error('❌ Error fetching batch votes:', error);
            // Continue without vote data - cards will fetch individually
          }
        }
      } catch (error) {
        console.error('Error fetching hot games:', error);
      } finally {
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
              <GameCardWithVote key={game.id} game={{ ...game, rank: index + 1 }} voteData={votes[game.id]} />
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