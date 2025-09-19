const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class DirectPopularCollector {
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

  async collectFromSearchTerm(term, limit = 20) {
    try {
      console.log(`🔍 Collecting games for term: "${term}" (target: ${limit} games)...`);
      
      const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(term)}&type=boardgame&limit=100`;
      const response = await axios.get(url);
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log(`   ❌ No items found for term "${term}"`);
        return { collected: 0, skipped: 0, errors: 0 };
      }
      
      const games = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
      console.log(`   📋 Found ${games.length} games for term "${term}"`);
      
      // Debug: Show first few games
      console.log(`   🔍 First 3 games found:`);
      for (let i = 0; i < Math.min(3, games.length); i++) {
        const game = games[i];
        console.log(`      ${i + 1}. ID: ${game.id}, Name: ${game.name?.value || 'Unknown'}, Type: ${game.type}`);
      }
      
      return await this.processGames(games, limit, term);
      
    } catch (error) {
      console.error(`   ❌ Error collecting for term "${term}":`, error.message);
      return { collected: 0, skipped: 0, errors: 0 };
    }
  }

  async processGames(games, limit, termName) {
    let collected = 0;
    let skipped = 0;
    let errors = 0;
    
    console.log(`   🎯 Processing ${Math.min(games.length, limit * 2)} games from term "${termName}"...`);
    
    for (let i = 0; i < Math.min(games.length, limit * 2); i++) {
      const game = games[i];
      const bggId = game.id;
      
      if (!bggId) {
        console.log(`   ⚠️ Game ${i + 1} has no ID, skipping...`);
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
          
          // Log progress every 5 games
          if (collected % 5 === 0) {
            await this.logProgress();
          }
        } else {
          skipped++;
        }
        
        // Check if we've reached our limit
        if (collected >= limit) {
          console.log(`   ✅ Reached target limit of ${limit} games for term "${termName}"`);
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

  async runDirectCollection() {
    try {
      console.log('🚀 STARTING DIRECT POPULAR GAMES COLLECTION 🚀\n');
      console.log('⏰ Start time:', new Date().toLocaleString());
      console.log('🎯 This will collect games directly from search terms...\n');
      
      // Collect from specific search terms
      const searchTerms = ['strategy', 'family', 'party'];
      
      for (const term of searchTerms) {
        const results = await this.collectFromSearchTerm(term, 15);
        this.totalCollected += results.collected;
        this.totalSkipped += results.skipped;
        this.totalErrors += results.errors;
        
        await this.logProgress();
        
        // Break between terms
        if (term !== searchTerms[searchTerms.length - 1]) {
          console.log(`\n⏳ Waiting 5 seconds before next term...`);
          await this.delay(5000);
        }
      }
      
      // Final results
      console.log(`\n🏆 DIRECT POPULAR GAMES COLLECTION COMPLETED!`);
      console.log(`⏰ End time:`, new Date().toLocaleString());
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   🎯 Total Collected: ${this.totalCollected}`);
      console.log(`   ⏭️ Total Skipped: ${this.totalSkipped}`);
      console.log(`   ❌ Total Errors: ${this.totalErrors}`);
      
    } catch (error) {
      console.error('❌ Error in direct collection:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  try {
    const collector = new DirectPopularCollector();
    await collector.runDirectCollection();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
