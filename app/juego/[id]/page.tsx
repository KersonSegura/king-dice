'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import LogoButton from '@/components/LogoButton';
import { bggAPI, BGGGame, BGGRules } from '@/lib/bgg-api';
import { Star, Users, Clock, Calendar, Download, FileText, ExternalLink } from 'lucide-react';
import Image from 'next/image';

export default function GameDetailPage() {
  const params = useParams();
  const gameId = params?.id as string;
  
  const [game, setGame] = useState<BGGGame | null>(null);
  const [rules, setRules] = useState<BGGRules[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGameData = async () => {
      setIsLoading(true);
      try {
        const gameData = await bggAPI.getGameDetails(gameId);
        const rulesData = await bggAPI.getRulesInSpanish(gameId);
        setGame(gameData);
        setRules(rulesData);
      } catch (error) {
        console.error('Error fetching game data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (gameId) {
      fetchGameData();
    }
  }, [gameId]);

  if (isLoading) {
    return (
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-64 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div>
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Game not found</h1>
            <p className="text-gray-600">The game you're looking for doesn't exist or is not available.</p>
          </div>
        </div>
      </div>
    );
  }

  const formatRating = (rating: string) => {
    const num = parseFloat(rating);
    return num.toFixed(1);
  };

  const formatPlayers = (min: string, max: string) => {
    if (min === max) return `${min} player${min === '1' ? '' : 's'}`;
    return `${min}-${max} players`;
  };

  const formatTime = (time: string) => {
    const num = parseInt(time);
    if (num < 60) return `${num} minutes`;
    const hours = Math.floor(num / 60);
    const minutes = num % 60;
    if (minutes === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
    return `${hours}h ${minutes}min`;
  };

  return (
    <div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Game Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {game.name}
          </h1>
          {game.yearpublished && (
            <p className="text-lg text-gray-600">{game.yearpublished}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Game Image */}
            {game.image && (
              <div className="mb-6">
                <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden">
                  <Image
                    src={game.image}
                    alt={game.name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Game Description */}
            {game.description && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
                <div 
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: game.description }}
                />
              </div>
            )}

            {/* Rules Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Rules in English</h2>
              {rules.length > 0 ? (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">{rule.title}</h3>
                          <p className="text-gray-600 mb-3">{rule.content}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                              English
                            </span>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {rule.format.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {rule.url && (
                            <a
                              href={rule.url}
                              className="btn-primary flex items-center space-x-1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </a>
                          )}
                          <button className="btn-secondary flex items-center space-x-1">
                            <FileText className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Rules not available
                  </h3>
                  <p className="text-gray-600 mb-4">
                    We don't have the rules for this game in English yet.
                  </p>
                  <LogoButton 
                    href="/solicitar-reglas" 
                    logo="/RDMLogo.svg" 
                    alt="Solicitar reglas"
                    className="btn-primary"
                    size="md"
                  >
                    Request rules
                  </LogoButton>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Game Information</h3>
              
              <div className="space-y-4">
                {game.minplayers && game.maxplayers && (
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Players</p>
                      <p className="font-medium text-gray-900">
                        {formatPlayers(game.minplayers, game.maxplayers)}
                      </p>
                    </div>
                  </div>
                )}

                {game.playingtime && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium text-gray-900">
                        {formatTime(game.playingtime)}
                      </p>
                    </div>
                  </div>
                )}

                {game.minage && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Minimum age</p>
                                              <p className="font-medium text-gray-900">{game.minage}+ years</p>
                    </div>
                  </div>
                )}

                {game.rating?.average && (
                  <div className="flex items-center space-x-3">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <div>
                      <p className="text-sm text-gray-500">Rating</p>
                      <p className="font-medium text-gray-900">
                        {formatRating(game.rating.average)}/10
                      </p>
                      <p className="text-xs text-gray-500">
                        {game.rating.usersrated} votes
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <a
                  href={`https://boardgamegeek.com/boardgame/${game.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View on BoardGameGeek</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 