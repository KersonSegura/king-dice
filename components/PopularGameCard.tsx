'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { bggAPI } from '@/lib/bgg-api';

interface PopularGameCardProps {
  gameId: string;
  name: string;
  players: string;
  duration: string;
}

export default function PopularGameCard({ gameId, name, players, duration }: PopularGameCardProps) {
  const [gameImage, setGameImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGameImage = async () => {
      try {
        const gameData = await bggAPI.getGameDetails(gameId);
        if (gameData?.thumbnail) {
          setGameImage(gameData.thumbnail);
        }
      } catch (error) {
        console.error('Error fetching game image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameImage();
  }, [gameId]);

  return (
    <Link href={`/juego/${gameId}`} className="block">
      <div className="card hover:shadow-lg transition-shadow">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-gray-200">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
            ) : gameImage ? (
              <Image
                src={gameImage}
                alt={name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
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
          <div>
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{players} • {duration}</p>
          </div>
        </div>
      </div>
    </Link>
  );
} 