import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Normalize text for search: handle "&" vs "and", remove punctuation, normalize spaces, lowercase
function normalizeForSearch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ') // Treat "&" as "and" so queries match either form
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const minPlayers = searchParams.get('minPlayers');
    const maxPlayers = searchParams.get('maxPlayers');
    const minPlayTime = searchParams.get('minPlayTime');
    const maxPlayTime = searchParams.get('maxPlayTime');
    const minYear = searchParams.get('minYear');
    const maxYear = searchParams.get('maxYear');
    
    const offset = (page - 1) * limit;

    console.log('[GAMES API] Request params:', { page, limit, search, sortBy, offset });

    let gamesData: any[] = [];
    let totalCount: number | null = null;
    let error: any = null;

    // If search is provided, use improved word-based search with normalization
    if (search) {
      console.log('[GAMES API] Using improved search for:', search);
      
      // Normalize search query for better matching (removes punctuation)
      const normalizedSearch = normalizeForSearch(search);
      console.log('[GAMES API] Normalized search:', normalizedSearch);
      
      // Split normalized search into words for better matching
      const normalizedWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
      console.log('[GAMES API] Normalized words:', normalizedWords);
      
      // Fetch a broader set of games, then filter in JavaScript for better punctuation handling
      // Strategy: Fetch games that contain any of the search words, then filter/score in JavaScript
      const searchLimit = Math.max(limit * 5, 200); // Fetch more to filter in JavaScript
      
      if (normalizedWords.length > 0) {
        // Build query to find games containing any of the normalized words
        // This will catch games like "Catan: Seafarers" when searching for "Catan Seafarers"
        const wordQueries = normalizedWords.map(word => `nameEn.ilike.%${word}%`);
        
        // Build base query with other filters first
        let baseQuery = supabaseAdmin.from('games').select('*', { count: 'exact' });
        
        // Apply other filters before search
        if (minPlayers) {
          baseQuery = baseQuery.gte('minPlayers', parseInt(minPlayers));
        }
        if (maxPlayers) {
          baseQuery = baseQuery.lte('maxPlayers', parseInt(maxPlayers));
        }
        if (minPlayTime) {
          baseQuery = baseQuery.gte('durationMinutes', parseInt(minPlayTime));
        }
        if (maxPlayTime) {
          baseQuery = baseQuery.lte('durationMinutes', parseInt(maxPlayTime));
        }
        if (minYear) {
          baseQuery = baseQuery.gte('yearRelease', parseInt(minYear));
        }
        if (maxYear) {
          baseQuery = baseQuery.lte('yearRelease', parseInt(maxYear));
        }
        
        // Try searching with nameEn first
        const result1 = baseQuery
          .or(wordQueries.join(','))
          .limit(searchLimit);
        
        const queryResult1 = await result1;
        gamesData = queryResult1.data || [];
        error = queryResult1.error;
        
        // If that didn't work or returned few results, also try name (legacy field)
        if (error || gamesData.length < normalizedWords.length) {
          const wordQueriesName = normalizedWords.map(word => `name.ilike.%${word}%`);
          const result2 = baseQuery
            .or(wordQueriesName.join(','))
            .limit(searchLimit);
          
          const queryResult2 = await result2;
          if (!queryResult2.error && queryResult2.data) {
            // Merge results, avoiding duplicates
            const existingIds = new Set(gamesData.map((g: any) => g.id));
            const additionalGames = (queryResult2.data || []).filter((g: any) => !existingIds.has(g.id));
            gamesData = [...gamesData, ...additionalGames];
            if (error) error = null;
          }
        }
        
        // Also try the original search query as a fallback
        const originalPattern = `%${search}%`;
        const result3 = baseQuery
          .ilike('nameEn', originalPattern)
          .limit(searchLimit);
        
        const queryResult3 = await result3;
        if (!queryResult3.error && queryResult3.data) {
          // Merge results, avoiding duplicates
          const existingIds = new Set(gamesData.map((g: any) => g.id));
          const additionalGames = (queryResult3.data || []).filter((g: any) => !existingIds.has(g.id));
          gamesData = [...gamesData, ...additionalGames];
        }
      } else {
        // Fallback: use original search pattern if normalization produced no words
        let baseQuery = supabaseAdmin.from('games').select('*', { count: 'exact' });
        
        // Apply other filters
        if (minPlayers) {
          baseQuery = baseQuery.gte('minPlayers', parseInt(minPlayers));
        }
        if (maxPlayers) {
          baseQuery = baseQuery.lte('maxPlayers', parseInt(maxPlayers));
        }
        if (minPlayTime) {
          baseQuery = baseQuery.gte('durationMinutes', parseInt(minPlayTime));
        }
        if (maxPlayTime) {
          baseQuery = baseQuery.lte('durationMinutes', parseInt(maxPlayTime));
        }
        if (minYear) {
          baseQuery = baseQuery.gte('yearRelease', parseInt(minYear));
        }
        if (maxYear) {
          baseQuery = baseQuery.lte('yearRelease', parseInt(maxYear));
        }
        
        const searchPattern = `%${search}%`;
        const result1 = baseQuery
          .ilike('nameEn', searchPattern)
          .limit(searchLimit);
        
        const queryResult1 = await result1;
        gamesData = queryResult1.data || [];
        error = queryResult1.error;
      }

      // Filter results in JavaScript using normalized comparison for better matching
      // Only keep games that contain ALL normalized search words
      if (normalizedWords.length > 0 && gamesData.length > 0) {
        // Score games based on normalized matching
        const scoredGames = gamesData.map((game: any) => {
          const gameNameEn = game.nameEn || game.name_en || game.name || '';
          const normalizedGameName = normalizeForSearch(gameNameEn);
          
          // Check if all normalized words are present in the game name
          const allWordsMatch = normalizedWords.every(word => normalizedGameName.includes(word));
          
          // If not all words match, skip this game
          if (!allWordsMatch) {
            return { game, score: 0 };
          }
          
          // Calculate match score
          let score = 0;
          
          // Normalized exact match (highest priority - handles punctuation differences)
          if (normalizedGameName === normalizedSearch) score += 1000;
          
          // Exact match (case-insensitive) - high priority
          const gameNameLower = gameNameEn.toLowerCase();
          const searchLower = search.toLowerCase().trim();
          if (gameNameLower === searchLower) score += 900;
          
          // Exact match with case match - bonus
          if (gameNameEn === search) score += 100;
          
          // Normalized starts with - handles punctuation
          if (normalizedGameName.startsWith(normalizedSearch)) score += 500;
          
          // Starts with search term (original)
          if (gameNameLower.startsWith(searchLower)) score += 50;
          
          // All words appear in order (bonus for word order matching)
          const normalizedWordsInOrder = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
          let wordsInOrder = true;
          let lastIndex = -1;
          for (const word of normalizedWordsInOrder) {
            const index = normalizedGameName.indexOf(word, lastIndex + 1);
            if (index === -1) {
              wordsInOrder = false;
              break;
            }
            lastIndex = index;
          }
          if (wordsInOrder) score += 200;
          
          // Normalized contains - handles punctuation
          if (normalizedGameName.includes(normalizedSearch)) score += 100;
          
          // Word boundary match (whole word match)
          const wordMatchA = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(gameNameLower);
          if (wordMatchA) score += 30;
          
          // Contains search term (original)
          if (gameNameLower.includes(searchLower)) score += 10;
          
          // Shorter names get bonus (base games are usually shorter)
          score += (100 - Math.min(gameNameEn.length, 100)) / 10;
          
          return { game, score };
        })
        .filter((item: any) => item.score > 0) // Only keep games with some match
        .sort((a: any, b: any) => {
          if (b.score !== a.score) {
            return b.score - a.score; // Higher score first
          }
          // If scores are equal, sort alphabetically
          const nameA = (a.game.nameEn || a.game.name_en || a.game.name || '').trim().toLowerCase();
          const nameB = (b.game.nameEn || b.game.name_en || b.game.name || '').trim().toLowerCase();
          return nameA.localeCompare(nameB);
        })
        .map((item: any) => item.game); // Extract games
        
        gamesData = scoredGames;
        totalCount = gamesData.length; // Use filtered count
      }
    } else {
      // No search - build regular query with filters
      let query = supabaseAdmin.from('games').select('*', { count: 'exact' });

      // Apply filters - try camelCase first, then snake_case as fallback
      if (minPlayers) {
        query = query.gte('minPlayers', parseInt(minPlayers));
      }
      if (maxPlayers) {
        query = query.lte('maxPlayers', parseInt(maxPlayers));
      }
      if (minPlayTime) {
        query = query.gte('durationMinutes', parseInt(minPlayTime));
      }
      if (maxPlayTime) {
        query = query.lte('durationMinutes', parseInt(maxPlayTime));
      }
      if (minYear) {
        query = query.gte('yearRelease', parseInt(minYear));
      }
      if (maxYear) {
        query = query.lte('yearRelease', parseInt(maxYear));
      }

      // Apply sorting - try camelCase first
      if (sortBy === 'name') {
        query = query.order('nameEn', { ascending: true });
      } else if (sortBy === 'year') {
        query = query.order('yearRelease', { ascending: false });
      } else if (sortBy === 'players') {
        query = query.order('minPlayers', { ascending: true });
      } else if (sortBy === 'time') {
        query = query.order('durationMinutes', { ascending: true });
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      // Execute query
      const queryResult = await query;
      gamesData = queryResult.data || [];
      totalCount = queryResult.count;
      error = queryResult.error;
    }

    if (error) {
      console.error('[GAMES API] Error querying games:', error);
      return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
    }

    // For search queries, apply pagination AFTER sorting (JavaScript pagination)
    let paginatedGames = gamesData || [];
    if (search) {
      paginatedGames = gamesData.slice(offset, offset + limit);
    }

    // Normalize the data for consistent frontend usage
    const normalizedGames = paginatedGames.map((game: any) => ({
      id: game.id,
      bggId: game.bggId ?? game.bgg_id,
      name: game.nameEn ?? game.name_en ?? game.name,
      nameEn: game.nameEn ?? game.name_en,
      nameEs: game.nameEs ?? game.name_es,
      year: game.yearRelease ?? game.year_release ?? game.year,
      image: game.imageUrl ?? game.image_url ?? game.image,
      thumbnailUrl: game.thumbnailUrl ?? game.thumbnail_url,
      minPlayers: game.minPlayers ?? game.min_players,
      maxPlayers: game.maxPlayers ?? game.max_players,
      minPlayTime: game.minPlayTime ?? game.min_play_time,
      maxPlayTime: game.maxPlayTime ?? game.max_play_time,
      durationMinutes: game.durationMinutes ?? game.duration_minutes,
      ranking: game.bggRanking ?? game.bgg_ranking,
      averageRating: game.bggRating ?? game.bgg_rating,
      numVotes: game.bggVotes ?? game.bgg_votes,
      userRating: game.userRating ?? game.user_rating,
      userVotes: game.userVotes ?? game.user_votes,
      expansions: game.expansions ?? 0
    }));

    const total = totalCount || normalizedGames.length || 0;

    console.log('[GAMES API] Returning', normalizedGames.length, 'games (total:', total, ')');

    return NextResponse.json({
      games: normalizedGames,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('[GAMES API] Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}