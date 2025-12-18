import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserFromToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Normalize text for search: remove punctuation, normalize spaces, lowercase
function normalizeForSearch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')      // Normalize multiple spaces to single space
    .trim();
}

// GET - Search users and games
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // 'all', 'users', 'games'
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        users: [], 
        games: [], 
        total: 0 
      });
    }

    const searchQuery = query.trim();

    // Search users
    let users: any[] = [];
    if (type === 'all' || type === 'users') {
      try {
        console.log('[SEARCH API] Searching for users with query:', searchQuery);
        
        // Search by username (primary) and email (secondary)
        // We'll do two separate queries and combine/deduplicate results
        // Search users - use select('*') to get all columns regardless of naming convention
        const usernameQuery = supabaseAdmin
          .from('users')
          .select('*')
          .ilike('username', `%${searchQuery}%`)
          .limit(limit);
        
        const emailQuery = supabaseAdmin
          .from('users')
          .select('*')
          .ilike('email', `%${searchQuery}%`)
          .limit(limit);

        // Execute both queries in parallel
        const [usernameResult, emailResult] = await Promise.all([
          usernameQuery,
          emailQuery
        ]);
        
        console.log('[SEARCH API] Username search results:', usernameResult.data?.length || 0);
        console.log('[SEARCH API] Email search results:', emailResult.data?.length || 0);

        // Combine results and deduplicate by user ID
        const userMap = new Map();
        
        // Add username matches first (higher priority)
        if (usernameResult.data) {
          usernameResult.data.forEach((user: any) => {
            if (!userMap.has(user.id)) {
              userMap.set(user.id, user);
            }
          });
        }
        
        // Add email matches (if not already in map)
        if (emailResult.data) {
          emailResult.data.forEach((user: any) => {
            if (!userMap.has(user.id)) {
              userMap.set(user.id, user);
            }
          });
        }

        const allUsers = Array.from(userMap.values());
        
        // Filter out invalid users (must have id, username, and email)
        // Also filter out any users that might have been partially deleted or have invalid data
        const validUsers = allUsers.filter((user: any) => {
          if (!user || !user.id || !user.username || !user.email) {
            return false;
          }
          // Ensure username and email are not empty strings
          if (typeof user.username !== 'string' || user.username.trim().length === 0) {
            return false;
          }
          if (typeof user.email !== 'string' || user.email.trim().length === 0) {
            return false;
          }
          return true;
        });
        
        // Sort to prioritize exact matches and starts-with matches
        const sortedUsers = validUsers.sort((a: any, b: any) => {
          const usernameA = (a.username || '').toLowerCase();
          const usernameB = (b.username || '').toLowerCase();
          const searchLower = searchQuery.toLowerCase();
          
          // Exact match gets highest priority
          if (usernameA === searchLower && usernameB !== searchLower) return -1;
          if (usernameB === searchLower && usernameA !== searchLower) return 1;
          
          // Starts with gets next priority
          if (usernameA.startsWith(searchLower) && !usernameB.startsWith(searchLower)) return -1;
          if (usernameB.startsWith(searchLower) && !usernameA.startsWith(searchLower)) return 1;
          
          // Otherwise alphabetical
          return usernameA.localeCompare(usernameB);
        });

        // Get current user ID for follow status checking
        let currentUserId: string | null = null;
        try {
          const cookieStore = await cookies();
          const token = cookieStore.get('auth_token')?.value || cookieStore.get('token')?.value;
          if (token) {
            const authResult = await getUserFromToken(token);
            if (authResult.success && authResult.user) {
              currentUserId = authResult.user.id;
            }
          }
        } catch (error) {
          console.log('[SEARCH API] Could not get current user for follow status:', error);
        }

        // Get follow status for each user if current user is logged in
        let followingUserIds: Set<string> = new Set();
        if (currentUserId && sortedUsers.length > 0) {
          try {
            const userIds = sortedUsers.slice(0, limit).map((u: any) => u.id).filter(Boolean);
            if (userIds.length > 0) {
              // Use the same column naming as the follow API route (camelCase)
              const { data: follows, error: followError } = await supabaseAdmin
                .from('follows')
                .select('followingId')
                .eq('followerId', currentUserId)
                .in('followingId', userIds);
              
              if (!followError && follows) {
                followingUserIds = new Set(follows.map((f: any) => f.followingId).filter(Boolean));
                console.log('[SEARCH API] Found', followingUserIds.size, 'followed users out of', userIds.length, 'searched users');
              } else if (followError) {
                console.error('[SEARCH API] Error checking follow status:', followError);
                // Try snake_case as fallback
                try {
                  const { data: followsSnake, error: followErrorSnake } = await supabaseAdmin
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', currentUserId)
                    .in('following_id', userIds);
                  
                  if (!followErrorSnake && followsSnake) {
                    followingUserIds = new Set(followsSnake.map((f: any) => f.following_id).filter(Boolean));
                    console.log('[SEARCH API] Found', followingUserIds.size, 'followed users (snake_case)');
                  }
                } catch (snakeError) {
                  console.error('[SEARCH API] Error with snake_case fallback:', snakeError);
                }
              }
            }
          } catch (error) {
            console.error('[SEARCH API] Error checking follow status:', error);
          }
        }

        users = sortedUsers.slice(0, limit).map((user: any) => {
          const isFollowing = followingUserIds.has(user.id);
          if (currentUserId) {
            console.log(`[SEARCH API] User ${user.username} (${user.id}): isFollowing=${isFollowing} (currentUserId: ${currentUserId})`);
          }
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            isVerified: user.isVerified || user.is_verified || false,
            isAdmin: user.isAdmin || user.is_admin || false,
            isFollowing: isFollowing,
            type: 'user'
          };
        });

        console.log('[SEARCH API] Final user results:', users.length);

        // Log errors if any
        if (usernameResult.error) {
          console.error('[SEARCH API] Error searching users by username:', usernameResult.error);
        }
        if (emailResult.error) {
          console.error('[SEARCH API] Error searching users by email:', emailResult.error);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        users = [];
      }
    }

    // Search games from database
    let games: any[] = [];
    if (type === 'all' || type === 'games') {
      try {
        console.log('[SEARCH API] Searching for games with query:', searchQuery);
        
        // Normalize search query for better matching (removes punctuation)
        const normalizedSearch = normalizeForSearch(searchQuery);
        console.log('[SEARCH API] Normalized search:', normalizedSearch);
        
        // Split normalized search into words for better matching
        const normalizedWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
        console.log('[SEARCH API] Normalized words:', normalizedWords);
        
        // Fetch a broader set of games, then filter in JavaScript for better punctuation handling
        // Strategy: Fetch games that contain any of the search words, then filter/score in JavaScript
        const searchLimit = Math.max(limit * 5, 200); // Fetch more to filter in JavaScript
        let dbGames: any[] = [];
        let gamesError: any = null;
        
        if (normalizedWords.length > 0) {
          // Build query to find games containing any of the normalized words
          // This will catch games like "Catan: Seafarers" when searching for "Catan Seafarers"
          const wordQueries = normalizedWords.map(word => `nameEn.ilike.%${word}%`);
          
          // Try searching with nameEn first
          const result1 = await supabaseAdmin
            .from('games')
            .select('*')
            .or(wordQueries.join(','))
            .limit(searchLimit);
          
          dbGames = result1.data || [];
          gamesError = result1.error;
          
          // If that didn't work or returned few results, also try name (legacy field)
          if (gamesError || dbGames.length < normalizedWords.length) {
            const wordQueriesName = normalizedWords.map(word => `name.ilike.%${word}%`);
            const result2 = await supabaseAdmin
              .from('games')
              .select('*')
              .or(wordQueriesName.join(','))
              .limit(searchLimit);
            
            if (!result2.error && result2.data) {
              // Merge results, avoiding duplicates
              const existingIds = new Set(dbGames.map((g: any) => g.id));
              const additionalGames = (result2.data || []).filter((g: any) => !existingIds.has(g.id));
              dbGames = [...dbGames, ...additionalGames];
              if (gamesError) gamesError = null;
            }
          }
          
          // Also try the original search query as a fallback
          const originalPattern = `%${searchQuery}%`;
          const result3 = await supabaseAdmin
            .from('games')
            .select('*')
            .ilike('nameEn', originalPattern)
            .limit(searchLimit);
          
          if (!result3.error && result3.data) {
            // Merge results, avoiding duplicates
            const existingIds = new Set(dbGames.map((g: any) => g.id));
            const additionalGames = (result3.data || []).filter((g: any) => !existingIds.has(g.id));
            dbGames = [...dbGames, ...additionalGames];
          }
        } else {
          // Fallback: use original search pattern if normalization produced no words
          const searchPattern = `%${searchQuery}%`;
          const result1 = await supabaseAdmin
            .from('games')
            .select('*')
            .ilike('nameEn', searchPattern)
            .limit(searchLimit);
          
          dbGames = result1.data || [];
          gamesError = result1.error;
        }

        if (gamesError) {
          console.error('[SEARCH API] Error searching games:', gamesError);
          games = [];
        } else {
          console.log('[SEARCH API] Found', dbGames?.length || 0, 'games');
          console.log('[SEARCH API] Sample game names:', dbGames.slice(0, 5).map((g: any) => ({
            id: g.id,
            nameEn: g.nameEn || g.name_en || g.name,
            name: g.name
          })));
          
          // Filter and sort results using normalized comparison for better matching with punctuation
          // Only keep games that contain ALL normalized search words
          const sortedGames = dbGames
            .map((game: any) => {
              const nameA = (game.nameEn || game.name_en || game.name || '').trim();
              const nameALower = nameA.toLowerCase();
              const normalizedNameA = normalizeForSearch(nameA);
              
              // Check if all normalized words are present in the game name
              const allWordsMatch = normalizedWords.length > 0 && 
                normalizedWords.every(word => normalizedNameA.includes(word));
              
              // If not all words match, skip this game
              if (!allWordsMatch && normalizedWords.length > 0) {
                return { game, score: 0 };
              }
              
              // Calculate match scores
              let score = 0;
              
              // Normalized exact match (highest priority - handles punctuation differences)
              if (normalizedNameA === normalizedSearch) score += 1000;
              
              // Exact match (case-insensitive) - high priority
              if (nameALower === searchQuery.toLowerCase().trim()) score += 900;
              
              // Exact match with case match - bonus
              if (nameA === searchQuery) score += 100;
              
              // Normalized starts with - handles punctuation
              if (normalizedNameA.startsWith(normalizedSearch)) score += 500;
              
              // Starts with search term (original)
              if (nameALower.startsWith(searchQuery.toLowerCase().trim())) score += 50;
              
              // Normalized contains - handles punctuation
              if (normalizedNameA.includes(normalizedSearch)) score += 100;
              
              // All words appear in order (bonus for word order matching)
              const normalizedWordsInOrder = normalizedSearch.split(/\s+/).filter(w => w.length > 0);
              let wordsInOrder = true;
              let lastIndex = -1;
              for (const word of normalizedWordsInOrder) {
                const index = normalizedNameA.indexOf(word, lastIndex + 1);
                if (index === -1) {
                  wordsInOrder = false;
                  break;
                }
                lastIndex = index;
              }
              if (wordsInOrder) score += 200;
              
              // Word boundary match (whole word match)
              const searchLower = searchQuery.toLowerCase().trim();
              const wordMatchA = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(nameALower);
              if (wordMatchA) score += 30;
              
              // Contains search term (original)
              if (nameALower.includes(searchLower)) score += 10;
              
              // Shorter names get bonus (base games are usually shorter)
              score += (100 - Math.min(nameA.length, 100)) / 10;
              
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
            .slice(0, limit) // Limit results
            .map((item: any) => item.game); // Extract games
          
          console.log('[SEARCH API] After sorting, top 5 games:', sortedGames.slice(0, 5).map((g: any) => ({
            id: g.id,
            nameEn: g.nameEn || g.name_en || g.name
          })));
          
          games = sortedGames.map((game: any) => {
            // Handle both naming conventions
            const nameEn = game.nameEn || game.name_en || game.name;
            const nameEs = game.nameEs || game.name_es;
            const name = game.name || nameEn;
            const year = game.yearRelease || game.year_release || game.year;
            const minPlayers = game.minPlayers || game.min_players;
            const maxPlayers = game.maxPlayers || game.max_players;
            const durationMinutes = game.durationMinutes || game.duration_minutes;
            const imageUrl = game.imageUrl || game.image_url;
            const thumbnailUrl = game.thumbnailUrl || game.thumbnail_url;
            
            return {
              id: game.id.toString(),
              name: nameEn || name || 'Unknown Game',
              year: year,
              players: minPlayers && maxPlayers 
                ? (minPlayers === maxPlayers 
                    ? `${minPlayers}` 
                    : `${minPlayers}-${maxPlayers}`)
                : 'Unknown',
              duration: durationMinutes ? `${durationMinutes} min` : 'Unknown',
              image: thumbnailUrl || imageUrl,
              type: 'game'
            };
          });
        }
      } catch (error) {
        console.error('[SEARCH API] Exception searching games:', error);
        games = [];
      }
    }

    console.log('[SEARCH API] Final results:', {
      usersCount: users.length,
      gamesCount: games.length,
      total: users.length + games.length,
      query: searchQuery
    });

    return NextResponse.json({
      users,
      games,
      total: users.length + games.length,
      query: searchQuery
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
