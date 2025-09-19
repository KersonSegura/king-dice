import Image from 'next/image';
import Link from 'next/link';
import { Star, Users, Clock, Calendar } from 'lucide-react';
import { BGGGame } from '@/lib/bgg-api';

interface GameCardProps {
  game: BGGGame;
}

export default function GameCard({ game }: GameCardProps) {
  const formatRating = (rating: string) => {
    const num = parseFloat(rating);
    return num.toFixed(1);
  };

  const formatPlayers = (min: string, max: string) => {
    if (min === max) return `${min} jugador${min === '1' ? '' : 'es'}`;
    return `${min}-${max} jugadores`;
  };

  const formatTime = (time: string) => {
    const num = parseInt(time);
    if (num < 60) return `${num} min`;
    const hours = Math.floor(num / 60);
    const minutes = num % 60;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  };

  return (
    <Link href={`/juego/${game.id}`} className="block">
      <div className="card hover:shadow-lg transition-shadow duration-200 group">
        <div className="flex space-x-4">
          {/* Game Image */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 relative rounded-lg overflow-hidden bg-gray-200">
              {game.thumbnail ? (
                <Image
                  src={game.thumbnail}
                  alt={game.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
                             ) : (
                 <div className="w-full h-full flex items-center justify-center text-gray-400">
                   <Image
                     src="/DiceLogo.svg"
                     alt="Dados"
                     width={32}
                     height={32}
                     className="w-8 h-8"
                   />
                 </div>
               )}
            </div>
          </div>

          {/* Game Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-dark-900 group-hover:text-primary-600 transition-colors truncate">
              {game.name}
            </h3>
            
            {game.yearpublished && (
              <p className="text-sm text-dark-500 mb-2">{game.yearpublished}</p>
            )}

            {/* Game Stats */}
            <div className="flex flex-wrap gap-4 text-sm text-dark-600">
              {game.minplayers && game.maxplayers && (
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{formatPlayers(game.minplayers, game.maxplayers)}</span>
                </div>
              )}
              
              {game.playingtime && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(game.playingtime)}</span>
                </div>
              )}
            </div>

            {/* Rating */}
            {game.rating?.average && (
              <div className="flex items-center space-x-1 mt-2">
                <Star className="w-4 h-4 text-primary-500 fill-current" />
                <span className="text-sm font-medium text-dark-900">
                  {formatRating(game.rating.average)}
                </span>
                <span className="text-xs text-dark-500">
                  ({game.rating.usersrated} votos)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
} 