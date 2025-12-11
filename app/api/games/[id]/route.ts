import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const id = parseInt(idString);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    // Fetch base game data - select all columns to handle both naming conventions
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', id)
      .single();

    if (gameError || !game) {
      console.error('Error fetching game:', gameError);
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Debug: Log what we got from Supabase
    console.log('[GAME API] Raw game data keys:', Object.keys(game));
    console.log('[GAME API] Sample fields:', {
      id: game.id,
      name_en: (game as any).name_en,
      nameEn: (game as any).nameEn,
      name: (game as any).name,
      image_url: (game as any).image_url,
      imageUrl: (game as any).imageUrl,
      image: (game as any).image,
      pdf_url: (game as any).pdf_url,
      pdfUrl: (game as any).pdfUrl,
      pdf_file: (game as any).pdf_file,
      pdfFile: (game as any).pdfFile,
      video_url: (game as any).video_url,
      videoUrl: (game as any).videoUrl
    });

    // Fetch related data in parallel
    // Note: Supabase uses snake_case for column names
    const [
      { data: gameCategories, error: gcError },
      { data: gameMechanics, error: gmError },
      { data: descriptions, error: descError },
      { data: rulesInitial, error: rulesError },
      { data: baseGameExpansions, error: expError },
      { data: shopItems, error: shopItemsError }
    ] = await Promise.all([
      // Game Categories with category details - use camelCase (gameId)
      supabaseAdmin
        .from('game_categories')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('gameId', id),
      
      // Game Mechanics with mechanic details - use camelCase (gameId)
      supabaseAdmin
        .from('game_mechanics')
        .select(`
          *,
          mechanic:mechanics(*)
        `)
        .eq('gameId', id),
      
      // Descriptions - use camelCase (gameId)
      supabaseAdmin
        .from('game_descriptions')
        .select('*')
        .eq('gameId', id),
      
      // Rules - game_rules table - use camelCase (gameId)
      supabaseAdmin
        .from('game_rules')
        .select('*')
        .eq('gameId', id),
      
      // Base Game Expansions - use camelCase (baseGameId)
      supabaseAdmin
        .from('expansions')
        .select('*')
        .eq('baseGameId', id),
      // Shop items
      supabaseAdmin
        .from('game_shop_items')
        .select('*')
        .eq('gameId', id)
    ]);

    // Log any errors (non-fatal, some relations might be empty)
    if (gcError) console.warn('[GAME API] Error fetching game categories:', gcError);
    if (gmError) console.warn('[GAME API] Error fetching game mechanics:', gmError);
    if (descError) console.warn('[GAME API] Error fetching descriptions:', descError);
    // Handle rules query - try alternate column name if first attempt failed
    let rules = rulesInitial;
    let finalRulesError = rulesError;
    
    if (rulesError) {
      console.error('[GAME API] Error fetching rules:', rulesError);
      console.error('[GAME API] Rules error details:', JSON.stringify(rulesError, null, 2));
      console.error('[GAME API] Attempted query: game_rules WHERE game_id =', id);
      
      // Try alternate column name if game_id failed
      if (rulesError.message?.includes('column') || rulesError.code === 'PGRST116') {
        console.log('[GAME API] Trying camelCase column name: gameId');
        const { data: rulesAlt, error: rulesErrorAlt } = await supabaseAdmin
          .from('game_rules')
          .select('*')
          .eq('gameId', id);
        
        if (!rulesErrorAlt && rulesAlt) {
          console.log('[GAME API] Success with camelCase! Found', rulesAlt.length, 'rules');
          // Use the alternate query result
          rules = rulesAlt;
          finalRulesError = null;
        } else {
          console.error('[GAME API] Also failed with camelCase:', rulesErrorAlt);
          finalRulesError = rulesErrorAlt || rulesError;
        }
      }
    }
    if (expError) console.warn('[GAME API] Error fetching expansions:', expError);
    if (shopItemsError) console.warn('[GAME API] Error fetching shop items:', shopItemsError);
    
    // Debug: Log what we got
    console.log('[GAME API] Fetched data counts:', {
      gameCategories: gameCategories?.length || 0,
      gameMechanics: gameMechanics?.length || 0,
      descriptions: descriptions?.length || 0,
      rules: rules?.length || 0,
      expansions: baseGameExpansions?.length || 0
    });
    
    if (rules && rules.length > 0) {
      console.log('[GAME API] ✅ Found', rules.length, 'rules for game ID:', id);
      console.log('[GAME API] Sample rule data:', {
        id: rules[0].id,
        gameId: (rules[0] as any).game_id ?? (rules[0] as any).gameId,
        game_id: (rules[0] as any).game_id,
        gameId_camel: (rules[0] as any).gameId,
        language: rules[0].language,
        hasRulesText: !!(rules[0] as any).rulesText || !!(rules[0] as any).rules_text,
        rulesTextLength: ((rules[0] as any).rulesText || (rules[0] as any).rules_text || '').length,
        allKeys: Object.keys(rules[0])
      });
    } else {
      console.warn('[GAME API] ⚠️ No rules found for game ID:', id);
      console.warn('[GAME API] Query was: SELECT * FROM game_rules WHERE game_id =', id);
    }

    // Transform the data - handle both camelCase (from explicit select) and snake_case (from Supabase default)
    const transformedGame = {
      // Main game fields - explicitly map to ensure we get both naming conventions
      id: game.id,
      bggId: (game as any).bggId ?? (game as any).bgg_id,
      nameEn: (game as any).nameEn ?? (game as any).name_en ?? (game as any).name,
      nameEs: (game as any).nameEs ?? (game as any).name_es,
      name: (game as any).name,
      yearRelease: (game as any).yearRelease ?? (game as any).year_release ?? (game as any).year,
      year: (game as any).year ?? (game as any).yearRelease ?? (game as any).year_release,
      designer: (game as any).designer,
      developer: (game as any).developer,
      minPlayers: (game as any).minPlayers ?? (game as any).min_players,
      maxPlayers: (game as any).maxPlayers ?? (game as any).max_players,
      durationMinutes: (game as any).durationMinutes ?? (game as any).duration_minutes,
      minPlayTime: (game as any).minPlayTime ?? (game as any).min_play_time,
      maxPlayTime: (game as any).maxPlayTime ?? (game as any).max_play_time,
      imageUrl: (game as any).imageUrl ?? (game as any).image_url,
      image: (game as any).image,
      thumbnailUrl: (game as any).thumbnailUrl ?? (game as any).thumbnail_url,
      videoUrl: (game as any).videoUrl ?? (game as any).video_url,
      pdfUrl: (game as any).pdfUrl ?? (game as any).pdf_url,
      pdfFile: (game as any).pdfFile ?? (game as any).pdf_file,
      officialWebsite: (game as any).officialWebsite ?? (game as any).official_website,
      amazonUrl: (game as any).amazonUrl ?? (game as any).amazon_url,
      bggRanking: (game as any).bggRanking ?? (game as any).bgg_ranking,
      bggRating: (game as any).bggRating ?? (game as any).bgg_rating,
      bggVotes: (game as any).bggVotes ?? (game as any).bgg_votes,
      userRating: (game as any).userRating ?? (game as any).user_rating,
      userVotes: (game as any).userVotes ?? (game as any).user_votes,
      expansions: (game as any).expansions ?? 0,
      isExpansion: (game as any).isExpansion ?? (game as any).is_expansion ?? false,
      category: (game as any).category,
      hotnessRank: (game as any).hotnessRank ?? (game as any).hotness_rank,
      
      // Related data with nested transformations - handle both snake_case and camelCase
      gameCategories: (gameCategories || []).map((gc: any) => {
        const cat = Array.isArray(gc.category) ? gc.category[0] : (gc.category || {});
        return {
          id: gc.id,
          gameId: gc.gameId ?? gc.game_id,
          categoryId: gc.categoryId ?? gc.category_id,
          category: {
            id: cat.id,
            nameEn: cat.nameEn ?? cat.name_en,
            nameEs: cat.nameEs ?? cat.name_es,
            descriptionEn: cat.descriptionEn ?? cat.description_en,
            descriptionEs: cat.descriptionEs ?? cat.description_es
          }
        };
      }),
      shopItems: (shopItems || []).map((item: any) => ({
        id: item.id,
        gameId: item.gameId ?? item.game_id,
        title: item.title,
        imageUrl: item.imageUrl ?? item.image_url,
        link: item.link
      })),
      gameMechanics: (gameMechanics || []).map((gm: any) => {
        const mech = Array.isArray(gm.mechanic) ? gm.mechanic[0] : (gm.mechanic || {});
        return {
          id: gm.id,
          gameId: gm.gameId ?? gm.game_id,
          mechanicId: gm.mechanicId ?? gm.mechanic_id,
          mechanic: {
            id: mech.id,
            nameEn: mech.nameEn ?? mech.name_en,
            nameEs: mech.nameEs ?? mech.name_es,
            descriptionEn: mech.descriptionEn ?? mech.description_en,
            descriptionEs: mech.descriptionEs ?? mech.description_es
          }
        };
      }),
      descriptions: (descriptions || []).map((desc: any) => ({
        id: desc.id,
        gameId: desc.gameId ?? desc.game_id,
        language: desc.language,
        shortDescription: desc.shortDescription ?? desc.short_description,
        fullDescription: desc.fullDescription ?? desc.full_description
      })),
      rules: (rules || []).map((rule: any) => {
        if (!rule) return null;
        
        // Handle both camelCase and snake_case from Supabase
        return {
          id: rule.id,
          gameId: rule.gameId ?? rule.game_id,
          language: rule.language,
          rulesText: rule.rulesText ?? rule.rules_text ?? '',
          rulesHtml: rule.rulesHtml ?? rule.rules_html ?? null,
          setupInstructions: rule.setupInstructions ?? rule.setup_instructions ?? null,
          victoryConditions: rule.victoryConditions ?? rule.victory_conditions ?? null
        };
      }).filter(Boolean),
      baseGameExpansions: (baseGameExpansions || []).map((exp: any) => ({
        id: exp.id,
        baseGameId: exp.baseGameId ?? exp.base_game_id,
        expansionNameEn: exp.expansionNameEn ?? exp.expansion_name_en,
        expansionNameEs: exp.expansionNameEs ?? exp.expansion_name_es,
        yearRelease: exp.yearRelease ?? exp.year_release,
        descriptionEn: exp.descriptionEn ?? exp.description_en,
        descriptionEs: exp.descriptionEs ?? exp.description_es,
        imageUrl: exp.imageUrl ?? exp.image_url,
        bggId: exp.bggId ?? exp.bgg_id
      }))
    };

    // Debug: Log transformed data
    console.log('[GAME API] Transformed game sample:', {
      id: transformedGame.id,
      nameEn: transformedGame.nameEn,
      imageUrl: transformedGame.imageUrl,
      videoUrl: transformedGame.videoUrl,
      pdfUrl: transformedGame.pdfUrl,
      pdfFile: transformedGame.pdfFile,
      rulesCount: transformedGame.rules?.length || 0,
      descriptionsCount: transformedGame.descriptions?.length || 0,
      rulesData: transformedGame.rules?.map((r: any) => ({
        id: r.id,
        language: r.language,
        hasRulesText: !!r.rulesText,
        rulesTextLength: r.rulesText?.length || 0
      }))
    });

    // Also log raw rules data
    console.log('[GAME API] Raw rules from Supabase:', rules?.map((r: any) => ({
      id: r.id,
      language: r.language,
      keys: Object.keys(r),
      sample: {
        rulesText: r.rulesText,
        rules_text: r.rules_text,
        gameId: r.gameId,
        game_id: r.game_id
      }
    })));

    return NextResponse.json({ game: transformedGame }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error fetching game:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 