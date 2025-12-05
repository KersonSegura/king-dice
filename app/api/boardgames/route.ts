import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  console.log('[BOARDGAMES API] ===== ROUTE CALLED =====');
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const withoutRules = searchParams.get('withoutRules') === 'true';
    const offset = (page - 1) * limit;

    console.log('[BOARDGAMES API] Request params:', { page, limit, search, offset });

    // Build query - use Supabase search if search term provided, otherwise fetch paginated
    console.log('[BOARDGAMES API] Building query...');
    
    // Initialize variables
    let gamesData: any[] = [];
    let totalCount: number | null = null;
    let fetchError: any = null;
    
    // If search is provided, fetch MORE results first, then sort and paginate in JavaScript
    // This ensures we get the best matches before paginating
    if (search) {
      console.log('[BOARDGAMES API] Using Supabase search for:', search);
      
      // Use camelCase to match database schema (nameEn)
      // For search, fetch up to 200 results to ensure we get all matches, then sort and paginate
      const searchLimit = 200; // Fetch more results to ensure we don't miss any matches
      const searchPattern = `%${search}%`;
      
      // Try multiple search strategies and combine results
      // Primary: nameEn (camelCase)
      const searchQuery1 = supabaseAdmin
        .from('games')
        .select('*', { count: 'exact' })
        .ilike('nameEn', searchPattern)
        .limit(searchLimit);
      
      // Fallback 1: name (legacy)
      const searchQuery2 = supabaseAdmin
        .from('games')
        .select('*', { count: 'exact' })
        .ilike('name', searchPattern)
        .limit(searchLimit);
      
      // Fallback 2: nameEs (camelCase)
      const searchQuery3 = supabaseAdmin
        .from('games')
        .select('*', { count: 'exact' })
        .ilike('nameEs', searchPattern)
        .limit(searchLimit);
      
      // Execute all searches in parallel
      const [result1, result2, result3] = await Promise.all([
        searchQuery1,
        searchQuery2,
        searchQuery3
      ]);
      
      // Combine results and deduplicate by ID
      const allGames = new Map();
      [result1.data, result2.data, result3.data].forEach((games: any[]) => {
        if (games) {
          games.forEach((game: any) => {
            if (!allGames.has(game.id)) {
              allGames.set(game.id, game);
            }
          });
        }
      });
      
      gamesData = Array.from(allGames.values());
      totalCount = Math.max(result1.count || 0, result2.count || 0, result3.count || 0);
      fetchError = result1.error || result2.error || result3.error;
      
      console.log('[BOARDGAMES API] Combined search results:', {
        nameEn: result1.data?.length || 0,
        name: result2.data?.length || 0,
        nameEs: result3.data?.length || 0,
        totalUnique: gamesData.length,
        foundCatan: gamesData.some((g: any) => g.id === 8816)
      });
    } else {
      // For non-search, apply pagination directly
      const query = supabaseAdmin
        .from('games')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1);
      
      const result = await query;
      gamesData = result.data || [];
      totalCount = result.count;
      fetchError = result.error;
    }
    
    if (fetchError) {
      console.error('[BOARDGAMES API] Supabase query error:', fetchError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch board games', 
          details: fetchError.message,
          code: fetchError.code
        },
        { status: 500 }
      );
    }
    
    console.log('[BOARDGAMES API] Query successful. Found', gamesData?.length || 0, 'games');
    console.log('[BOARDGAMES API] Total matching games:', totalCount);
    
    if (!gamesData || gamesData.length === 0) {
      console.log('[BOARDGAMES API] No games found');
      return NextResponse.json({ 
        games: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    // Sort games with smart prioritization (exact matches first, then alphabetical)
    const games = (gamesData || []).sort((a: any, b: any) => {
      const nameA = (a.nameEn || a.name_en || a.name || '').trim();
      const nameB = (b.nameEn || b.name_en || b.name || '').trim();
      const searchLower = search ? search.toLowerCase().trim() : '';
      const nameALower = nameA.toLowerCase();
      const nameBLower = nameB.toLowerCase();
      
      if (search) {
        // Calculate match scores
        let scoreA = 0;
        let scoreB = 0;
        
        // Exact match (case-insensitive) - highest priority
        if (nameALower === searchLower) scoreA += 1000;
        if (nameBLower === searchLower) scoreB += 1000;
        
        // Exact match with case match - bonus
        if (nameA === search) scoreA += 100;
        if (nameB === search) scoreB += 100;
        
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
      }
      
      // Finally, alphabetical
      return nameALower.localeCompare(nameBLower);
    });
    
    // For search queries, apply pagination AFTER sorting (JavaScript pagination)
    let paginatedGames = games;
    if (search) {
      paginatedGames = games.slice(offset, offset + limit);
    }
    
    // Debug: Log top 5 games after sorting
    if (search && games.length > 0) {
      console.log('[BOARDGAMES API] Top 5 games after sorting (all fetched):', games.slice(0, 5).map((g: any) => ({
        id: g.id,
        nameEn: g.nameEn || g.name_en || g.name,
        score: search ? (() => {
          const name = (g.nameEn || g.name_en || g.name || '').trim().toLowerCase();
          const searchLower = search.toLowerCase().trim();
          let score = 0;
          if (name === searchLower) score += 1000;
          if (name.startsWith(searchLower)) score += 50;
          return score;
        })() : 0
      })));
      console.log('[BOARDGAMES API] Looking for Catan (ID 8816) in results:', games.find((g: any) => g.id === 8816) ? 'FOUND' : 'NOT FOUND');
    }
    
    const count = totalCount || 0;
    
    console.log('[BOARDGAMES API] Returning', games.length, 'games (page', page, 'of', Math.ceil(count / limit) + ')');

    // Transform games to match expected format (for search, we might skip related data)
    // If this is a search request with small limit, skip related data for performance
    const skipRelatedData = search && limit <= 10;
    
    let gamesWithRelations: any[] = [];
    
    if (skipRelatedData) {
      // For search, just transform the games without fetching related data
      gamesWithRelations = games.map((game: any) => ({
        id: game.id,
        nameEn: game.nameEn ?? game.name_en ?? game.name,
        nameEs: game.nameEs ?? game.name_es,
        yearRelease: game.yearRelease ?? game.year_release ?? game.year,
        minPlayers: game.minPlayers ?? game.min_players,
        maxPlayers: game.maxPlayers ?? game.max_players,
        durationMinutes: game.durationMinutes ?? game.duration_minutes,
        imageUrl: game.imageUrl ?? game.image_url,
        thumbnailUrl: game.thumbnailUrl ?? game.thumbnail_url,
        // Related data empty for search results
        gameCategories: [],
        gameMechanics: [],
        descriptions: [],
        rules: [],
        baseGameExpansions: []
      }));
      
      // Sort search results to prioritize exact matches (games are already sorted, but ensure order is preserved)
      if (search) {
        gamesWithRelations = gamesWithRelations.sort((a: any, b: any) => {
          const nameA = (a.nameEn || '').trim();
          const nameB = (b.nameEn || '').trim();
          const searchLower = search.toLowerCase().trim();
          const nameALower = nameA.toLowerCase();
          const nameBLower = nameB.toLowerCase();
          
          // Calculate match scores
          let scoreA = 0;
          let scoreB = 0;
          
          // Exact match (case-insensitive) - highest priority
          if (nameALower === searchLower) scoreA += 1000;
          if (nameBLower === searchLower) scoreB += 1000;
          
          // Exact match with case match - bonus
          if (nameA === search) scoreA += 100;
          if (nameB === search) scoreB += 100;
          
          // Starts with search term
          if (nameALower.startsWith(searchLower)) scoreA += 50;
          if (nameBLower.startsWith(searchLower)) scoreB += 50;
          
          // Word boundary match
          const wordMatchA = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(nameALower);
          const wordMatchB = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(nameBLower);
          if (wordMatchA) scoreA += 30;
          if (wordMatchB) scoreB += 30;
          
          // Contains search term
          if (nameALower.includes(searchLower)) scoreA += 10;
          if (nameBLower.includes(searchLower)) scoreB += 10;
          
          // Shorter names get bonus
          scoreA += (100 - Math.min(nameA.length, 100)) / 10;
          scoreB += (100 - Math.min(nameB.length, 100)) / 10;
          
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          
          return nameALower.localeCompare(nameBLower);
        });
      }
    } else {
      // Fetch related data for all games in parallel
      const gameIds = games.map((g: any) => g.id);
      
      if (gameIds.length > 0) {
      const [
        { data: allCategories, error: categoriesError },
        { data: allMechanics, error: mechanicsError },
        { data: allDescriptions, error: descriptionsError },
        { data: allRulesInitial, error: rulesError },
        { data: allExpansions, error: expansionsError }
      ] = await Promise.all([
        supabaseAdmin.from('game_categories').select('*, category:categories(*)').in('gameId', gameIds),
        supabaseAdmin.from('game_mechanics').select('*, mechanic:mechanics(*)').in('gameId', gameIds),
        supabaseAdmin.from('game_descriptions').select('*').in('gameId', gameIds),
        supabaseAdmin.from('game_rules').select('*').in('gameId', gameIds),
        supabaseAdmin.from('expansions').select('*').in('baseGameId', gameIds)
      ]);

      // Handle rules query error - try camelCase column name if snake_case failed
      let allRules = allRulesInitial;
      if (rulesError) {
        console.warn('[BOARDGAMES API] Error fetching rules with game_id:', rulesError);
        // Try camelCase column name if snake_case failed
        if (rulesError.message?.includes('column') || rulesError.code === 'PGRST116') {
          console.log('[BOARDGAMES API] Trying camelCase column name: gameId');
          const { data: rulesAlt, error: rulesErrorAlt } = await supabaseAdmin
            .from('game_rules')
            .select('*')
            .in('gameId', gameIds);
          
          if (!rulesErrorAlt && rulesAlt) {
            console.log('[BOARDGAMES API] Success with camelCase! Found', rulesAlt.length, 'rules');
            allRules = rulesAlt;
          } else {
            console.warn('[BOARDGAMES API] Also failed with camelCase:', rulesErrorAlt);
          }
        }
      }
      
      // Log errors for debugging (non-fatal)
      if (categoriesError) console.warn('[BOARDGAMES API] Error fetching categories:', categoriesError);
      if (mechanicsError) console.warn('[BOARDGAMES API] Error fetching mechanics:', mechanicsError);
      if (descriptionsError) console.warn('[BOARDGAMES API] Error fetching descriptions:', descriptionsError);
      if (expansionsError) console.warn('[BOARDGAMES API] Error fetching expansions:', expansionsError);
      
      console.log('[BOARDGAMES API] Fetched related data:', {
        categories: allCategories?.length || 0,
        mechanics: allMechanics?.length || 0,
        descriptions: allDescriptions?.length || 0,
        rules: allRules?.length || 0,
        expansions: allExpansions?.length || 0
      });
      
      // Debug: Check PDF fields in sample games
      if (games && games.length > 0) {
        const sampleGame = games[0];
        console.log('[BOARDGAMES API] Sample game PDF fields:', {
          gameId: sampleGame.id,
          gameName: sampleGame.nameEn ?? sampleGame.name_en ?? sampleGame.name,
          pdfUrl: sampleGame.pdfUrl ?? sampleGame.pdf_url,
          pdfFile: sampleGame.pdfFile ?? sampleGame.pdf_file,
          hasPdfUrl: !!(sampleGame.pdfUrl ?? sampleGame.pdf_url),
          hasPdfFile: !!(sampleGame.pdfFile ?? sampleGame.pdf_file)
        });
      }

      // Group related data by game ID
      const categoriesByGame: Record<number, any[]> = {};
      const mechanicsByGame: Record<number, any[]> = {};
      const descriptionsByGame: Record<number, any[]> = {};
      const rulesByGame: Record<number, any[]> = {};
      const expansionsByGame: Record<number, any[]> = {};

      (allCategories || []).forEach((gc: any) => {
        const gameId = gc.game_id ?? gc.gameId;
        if (!categoriesByGame[gameId]) categoriesByGame[gameId] = [];
        const cat = Array.isArray(gc.category) ? gc.category[0] : (gc.category || {});
        categoriesByGame[gameId].push({
          id: gc.id,
          gameId: gc.game_id ?? gc.gameId,
          categoryId: gc.category_id ?? gc.categoryId,
          category: {
            id: cat.id,
            nameEn: cat.name_en ?? cat.nameEn,
            nameEs: cat.name_es ?? cat.nameEs
          }
        });
      });

      (allMechanics || []).forEach((gm: any) => {
        const gameId = gm.game_id ?? gm.gameId;
        if (!mechanicsByGame[gameId]) mechanicsByGame[gameId] = [];
        const mech = Array.isArray(gm.mechanic) ? gm.mechanic[0] : (gm.mechanic || {});
        mechanicsByGame[gameId].push({
          id: gm.id,
          gameId: gm.game_id ?? gm.gameId,
          mechanicId: gm.mechanic_id ?? gm.mechanicId,
          mechanic: {
            id: mech.id,
            nameEn: mech.name_en ?? mech.nameEn,
            nameEs: mech.name_es ?? mech.nameEs
          }
        });
      });

      (allDescriptions || []).forEach((desc: any) => {
        const gameId = desc.game_id ?? desc.gameId;
        if (!descriptionsByGame[gameId]) descriptionsByGame[gameId] = [];
        descriptionsByGame[gameId].push({
          id: desc.id,
          gameId: desc.game_id ?? desc.gameId,
          language: desc.language,
          shortDescription: desc.short_description ?? desc.shortDescription,
          fullDescription: desc.full_description ?? desc.fullDescription
        });
      });

      (allRules || []).forEach((rule: any) => {
        const gameId = rule.game_id ?? rule.gameId;
        if (!rulesByGame[gameId]) rulesByGame[gameId] = [];
        rulesByGame[gameId].push({
          id: rule.id,
          gameId: rule.game_id ?? rule.gameId,
          language: rule.language,
          rulesText: rule.rules_text ?? rule.rulesText,
          rulesHtml: rule.rules_html ?? rule.rulesHtml,
          setupInstructions: rule.setup_instructions ?? rule.setupInstructions,
          victoryConditions: rule.victory_conditions ?? rule.victoryConditions
        });
      });

      (allExpansions || []).forEach((exp: any) => {
        const gameId = exp.base_game_id ?? exp.baseGameId;
        if (!expansionsByGame[gameId]) expansionsByGame[gameId] = [];
        expansionsByGame[gameId].push({
          id: exp.id,
          baseGameId: exp.base_game_id ?? exp.baseGameId,
          expansionNameEn: exp.expansion_name_en ?? exp.expansionNameEn,
          expansionNameEs: exp.expansion_name_es ?? exp.expansionNameEs,
          yearRelease: exp.year_release ?? exp.yearRelease,
          descriptionEn: exp.description_en ?? exp.descriptionEn,
          descriptionEs: exp.description_es ?? exp.descriptionEs,
          imageUrl: exp.image_url ?? exp.imageUrl,
          bggId: exp.bgg_id ?? exp.bggId
        });
      });

      // Transform games to match expected format for GameSearch component
      // For search results, we need: id, nameEn, nameEs, yearRelease, minPlayers, maxPlayers, durationMinutes, imageUrl, thumbnailUrl
      // Use paginatedGames (already sorted and paginated for search)
      gamesWithRelations = paginatedGames.map((game: any) => ({
        // Transform main game fields - handle both camelCase and snake_case
        id: game.id,
        bggId: game.bggId ?? game.bgg_id,
        nameEn: game.nameEn ?? game.name_en ?? game.name,
        nameEs: game.nameEs ?? game.name_es,
        name: game.name,
        yearRelease: game.yearRelease ?? game.year_release ?? game.year,
        year: game.year ?? game.yearRelease ?? game.year_release,
        designer: game.designer,
        developer: game.developer,
        minPlayers: game.minPlayers ?? game.min_players,
        maxPlayers: game.maxPlayers ?? game.max_players,
        durationMinutes: game.durationMinutes ?? game.duration_minutes,
        minPlayTime: game.minPlayTime ?? game.min_play_time,
        maxPlayTime: game.maxPlayTime ?? game.max_play_time,
        imageUrl: game.imageUrl ?? game.image_url,
        image: game.image,
        thumbnailUrl: game.thumbnailUrl ?? game.thumbnail_url,
        videoUrl: game.videoUrl ?? game.video_url,
        pdfUrl: game.pdfUrl ?? game.pdf_url,
        pdfFile: game.pdfFile ?? game.pdf_file,
        officialWebsite: game.officialWebsite ?? game.official_website,
        bggRanking: game.bggRanking ?? game.bgg_ranking,
        bggRating: game.bggRating ?? game.bgg_rating,
        bggVotes: game.bggVotes ?? game.bgg_votes,
        userRating: game.userRating ?? game.user_rating,
        userVotes: game.userVotes ?? game.user_votes,
        expansions: game.expansions ?? 0,
        isExpansion: game.isExpansion ?? game.is_expansion ?? false,
        category: game.category,
        hotnessRank: game.hotnessRank ?? game.hotness_rank,
        // Related data
        gameCategories: categoriesByGame[game.id] || [],
        gameMechanics: mechanicsByGame[game.id] || [],
        descriptions: descriptionsByGame[game.id] || [],
        rules: rulesByGame[game.id] || [],
        baseGameExpansions: expansionsByGame[game.id] || []
      }));

              // Filter games without rules if requested
              if (withoutRules) {
                gamesWithRelations = gamesWithRelations.filter((game: any) => 
                  !game.rules || game.rules.length === 0
                );
              }
              
              // Re-sort after transformation to ensure order is preserved (especially for search results)
              if (search) {
                gamesWithRelations = gamesWithRelations.sort((a: any, b: any) => {
                  const nameA = (a.nameEn || a.name_en || a.name || '').trim();
                  const nameB = (b.nameEn || b.name_en || b.name || '').trim();
                  const searchLower = search.toLowerCase().trim();
                  const nameALower = nameA.toLowerCase();
                  const nameBLower = nameB.toLowerCase();
                  
                  // Calculate match scores
                  let scoreA = 0;
                  let scoreB = 0;
                  
                  // Exact match (case-insensitive) - highest priority
                  if (nameALower === searchLower) scoreA += 1000;
                  if (nameBLower === searchLower) scoreB += 1000;
                  
                  // Exact match with case match - bonus
                  if (nameA === search) scoreA += 100;
                  if (nameB === search) scoreB += 100;
                  
                  // Starts with search term
                  if (nameALower.startsWith(searchLower)) scoreA += 50;
                  if (nameBLower.startsWith(searchLower)) scoreB += 50;
                  
                  // Word boundary match
                  const wordMatchA = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(nameALower);
                  const wordMatchB = new RegExp(`\\b${searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(nameBLower);
                  if (wordMatchA) scoreA += 30;
                  if (wordMatchB) scoreB += 30;
                  
                  // Contains search term
                  if (nameALower.includes(searchLower)) scoreA += 10;
                  if (nameBLower.includes(searchLower)) scoreB += 10;
                  
                  // Shorter names get bonus
                  scoreA += (100 - Math.min(nameA.length, 100)) / 10;
                  scoreB += (100 - Math.min(nameB.length, 100)) / 10;
                  
                  if (scoreB !== scoreA) {
                    return scoreB - scoreA;
                  }
                  
                  return nameALower.localeCompare(nameBLower);
                });
              }
            } else {
              // No games, return empty
              gamesWithRelations = [];
            }
          }

    const totalGames = count || 0;
    const totalPages = Math.ceil(totalGames / limit);

    return NextResponse.json({ 
      games: gamesWithRelations,
      pagination: {
        page,
        limit,
        total: totalGames,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error('[BOARDGAMES API] ===== ERROR CAUGHT =====');
    console.error('[BOARDGAMES API] Error type:', error?.constructor?.name);
    console.error('[BOARDGAMES API] Error message:', error?.message);
    console.error('[BOARDGAMES API] Error stack:', error?.stack);
    console.error('[BOARDGAMES API] Full error:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: 'Failed to fetch board games',
        details: error?.message || 'Unknown error',
        type: error?.constructor?.name
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log what we're receiving (for debugging)
    console.log('Received game data:', {
      nameEn: body.nameEn,
      hasId: 'id' in body,
      id: body.id,
      hasRules: !!body.rulesText,
      hasDescription: !!body.fullDescription
    });
    
    // Remove id if it somehow exists in the body (shouldn't happen, but defensive)
    delete body.id;
    
    // Check for duplicate games (case-sensitive for now)
    const existingGame = await prisma.game.findFirst({
      where: {
        OR: [
          { nameEn: { equals: body.nameEn } },
          { nameEs: { equals: body.nameEs } },
          { name: { equals: body.nameEn } }
        ]
      }
    });

    // If game exists, delete it and all related data to overwrite
    if (existingGame) {
      console.log(`🔄 Game already exists (ID: ${existingGame.id}), deleting to overwrite...`);
      
      // Delete all related data first (Prisma should handle this with cascading deletes if configured)
      await prisma.$transaction(async (tx) => {
        // Delete descriptions
        await tx.gameDescription.deleteMany({
          where: { gameId: existingGame.id }
        });
        
        // Delete rules
        await tx.gameRule.deleteMany({
          where: { gameId: existingGame.id }
        });
        
        // Delete category relationships
        await tx.gameCategory.deleteMany({
          where: { gameId: existingGame.id }
        });
        
        // Delete mechanic relationships
        await tx.gameMechanic.deleteMany({
          where: { gameId: existingGame.id }
        });
        
        // Delete expansion relationships (where this game is the base game)
        await tx.expansion.deleteMany({
          where: { baseGameId: existingGame.id }
        });
        
        // Finally, delete the game itself
        await tx.game.delete({
          where: { id: existingGame.id }
        });
      }, {
        timeout: 30000, // 30 seconds timeout for complex operations
        maxWait: 5000,  // 5 seconds max wait to acquire a connection
      });
      
      console.log(`✅ Existing game deleted, proceeding with new data...`);
    }
    
    // Use a transaction to ensure all operations succeed or all fail
    // Increased timeout to 30 seconds for complex operations
    const result = await prisma.$transaction(async (tx) => {
      // Create a new game - explicitly define all fields (no spread operator)
      const game = await tx.game.create({
        data: {
          nameEn: body.nameEn || '',
          nameEs: body.nameEs || '',
          yearRelease: body.yearRelease || null,
          designer: body.designer || null,
          developer: body.developer || null,
          minPlayers: body.minPlayers || null,
          maxPlayers: body.maxPlayers || null,
          durationMinutes: body.durationMinutes || null,
          imageUrl: body.imageUrl || null,
          thumbnailUrl: body.thumbnailUrl || null,
          videoUrl: body.videoUrl || null,
          pdfUrl: body.pdfUrl || null,
          pdfFile: body.pdfFile || null,
          officialWebsite: body.officialWebsite || null,
          isExpansion: body.isExpansion || false,
          // Legacy fields
          name: body.nameEn || '',
          year: body.yearRelease || null,
          minPlayTime: body.durationMinutes || null,
          maxPlayTime: body.durationMinutes || null,
          image: body.thumbnailUrl || body.imageUrl || null,
          expansions: 0,
          category: 'ranked',
          userRating: 0,
          userVotes: 0,
        },
      });

      console.log(`✅ Game created with ID: ${game.id}`);

      // Check if any users have usernames that conflict with this game name
      // This runs after game creation to avoid blocking game creation if there's an error
      try {
        const { findConflictingUsernames } = await import('@/lib/username-validation');
        const conflictingUserIds = await findConflictingUsernames(game.nameEn || body.nameEn || '');
        
        if (conflictingUserIds.length > 0) {
          console.log(`⚠️ Found ${conflictingUserIds.length} users with conflicting usernames for game "${game.nameEn}"`);
          
          // Flag these users as needing to change their username
          for (const userId of conflictingUserIds) {
            await supabaseAdmin
              .from('users')
              .update({
                username_change_required: true,
                username_change_reason: `Game name conflict: "${game.nameEn}"`
              })
              .eq('id', userId);
            
            console.log(`✅ Flagged user ${userId} to change username`);
          }
        }
      } catch (conflictError) {
        // Don't fail game creation if username conflict checking fails
        console.error('Error checking for conflicting usernames:', conflictError);
      }

      // Add English description if provided
      if (body.fullDescription) {
        await tx.gameDescription.create({
          data: {
            gameId: game.id,
            language: 'en',
            shortDescription: body.fullDescription.substring(0, 200) + (body.fullDescription.length > 200 ? '...' : ''),
            fullDescription: body.fullDescription,
          },
        });
        console.log(`✅ English description created for game ${game.id}`);
      }

      // Add Spanish description if provided (and different from English)
      // Only create Spanish description if nameEs is provided AND we want a separate Spanish description
      // For now, we'll skip creating a duplicate Spanish description with the same content
      // Users can add Spanish descriptions later if needed
      if (body.fullDescriptionEs && body.nameEs) {
        await tx.gameDescription.create({
          data: {
            gameId: game.id,
            language: 'es',
            shortDescription: body.fullDescriptionEs.substring(0, 200) + (body.fullDescriptionEs.length > 200 ? '...' : ''),
            fullDescription: body.fullDescriptionEs,
          },
        });
        console.log(`✅ Spanish description created for game ${game.id}`);
      }

      // Add rules if provided
      if (body.rulesText && body.rulesText.trim()) {
        await tx.gameRule.create({
          data: {
            gameId: game.id,
            language: 'es',
            rulesText: body.rulesText,
            rulesHtml: `<div class="game-rules">${body.rulesText.replace(/\n/g, '<br>')}</div>`,
          },
        });
        console.log(`✅ Rules created for game ${game.id}`);
      } else {
        console.log(`⚠️ No rules provided for game ${game.id}`);
      }

      return game;
    }, {
      timeout: 30000, // 30 seconds timeout for complex operations
      maxWait: 5000,  // 5 seconds max wait to acquire a connection
    });

    console.log(`✅ Transaction completed successfully for game: ${result.nameEn}`);
    
    // Check if any users have usernames that conflict with this game name
    // Auto-rename them and send notifications
    // This runs after game creation to avoid blocking game creation if there's an error
    try {
      const { autoRenameConflictingUsers } = await import('@/lib/username-validation');
      const { createNotification } = await import('@/lib/notifications');
      
      // Check all game name fields for conflicts
      const gameNames = [result.nameEn, result.nameEs, result.name].filter(Boolean);
      
      for (const gameName of gameNames) {
        if (!gameName) continue;
        
        // Auto-rename conflicting users
        const renamedUsers = await autoRenameConflictingUsers(gameName);
        
        if (renamedUsers.length > 0) {
          console.log(`⚠️ Found ${renamedUsers.length} users with conflicting usernames for game "${gameName}"`);
          
          // Send notification to each renamed user
          for (const { userId, oldUsername, newUsername } of renamedUsers) {
            await createNotification({
              userId: userId,
              type: 'system',
              message: `Your username "${oldUsername}" conflicts with a game we just added. We've automatically changed it to "${newUsername}". Please update it to your preferred username in your profile settings.`,
              url: '/profile'
            });
            
            console.log(`✅ Notified user ${userId} about username change from "${oldUsername}" to "${newUsername}"`);
          }
        }
      }
    } catch (conflictError) {
      // Don't fail game creation if username conflict checking fails
      console.error('Error handling conflicting usernames:', conflictError);
    }
    
    return NextResponse.json({ success: true, game: result });

  } catch (error) {
    console.error('❌ Error creating board game:', error);
    return NextResponse.json(
      { error: 'Failed to create board game', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
