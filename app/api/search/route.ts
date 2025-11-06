import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
        const { data: dbUsers, error: usersError } = await supabaseAdmin
          .from('users')
          .select('id, username, email, avatar, is_verified, is_admin, created_at')
          .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(limit)
          .order('username', { ascending: true });

        if (usersError) {
          console.error('Error searching users:', usersError);
          users = [];
        } else {
          users = (dbUsers || []).map((user: any) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            isVerified: user.is_verified || false,
            isAdmin: user.is_admin || false,
            createdAt: user.created_at,
            type: 'user'
          }));
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
        
        // Try searching with camelCase first (matches database schema)
        let dbGames: any[] = [];
        let gamesError: any = null;
        
        // Primary: Try nameEn (camelCase - matches database schema)
        // Order by name to get exact matches first, then alphabetical
        const result1 = await supabaseAdmin
          .from('games')
          .select('*')
          .ilike('nameEn', `%${searchQuery}%`)
          .order('nameEn', { ascending: true })
          .limit(limit);
        
        dbGames = result1.data || [];
        gamesError = result1.error;
        
        // If search failed or returned no results, try fallback methods
        if (gamesError || dbGames.length === 0) {
          console.log('[SEARCH API] Primary search (nameEn) failed or no results, trying fallbacks...');
          
          // Fallback 1: Try name (legacy field)
          const result2 = await supabaseAdmin
            .from('games')
            .select('*')
            .ilike('name', `%${searchQuery}%`)
            .order('name', { ascending: true })
            .limit(limit);
          
          if (!result2.error && result2.data && result2.data.length > 0) {
            console.log('[SEARCH API] Fallback 1 (name) succeeded!');
            dbGames = result2.data;
            gamesError = null;
          } else {
            // Fallback 2: Try nameEs (camelCase)
            const result3 = await supabaseAdmin
              .from('games')
              .select('*')
              .ilike('nameEs', `%${searchQuery}%`)
              .order('nameEs', { ascending: true })
              .limit(limit);
            
            if (!result3.error && result3.data && result3.data.length > 0) {
              console.log('[SEARCH API] Fallback 2 (nameEs) succeeded!');
              dbGames = result3.data;
              gamesError = null;
            } else if (gamesError) {
              console.error('[SEARCH API] All search methods failed:', gamesError);
            }
          }
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
          
          // Sort results to prioritize exact matches and shorter names (base games before expansions)
          const sortedGames = dbGames.sort((a: any, b: any) => {
            const nameA = (a.nameEn || a.name_en || a.name || '').trim();
            const nameB = (b.nameEn || b.name_en || b.name || '').trim();
            const searchLower = searchQuery.toLowerCase().trim();
            const nameALower = nameA.toLowerCase();
            const nameBLower = nameB.toLowerCase();
            
            // Calculate match scores
            let scoreA = 0;
            let scoreB = 0;
            
            // Exact match (case-insensitive) - highest priority
            if (nameALower === searchLower) scoreA += 1000;
            if (nameBLower === searchLower) scoreB += 1000;
            
            // Exact match with case match - bonus
            if (nameA === searchQuery) scoreA += 100;
            if (nameB === searchQuery) scoreB += 100;
            
            // Starts with search term
            if (nameALower.startsWith(searchLower)) scoreA += 50;
            if (nameBLower.startsWith(searchLower)) scoreB += 50;
            
            // Word boundary match (whole word match)
            const wordMatchA = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(nameALower);
            const wordMatchB = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(nameBLower);
            if (wordMatchA) scoreA += 30;
            if (wordMatchB) scoreB += 30;
            
            // Contains search term
            if (nameALower.includes(searchLower)) scoreA += 10;
            if (nameBLower.includes(searchLower)) scoreB += 10;
            
            // Shorter names get bonus (base games are usually shorter)
            scoreA += (100 - Math.min(nameA.length, 100)) / 10;
            scoreB += (100 - Math.min(nameB.length, 100)) / 10;
            
            // If scores are equal, sort alphabetically
            if (scoreB !== scoreA) {
              return scoreB - scoreA; // Higher score first
            }
            
            return nameALower.localeCompare(nameBLower);
          });
          
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
