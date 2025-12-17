/**
 * Script to fetch categories for games from BoardGameGeek API
 * Processes games in batches of 100, skipping games that already have categories
 * 
 * Usage:
 *   node scripts/fetch-categories-for-games.js [batch_size] [limit]
 * 
 * Examples:
 *   node scripts/fetch-categories-for-games.js          # Default: 100 games, batch of 20
 *   node scripts/fetch-categories-for-games.js 20 50    # 50 games, batch of 20
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'value'
});

const BATCH_SIZE = parseInt(process.argv[2]) || 20; // BGG API supports up to 20 at a time
const LIMIT = parseInt(process.argv[3]) || 100; // Total games to process

class CategoryFetcher {
  constructor() {
    this.delayMs = 2000; // 2 seconds between requests to respect BGG rate limits
    this.totalProcessed = 0;
    this.totalSkipped = 0;
    this.totalAdded = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.delayMs));
  }

  logProgress() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    console.log(`\n📊 PROGRESS (${minutes}m ${seconds}s):`);
    console.log(`   ✅ Processed: ${this.totalProcessed}`);
    console.log(`   ⏭️  Skipped (already have categories): ${this.totalSkipped}`);
    console.log(`   ➕ Added categories: ${this.totalAdded}`);
    console.log(`   ❌ Errors: ${this.totalErrors}`);
  }

  async checkGameHasCategories(gameId) {
    try {
      // Try camelCase first
      const { count, error } = await supabaseAdmin
        .from('game_categories')
        .select('*', { count: 'exact', head: true })
        .eq('gameId', gameId);
      
      if (error) {
        // Try snake_case as fallback
        const { count: countAlt, error: errorAlt } = await supabaseAdmin
          .from('game_categories')
          .select('*', { count: 'exact', head: true })
          .eq('game_id', gameId);
        
        if (errorAlt) {
          return false; // Silently fail and assume no categories
        }
        
        return (countAlt || 0) > 0;
      }
      
      return (count || 0) > 0;
    } catch (error) {
      return false; // Silently fail
    }
  }

  extractCategories(game) {
    try {
      const categories = [];
      
      if (!game.link) {
        return categories;
      }

      const links = Array.isArray(game.link) ? game.link : [game.link];
      
      for (const link of links) {
        if (link.type === 'boardgamecategory') {
          const categoryName = link.value || link;
          if (categoryName && typeof categoryName === 'string') {
            categories.push(categoryName.trim());
          }
        }
      }
      
      return [...new Set(categories)]; // Remove duplicates
    } catch (error) {
      console.error('Error extracting categories:', error.message);
      return [];
    }
  }

  async fetchCategoriesFromBGG(bggIds) {
    try {
      const idsString = bggIds.join(',');
      const url = `https://boardgamegeek.com/xmlapi2/thing?id=${idsString}&stats=0`;
      
      // Add delay before request to avoid rate limiting
      await this.delay();
      
      const response = await axios.get(url, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/xml, text/xml, */*'
        },
        validateStatus: function (status) {
          return status < 500; // Accept any status < 500 (including 401, 429, etc.)
        }
      });

      // Check for rate limiting or errors
      if (response.status === 401 || response.status === 429) {
        console.log(`   ⚠️  BGG API rate limited or unauthorized (status ${response.status}). Waiting 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return {};
      }

      if (response.status !== 200) {
        console.log(`   ⚠️  BGG API returned status ${response.status}`);
        return {};
      }

      const data = parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        return {};
      }

      const items = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
      const gameCategories = {};

      for (const item of items) {
        const bggId = parseInt(item.id);
        const categories = this.extractCategories(item);
        if (categories.length > 0) {
          gameCategories[bggId] = categories;
        }
      }

      return gameCategories;
    } catch (error) {
      if (error.response) {
        console.error(`   ❌ BGG API error: ${error.response.status} - ${error.response.statusText}`);
      } else {
        console.error(`   ❌ Error fetching from BGG API:`, error.message);
      }
      return {};
    }
  }

  async findOrCreateCategory(categoryName) {
    try {
      // Try to find existing category
      const { data: existingCategories, error: findError } = await supabaseAdmin
        .from('categories')
        .select('*')
        .or(`nameEn.eq.${categoryName},nameEs.eq.${categoryName}`)
        .limit(1);
      
      if (findError && findError.code !== 'PGRST116') {
        console.error(`Error finding category "${categoryName}":`, findError.message);
      }

      let category = existingCategories && existingCategories.length > 0 ? existingCategories[0] : null;

      // Create if not found
      if (!category) {
        const { data: newCategory, error: createError } = await supabaseAdmin
          .from('categories')
          .insert({
            nameEn: categoryName,
            nameEs: categoryName // For now, use same name for both languages
          })
          .select()
          .single();
        
        if (createError) {
          console.error(`Error creating category "${categoryName}":`, createError.message);
          return null;
        }
        
        category = newCategory;
      }

      return category;
    } catch (error) {
      console.error(`Error finding/creating category "${categoryName}":`, error.message);
      return null;
    }
  }

  async addCategoriesToGame(gameId, categories) {
    try {
      let addedCount = 0;

      for (const categoryName of categories) {
        const category = await this.findOrCreateCategory(categoryName);
        
        if (!category) {
          continue;
        }

        // Check if game-category link already exists
        const { data: existing, error: checkError } = await supabaseAdmin
          .from('game_categories')
          .select('*')
          .eq('gameId', gameId)
          .eq('categoryId', category.id)
          .limit(1);
        
        if (checkError && checkError.code !== 'PGRST116') {
          // Try with snake_case as fallback
          const { data: existingAlt } = await supabaseAdmin
            .from('game_categories')
            .select('*')
            .eq('game_id', gameId)
            .eq('category_id', category.id)
            .limit(1);
          
          if (existingAlt && existingAlt.length > 0) {
            continue; // Already exists
          }
        }

        if (!existing || existing.length === 0) {
          const { error: insertError } = await supabaseAdmin
            .from('game_categories')
            .insert({
              gameId: gameId,
              categoryId: category.id
            });
          
          if (insertError) {
            console.error(`Error linking category "${categoryName}" to game ${gameId}:`, insertError.message);
          } else {
            addedCount++;
          }
        }
      }

      return addedCount;
    } catch (error) {
      console.error(`Error adding categories to game ${gameId}:`, error.message);
      return 0;
    }
  }

  async processGameBatch(games) {
    // Filter games that don't have categories yet
    const gamesWithoutCategories = [];
    
    for (const game of games) {
      const hasCategories = await this.checkGameHasCategories(game.id);
      if (!hasCategories && game.bggId) {
        gamesWithoutCategories.push(game);
      } else {
        this.totalSkipped++;
      }
    }

    if (gamesWithoutCategories.length === 0) {
      console.log(`   ℹ️  All games in this batch already have categories`);
      return;
    }

    // Fetch categories from BGG in batches
    const bggIds = gamesWithoutCategories.map(g => g.bggId).filter(Boolean);
    
    for (let i = 0; i < bggIds.length; i += BATCH_SIZE) {
      const batch = bggIds.slice(i, i + BATCH_SIZE);
      console.log(`   📡 Fetching categories for ${batch.length} games from BGG...`);
      
      const gameCategories = await this.fetchCategoriesFromBGG(batch);
      
      // Add categories to games
      for (const game of gamesWithoutCategories) {
        if (!game.bggId) {
          console.log(`   ⚠️  Game "${game.nameEn}" (ID: ${game.id}) has no bggId, skipping`);
          continue;
        }

        const categories = gameCategories[game.bggId];
        
        if (!categories || categories.length === 0) {
          console.log(`   ⚠️  No categories found for "${game.nameEn}" (BGG ID: ${game.bggId})`);
          continue;
        }

        console.log(`   ➕ Adding ${categories.length} categories to "${game.nameEn}": ${categories.join(', ')}`);
        
        const addedCount = await this.addCategoriesToGame(game.id, categories);
        this.totalAdded += addedCount;
        this.totalProcessed++;
      }

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < bggIds.length) {
        await this.delay();
      }
    }
  }

  async run() {
    try {
      console.log(`🚀 Starting category fetching...`);
      console.log(`📋 Will process up to ${LIMIT} games`);
      console.log(`📦 Processing in batches of ${BATCH_SIZE} games\n`);

      // Get games that have shop items but might not have categories
      // First, get all game IDs that have shop items
      const { data: shopItemsData, error: shopItemsError } = await supabaseAdmin
        .from('game_shop_items')
        .select('*')
        .limit(1000);
      
      if (shopItemsError) {
        console.error('Error fetching shop items:', shopItemsError);
        throw shopItemsError;
      }

      const gameIdsWithShopItems = [...new Set((shopItemsData || []).map(item => {
        // Handle both camelCase and snake_case
        return item.gameId || item.game_id;
      }).filter(Boolean))];
      
      console.log(`📦 Found ${gameIdsWithShopItems.length} unique games with shop items`);
      console.log(`   Game IDs: ${gameIdsWithShopItems.slice(0, 10).join(', ')}${gameIdsWithShopItems.length > 10 ? '...' : ''}`);

      if (gameIdsWithShopItems.length === 0) {
        console.log('❌ No games with shop items found');
        return;
      }

      // Get games that have shop items (check both with and without bggId requirement)
      const { data: allGames, error: allGamesError } = await supabaseAdmin
        .from('games')
        .select('id, nameEn, bggId')
        .in('id', gameIdsWithShopItems)
        .limit(LIMIT)
        .order('id', { ascending: true });
      
      if (allGamesError) {
        throw new Error(`Failed to fetch games: ${allGamesError.message}`);
      }

      // Filter to only games with bggId
      const games = (allGames || []).filter(g => g.bggId !== null);
      
      console.log(`   Found ${games.length} games with shop items that have bggId (out of ${allGames?.length || 0} total)`);

      if (games.length === 0) {
        console.log('❌ No games found to process');
        return;
      }

      console.log(`📊 Found ${games.length} games to check\n`);

      // Process games in batches
      for (let i = 0; i < games.length; i += 10) {
        const batch = games.slice(i, i + 10);
        console.log(`\n🔄 Processing batch ${Math.floor(i / 10) + 1}/${Math.ceil(games.length / 10)} (${batch.length} games)...`);
        
        await this.processGameBatch(batch);
        this.logProgress();

        // Delay between batches
        if (i + 10 < games.length) {
          await this.delay();
        }
      }

      console.log(`\n✅ COMPLETE!`);
      this.logProgress();

    } catch (error) {
      console.error('❌ Fatal error:', error);
      this.totalErrors++;
    }
  }
}

// Run the script
const fetcher = new CategoryFetcher();
fetcher.run().catch(console.error);

