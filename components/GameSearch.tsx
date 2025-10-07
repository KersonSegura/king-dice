'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { bggAPI, BGGSearchResult } from '@/lib/bgg-api';
import Link from 'next/link';

export default function GameSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BGGSearchResult[]>([]);
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
        const searchResults = await bggAPI.searchGames(query);
        setResults(searchResults.slice(0, 10)); // Limit to 10 results
        setShowResults(true);
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
               href={`/juego/${game.id}`}
               onClick={handleResultClick}
               className="block px-4 py-3 hover:bg-dark-50 border-b border-dark-100 last:border-b-0 transition-colors"
             >
               <div className="flex justify-between items-center">
                 <div>
                   <h3 className="font-medium text-dark-900">{game.name}</h3>
                   {game.yearpublished && (
                     <p className="text-sm text-dark-500">{game.yearpublished}</p>
                   )}
                 </div>
                 <div className="text-xs text-dark-400 bg-dark-100 px-2 py-1 rounded">
                   {game.type}
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