const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class MultiSourceCollector {
  constructor() {
    this.parser = new XMLParser();
    this.totalCollected = 0;
    this.totalSkipped = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async logProgress() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    console.log(`\n📊 PROGRESS UPDATE (${minutes}m ${seconds}s elapsed):`);
    console.log(`   🎯 Collected: ${this.totalCollected}`);
    console.log(`   ⏭️ Skipped: ${this.totalSkipped}`);
    console.log(`   ❌ Errors: ${this.totalErrors}`);
    console.log(`   🚀 Rate: ${Math.round(this.totalCollected / (elapsed / 60))} games/minute`);
  }

  async checkIfGameExists(name) {
    try {
      const existingGame = await prisma.game.findFirst({
        where: {
          OR: [
            { nameEn: name },
            { nameEs: name }
          ]
        }
      });
      return existingGame !== null;
    } catch (error) {
      console.error('Error checking if game exists:', error);
      return false;
    }
  }

  async collectFromHotList(limit = 50) {
    try {
      console.log(`🔥 Collecting from BGG Hot List (target: ${limit} games)...`);
      
      const response = await axios.get('https://boardgamegeek.com/xmlapi2/hot?type=boardgame');
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log('   ❌ No items found in hot list');
        return { collected: 0, skipped: 0, errors: 0 };
      }
      
      const games = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
      console.log(`   📋 Found ${games.length} hot games to process`);
      
      return await this.processGames(games, limit, 'Hot List');
      
    } catch (error) {
      console.error('   ❌ Error collecting from hot list:', error.message);
      return { collected: 0, skipped: 0, errors: 0 };
    }
  }

  async collectFromTopRated(limit = 50) {
    try {
      console.log(`🏆 Collecting from BGG Top Rated Games (target: ${limit} games)...`);
      
      // Get top rated games from different pages
      let allGames = [];
      
      for (let page = 1; page <= 3; page++) {
        const offset = (page - 1) * 100;
        const url = `https://boardgamegeek.com/xmlapi2/collection?username=boardgamegeek&top=1&subtype=boardgame&excludesubtype=boardgameexpansion&offset=${offset}&limit=100`;
        
        console.log(`   📄 Processing page ${page} (offset: ${offset})`);
        
        const response = await axios.get(url);
        const data = this.parser.parse(response.data);
        
        if (data.items && data.items.item) {
          const pageGames = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
          allGames = allGames.concat(pageGames);
          console.log(`   📋 Page ${page}: Found ${pageGames.length} games`);
        }
        
        // Delay between pages
        if (page < 3) {
          await this.delay(3000);
        }
      }
      
      console.log(`   📋 Total top rated games found: ${allGames.length}`);
      return await this.processGames(allGames, limit, 'Top Rated');
      
    } catch (error) {
      console.error('   ❌ Error collecting from top rated:', error.message);
      return { collected: 0, skipped: 0, errors: 0 };
    }
  }

  async collectFromMostPopular(limit = 50) {
    try {
      console.log(`⭐ Collecting from BGG Most Popular Games (target: ${limit} games)...`);
      
      // Get most popular games by searching for common terms
      const searchTerms = ['strategy', 'family', 'party', 'cooperative', 'deck building', 'worker placement'];
      let allGames = [];
      
      for (const term of searchTerms) {
        console.log(`   🔍 Searching for: ${term}`);
        
        const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(term)}&type=boardgame&limit=50`;
        const response = await axios.get(url);
        const data = this.parser.parse(response.data);
        
        if (data.items && data.items.item) {
          const termGames = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
          allGames = allGames.concat(termGames);
          console.log(`   📋 Term "${term}": Found ${termGames.length} games`);
        }
        
        // Delay between searches
        await this.delay(2000);
      }
      
      // Remove duplicates by BGG ID
      const uniqueGames = allGames.filter((game, index, self) => 
        index === self.findIndex(g => g.id === game.id)
      );
      
      console.log(`   📋 Total unique popular games found: ${uniqueGames.length}`);
      return await this.processGames(uniqueGames, limit, 'Most Popular');
      
    } catch (error) {
      console.error('   ❌ Error collecting from most popular:', error.message);
      return { collected: 0, skipped: 0, errors: 0 };
    }
  }

  async collectFromNewReleases(limit = 50) {
    try {
      console.log(`🆕 Collecting from BGG New Releases (target: ${limit} games)...`);
      
      // Get recent games by searching for games from current year
      const currentYear = new Date().getFullYear();
      const url = `https://boardgamegeek.com/xmlapi2/search?query=${currentYear}&type=boardgame&limit=100`;
      
      const response = await axios.get(url);
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log('   ❌ No items found in new releases');
        return { collected: 0, skipped: 0, errors: 0 };
      }
      
      const games = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
      console.log(`   📋 Found ${games.length} new release games to process`);
      
      return await this.processGames(games, limit, 'New Releases');
      
    } catch (error) {
      console.error('   ❌ Error collecting from new releases:', error.message);
      return { collected: 0, skipped: 0, errors: 0 };
    }
  }

  async processGames(games, limit, sourceName) {
    let collected = 0;
    let skipped = 0;
    let errors = 0;
    
    for (let i = 0; i < Math.min(games.length, limit * 2); i++) {
      const game = games[i];
      const bggId = game.id || game.objectid;
      
      if (!bggId) {
        errors++;
        continue;
      }
      
      console.log(`   🎯 [${i + 1}/${Math.min(games.length, limit * 2)}] Processing: BGG ID ${bggId}`);
      
      try {
        // Get detailed game info
        const gameDetails = await this.getGameDetails(bggId);
        if (gameDetails) {
          collected++;
          console.log(`   ✅ Successfully processed: ${gameDetails.nameEn}`);
        } else {
          skipped++;
        }
        
        // Check if we've reached our limit
        if (collected >= limit) {
          console.log(`   ✅ Reached target limit of ${limit} games for ${sourceName}`);
          break;
        }
        
        // Be respectful to BGG API - add delay between requests
        if (i < Math.min(games.length, limit * 2) - 1) {
          await this.delay(2000); // 2 seconds delay
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing game ${bggId}:`, error.message);
        errors++;
      }
    }
    
    return { collected, skipped, errors };
  }

  async getGameDetails(bggId) {
    try {
      const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`);
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log(`   ⚠️ No data found for game ${bggId}`);
        return null;
      }

      const gameData = data.items.item;
      const game = Array.isArray(gameData) ? gameData[0] : gameData;
      
      // Extract game information
      const name = this.extractName(game);
      if (!name || name === 'Unknown') {
        console.log(`   ⚠️ Skipping game ${bggId} - no valid name found`);
        return null;
      }

      // Check if game already exists
      if (await this.checkIfGameExists(name)) {
        console.log(`   ⏭️ Skipping "${name}" - already exists in database`);
        return null;
      }

      const year = this.extractYear(game);
      const players = this.extractPlayers(game);
      const duration = this.extractDuration(game);
      const imageUrl = this.extractImage(game);
      const designer = this.extractDesigner(game);
      const developer = this.extractDeveloper(game);
      const description = this.extractDescription(game);
      
      console.log(`   📝 Extracted data for "${name}": year=${year}, players=${players.min}-${players.max}, designer=${designer}, developer=${developer}`);
      
      // Create game in database
      const createdGame = await this.createGame({
        bggId: parseInt(bggId),
        nameEn: name,
        nameEs: name, // For now, use English name for Spanish
        yearRelease: year,
        minPlayers: players.min,
        maxPlayers: players.max,
        durationMinutes: duration,
        thumbnailUrl: imageUrl,
        designer: designer,
        developer: developer
      });

      // Add description if available
      if (description) {
        await this.addDescription(createdGame.id, description);
      }

      // Add default categories
      await this.addDefaultCategories(createdGame.id);

      return createdGame;
      
    } catch (error) {
      console.error(`   ❌ Error getting game details for ${bggId}:`, error.message);
      return null;
    }
  }

  extractName(game) {
    if (!game.name) return null;
    
    if (Array.isArray(game.name)) {
      const primaryName = game.name.find(n => n.type === 'primary');
      if (primaryName) return primaryName.value;
      return game.name[0]?.value || null;
    }
    
    return game.name.value;
  }

  extractYear(game) {
    if (!game.yearpublished) return null;
    return parseInt(game.yearpublished.value);
  }

  extractPlayers(game) {
    const min = game.minplayers ? parseInt(game.minplayers.value) : 1;
    const max = game.maxplayers ? parseInt(game.maxplayers.value) : 4;
    return { min, max };
  }

  extractDuration(game) {
    if (!game.playingtime) return 60;
    return parseInt(game.playingtime.value);
  }

  extractImage(game) {
    return game.thumbnail || null;
  }

  extractDesigner(game) {
    if (!game.link) return null;
    const designerLink = game.link.find(l => l.type === 'boardgamedesigner');
    return designerLink ? designerLink.value : null;
  }

  extractDeveloper(game) {
    if (!game.link) return null;
    const developerLink = game.link.find(l => l.type === 'boardgamepublisher');
    return developerLink ? developerLink.value : null;
  }

  extractDescription(game) {
    return game.description || null;
  }

  async createGame(gameData) {
    try {
      const game = await prisma.game.create({
        data: gameData
      });
      return game;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  async addDescription(gameId, description) {
    try {
      const shortDescription = description.length <= 200 ? description : description.substring(0, 200) + '...';
      
      await prisma.gameDescription.create({
        data: {
          gameId,
          language: 'en',
          shortDescription,
          fullDescription: description
        }
      });
    } catch (error) {
      console.error('Error adding description:', error);
    }
  }

  async addDefaultCategories(gameId) {
    try {
      const defaultCategories = ['Strategy', 'Family', 'Party'];
      
      for (const categoryName of defaultCategories) {
        let category = await prisma.category.findFirst({
          where: { nameEn: categoryName }
        });
        
        if (!category) {
          category = await prisma.category.create({
            data: {
              nameEn: categoryName,
              nameEs: categoryName
            }
          });
        }
        
        await prisma.gameCategory.create({
          data: {
            gameId,
            categoryId: category.id
          }
        });
      }
    } catch (error) {
      console.error('Error adding default categories:', error);
    }
  }

  async runMultiSourceCollection() {
    try {
      console.log('🚀 STARTING MULTI-SOURCE GAME COLLECTION 🚀\n');
      console.log('⏰ Start time:', new Date().toLocaleString());
      console.log('🎯 This will collect games from multiple BGG sources...\n');
      
      // Collect from different sources
      const hotResults = await this.collectFromHotList(30);
      this.totalCollected += hotResults.collected;
      this.totalSkipped += hotResults.skipped;
      this.totalErrors += hotResults.errors;
      
      await this.logProgress();
      await this.delay(5000); // 5 second break
      
      const topResults = await this.collectFromTopRated(40);
      this.totalCollected += topResults.collected;
      this.totalSkipped += topResults.skipped;
      this.totalErrors += topResults.errors;
      
      await this.logProgress();
      await this.delay(5000); // 5 second break
      
      const popularResults = await this.collectFromMostPopular(30);
      this.totalCollected += popularResults.collected;
      this.totalSkipped += popularResults.skipped;
      this.totalErrors += popularResults.errors;
      
      await this.logProgress();
      await this.delay(5000); // 5 second break
      
      const newResults = await this.collectFromNewReleases(30);
      this.totalCollected += newResults.collected;
      this.totalSkipped += newResults.skipped;
      this.totalErrors += newResults.errors;
      
      // Final results
      console.log(`\n🏆 MULTI-SOURCE COLLECTION COMPLETED!`);
      console.log(`⏰ End time:`, new Date().toLocaleString());
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   🎯 Total Collected: ${this.totalCollected}`);
      console.log(`   ⏭️ Total Skipped: ${this.totalSkipped}`);
      console.log(`   ❌ Total Errors: ${this.totalErrors}`);
      
    } catch (error) {
      console.error('❌ Error in multi-source collection:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  try {
    const collector = new MultiSourceCollector();
    await collector.runMultiSourceCollection();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
