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

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();
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
      const count = await prisma.gameCategory.count({
        where: { gameId: gameId }
      });
      return count > 0;
    } catch (error) {
      console.error(`Error checking categories for game ${gameId}:`, error.message);
      return false;
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
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'KingDice/1.0 (Category Fetcher)'
        }
      });

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
      console.error(`Error fetching from BGG API:`, error.message);
      return {};
    }
  }

  async findOrCreateCategory(categoryName) {
    try {
      // Try to find existing category
      let category = await prisma.category.findFirst({
        where: {
          OR: [
            { nameEn: categoryName },
            { nameEs: categoryName }
          ]
        }
      });

      // Create if not found
      if (!category) {
        category = await prisma.category.create({
          data: {
            nameEn: categoryName,
            nameEs: categoryName // For now, use same name for both languages
          }
        });
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
        const existing = await prisma.gameCategory.findUnique({
          where: {
            gameId_categoryId: {
              gameId: gameId,
              categoryId: category.id
            }
          }
        });

        if (!existing) {
          await prisma.gameCategory.create({
            data: {
              gameId: gameId,
              categoryId: category.id
            }
          });
          addedCount++;
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

      // Get games that have bggId but might not have categories
      // Prioritize games that have shop items
      const games = await prisma.game.findMany({
        where: {
          bggId: {
            not: null
          }
        },
        take: LIMIT,
        orderBy: {
          id: 'asc'
        },
        select: {
          id: true,
          nameEn: true,
          bggId: true
        }
      });

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
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run the script
const fetcher = new CategoryFetcher();
fetcher.run().catch(console.error);

