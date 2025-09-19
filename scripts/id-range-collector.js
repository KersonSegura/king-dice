const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class IDRangeCollector {
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

  async collectFromIDRange(startId, endId, limit = 100) {
    try {
      console.log(`🔢 Collecting games from BGG ID range ${startId} to ${endId} (target: ${limit} games)...`);
      
      let collected = 0;
      let skipped = 0;
      let errors = 0;
      
      for (let bggId = startId; bggId <= endId && collected < limit; bggId++) {
        console.log(`   🎯 [${bggId - startId + 1}/${endId - startId + 1}] Processing BGG ID: ${bggId}`);
        
        try {
          // Get detailed game info
          const gameDetails = await this.getGameDetails(bggId);
          if (gameDetails) {
            collected++;
            console.log(`   ✅ Successfully processed: ${gameDetails.nameEn}`);
            
            // Log progress every 10 games
            if (collected % 10 === 0) {
              await this.logProgress();
            }
          } else {
            skipped++;
          }
          
          // Be respectful to BGG API - add delay between requests
          await this.delay(2000); // 2 seconds delay
          
        } catch (error) {
          console.error(`   ❌ Error processing BGG ID ${bggId}:`, error.message);
          errors++;
        }
      }
      
      return { collected, skipped, errors };
      
    } catch (error) {
      console.error(`   ❌ Error collecting from ID range ${startId}-${endId}:`, error.message);
      return { collected: 0, skipped: 0, errors: 0 };
    }
  }

  async getGameDetails(bggId) {
    try {
      const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`);
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log(`   ⚠️ No data found for BGG ID ${bggId}`);
        return null;
      }

      const gameData = data.items.item;
      const game = Array.isArray(gameData) ? gameData[0] : gameData;
      
      // Check if it's actually a board game
      if (game.type !== 'boardgame') {
        console.log(`   ⚠️ BGG ID ${bggId} is not a board game (type: ${game.type})`);
        return null;
      }
      
      // Extract game information
      const name = this.extractName(game);
      if (!name || name === 'Unknown') {
        console.log(`   ⚠️ Skipping BGG ID ${bggId} - no valid name found`);
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
      console.error(`   ❌ Error getting game details for BGG ID ${bggId}:`, error.message);
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

  async runIDRangeCollection() {
    try {
      console.log('🚀 STARTING ID RANGE GAME COLLECTION 🚀\n');
      console.log('⏰ Start time:', new Date().toLocaleString());
      console.log('🎯 This will collect games by iterating through BGG ID ranges...\n');
      
      // Collect from different ID ranges
      const idRanges = [
        { start: 1, end: 1000, limit: 50 },      // Early games
        { start: 1001, end: 5000, limit: 50 },   // Classic games
        { start: 5001, end: 10000, limit: 50 },  // Modern games
        { start: 10001, end: 20000, limit: 50 }, // Recent games
        { start: 20001, end: 30000, limit: 50 }  // Latest games
      ];
      
      for (const range of idRanges) {
        console.log(`\n🔢 Processing ID range ${range.start}-${range.end}...`);
        
        const results = await this.collectFromIDRange(range.start, range.end, range.limit);
        this.totalCollected += results.collected;
        this.totalSkipped += results.skipped;
        this.totalErrors += results.errors;
        
        await this.logProgress();
        
        // Break between ranges
        if (range !== idRanges[idRanges.length - 1]) {
          console.log(`\n⏳ Waiting 10 seconds before next range...`);
          await this.delay(10000);
        }
      }
      
      // Final results
      console.log(`\n🏆 ID RANGE COLLECTION COMPLETED!`);
      console.log(`⏰ End time:`, new Date().toLocaleString());
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   🎯 Total Collected: ${this.totalCollected}`);
      console.log(`   ⏭️ Total Skipped: ${this.totalSkipped}`);
      console.log(`   ❌ Total Errors: ${this.totalErrors}`);
      
    } catch (error) {
      console.error('❌ Error in ID range collection:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  try {
    const collector = new IDRangeCollector();
    await collector.runIDRangeCollection();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
