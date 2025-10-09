'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Calendar, Users, Clock } from 'lucide-react';
import Link from 'next/link';

interface Game {
  id: number;
  nameEn: string;
  nameEs: string;
  yearRelease?: number;
  minPlayers?: number;
  maxPlayers?: number;
  durationMinutes?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export default function GameSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchGames = async () => {
      if (query.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/boardgames?search=${encodeURIComponent(query)}&limit=10`);
        
        if (response.ok) {
          const data = await response.json();
          setResults(data.games || []);
          setShowResults(true);
        } else {
          console.error('Search API error:', response.status, response.statusText);
          setResults([]);
        }
      } catch (error) {
        console.error('Error searching games:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchGames, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleResultClick = () => {
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
           <Search className="h-5 w-5 text-dark-400" />
         </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a board game"
          className="input-field pl-10 pr-4 py-3 text-lg"
          onFocus={() => setShowResults(true)}
        />
                 {isLoading && (
           <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
             <Loader2 className="h-5 w-5 text-dark-400 animate-spin" />
           </div>
         )}
      </div>

             {/* Search Results Dropdown */}
       {showResults && results.length > 0 && (
         <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-dark-200 max-h-96 overflow-y-auto">
           {results.map((game) => (
             <Link
               key={game.id}
               href={`/game/${game.id}`}
               onClick={handleResultClick}
               className="block px-4 py-3 hover:bg-dark-50 border-b border-dark-100 last:border-b-0 transition-colors"
             >
               <div className="flex items-center space-x-3">
                 {(game.imageUrl || game.thumbnailUrl) && (
                   <img
                     src={game.imageUrl || game.thumbnailUrl}
                     alt={game.nameEn}
                     className="w-12 h-12 object-cover rounded"
                   />
                 )}
                 <div className="flex-1">
                   <div className="text-left">
                     <h3 className="font-medium text-dark-900">{game.nameEn}</h3>
                     {game.nameEs && game.nameEs !== game.nameEn && (
                       <p className="text-sm text-dark-600">{game.nameEs}</p>
                     )}
                   </div>
                   <div className="flex items-center space-x-4 mt-2">
                     {game.yearRelease && (
                       <div className="flex items-center space-x-1 text-xs text-dark-500">
                         <Calendar className="w-3 h-3" />
                         <span>{game.yearRelease}</span>
                       </div>
                     )}
                     {game.minPlayers && game.maxPlayers && (
                       <div className="flex items-center space-x-1 text-xs text-dark-500">
                         <Users className="w-3 h-3" />
                         <span>
                           {game.minPlayers === game.maxPlayers 
                             ? `${game.minPlayers} player${game.minPlayers !== 1 ? 's' : ''}`
                             : `${game.minPlayers}-${game.maxPlayers} players`
                           }
                         </span>
                       </div>
                     )}
                     {game.durationMinutes && (
                       <div className="flex items-center space-x-1 text-xs text-dark-500">
                         <Clock className="w-3 h-3" />
                         <span>
                           {game.durationMinutes < 60 
                             ? `${game.durationMinutes}min`
                             : `${Math.round(game.durationMinutes / 60)}h ${game.durationMinutes % 60 || ''}`
                           }
                         </span>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             </Link>
           ))}
         </div>
       )}

       {/* No Results */}
       {showResults && query.length >= 2 && !isLoading && results.length === 0 && (
         <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-dark-200 p-4">
           <p className="text-dark-500 text-center">No games found with "{query}"</p>
         </div>
       )}
    </div>
  );
} 