const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

class SmartCollector {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
    
    this.progressFile = 'collection-progress.json';
    this.foundGamesFile = 'found-games.json';
    
    this.totalCollected = 0;
    this.totalSkipped = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
    this.allFoundGames = new Set();
    
    // Load previous progress if exists
    this.loadProgress();
  }

  async loadProgress() {
    try {
      // Load found games
      if (await this.fileExists(this.foundGamesFile)) {
        const foundGamesData = await fs.readFile(this.foundGamesFile, 'utf8');
        const foundGames = JSON.parse(foundGamesData);
        this.allFoundGames = new Set(foundGames);
        console.log(`📂 Loaded ${this.allFoundGames.size} previously found games`);
      }
      
      // Load progress
      if (await this.fileExists(this.progressFile)) {
        const progressData = await fs.readFile(this.progressFile, 'utf8');
        const progress = JSON.parse(progressData);
        this.totalCollected = progress.totalCollected || 0;
        this.totalSkipped = progress.totalSkipped || 0;
        this.totalErrors = progress.totalErrors || 0;
        console.log(`📂 Loaded previous progress: ${this.totalCollected} collected, ${this.totalSkipped} skipped`);
      }
    } catch (error) {
      console.log('📂 No previous progress found, starting fresh');
    }
  }

  async saveProgress() {
    try {
      // Save found games
      const foundGamesArray = Array.from(this.allFoundGames);
      await fs.writeFile(this.foundGamesFile, JSON.stringify(foundGamesArray, null, 2));
      
      // Save progress
      const progress = {
        totalCollected: this.totalCollected,
        totalSkipped: this.totalSkipped,
        totalErrors: this.totalErrors,
        lastUpdated: new Date().toISOString()
      };
      await fs.writeFile(this.progressFile, JSON.stringify(progress, null, 2));
      
      console.log('💾 Progress saved successfully');
    } catch (error) {
      console.error('❌ Error saving progress:', error.message);
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
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
    console.log(`   🔍 Total Found: ${this.allFoundGames.size}`);
    console.log(`   🚀 Rate: ${Math.round(this.totalCollected / (elapsed / 60))} games/minute`);
    
    // Save progress every time we log
    await this.saveProgress();
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

  // Method 1: Hot List (small batch)
  async collectFromHotList() {
    try {
      console.log(`🔥 Collecting from BGG Hot List...`);
      
      const response = await axios.get('https://boardgamegeek.com/xmlapi2/hot?type=boardgame');
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log('   ❌ No items found in hot list');
        return [];
      }
      
      const games = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
      console.log(`   📋 Found ${games.length} hot games`);
      
      // Add to our master list
      games.forEach(game => {
        if (game.id) {
          this.allFoundGames.add(game.id);
        }
      });
      
      return games;
      
    } catch (error) {
      console.error('   ❌ Error collecting from hot list:', error.message);
      return [];
    }
  }

  // Method 2: Search with focused terms (smaller batches)
  async collectFromSearchTerms(batchSize = 10) {
    try {
      console.log(`🔍 Collecting from BGG Search Terms (batch ${batchSize})...`);
      
      const searchTerms = [
        'strategy', 'family', 'party', 'cooperative', 'deck building', 'worker placement',
        'euro', 'ameritrash', 'card game', 'dice game', 'war game', 'abstract',
        'puzzle', 'adventure', 'fantasy', 'sci-fi', 'horror', 'mystery',
        'racing', 'sports', 'economic', 'negotiation', 'area control', 'tile placement',
        'drafting', 'set collection', 'hand management', 'memory', 'dexterity',
        'roll and write', 'social deduction', 'hidden movement', 'legacy', 'campaign',
        'solo', 'two player', 'multiplayer', 'quick', 'long', 'complex', 'simple',
        'classic', 'modern', 'indie', 'kickstarter', 'award', 'popular', 'new'
      ];
      
      let allGames = [];
      let processed = 0;
      
      for (const term of searchTerms) {
        try {
          console.log(`   🔍 Searching for: ${term} (${processed + 1}/${searchTerms.length})`);
          
          const response = await axios.get(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(term)}&type=boardgame&limit=${batchSize}`);
          const data = this.parser.parse(response.data);
          
          if (data.items && data.items.item) {
            const termGames = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
            allGames = allGames.concat(termGames);
            console.log(`   📋 Term "${term}": Found ${termGames.length} games`);
          }
          
          processed++;
          
          // Save progress every 5 terms
          if (processed % 5 === 0) {
            await this.saveProgress();
          }
          
          await this.delay(2000); // Be respectful
          
        } catch (error) {
          console.log(`   ⚠️ Error searching for "${term}": ${error.message}`);
        }
      }
      
      // Add to our master list
      allGames.forEach(game => {
        if (game.id) {
          this.allFoundGames.add(game.id);
        }
      });
      
      console.log(`   📋 Total search games found: ${allGames.length}`);
      return allGames;
      
    } catch (error) {
      console.error('   ❌ Error collecting from search terms:', error.message);
      return [];
    }
  }

  // Method 3: Get games by year ranges (smaller chunks)
  async collectByYearRanges(batchSize = 5) {
    try {
      console.log(`📅 Collecting games by year ranges (batch ${batchSize})...`);
      
      const currentYear = new Date().getFullYear();
      const yearRanges = [
        { start: currentYear - 5, end: currentYear, name: 'Recent' },
        { start: currentYear - 10, end: currentYear - 6, name: 'Modern' },
        { start: currentYear - 20, end: currentYear - 11, name: 'Classic' }
      ];
      
      let allGames = [];
      let rangeProcessed = 0;
      
      for (const range of yearRanges) {
        try {
          console.log(`   📅 Searching years ${range.start}-${range.end} (${range.name}) - ${rangeProcessed + 1}/${yearRanges.length}`);
          
          for (let year = range.start; year <= range.end; year++) {
            try {
              const response = await axios.get(`https://boardgamegeek.com/xmlapi2/search?query=${year}&type=boardgame&limit=${batchSize}`);
              const data = this.parser.parse(response.data);
              
              if (data.items && data.items.item) {
                const yearGames = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
                allGames = allGames.concat(yearGames);
                console.log(`   📋 Year ${year}: Found ${yearGames.length} games`);
              }
              
              await this.delay(1500);
              
            } catch (error) {
              console.log(`   ⚠️ Error searching year ${year}: ${error.message}`);
            }
          }
          
          rangeProcessed++;
          
          // Save progress after each range
          await this.saveProgress();
          
        } catch (error) {
          console.log(`   ⚠️ Error searching years ${range.start}-${range.end}: ${error.message}`);
        }
      }
      
      // Add to our master list
      allGames.forEach(game => {
        if (game.id) {
          this.allFoundGames.add(game.id);
        }
      });
      
      console.log(`   📋 Total year-based games found: ${allGames.length}`);
      return allGames;
      
    } catch (error) {
      console.error('   ❌ Error collecting by year ranges:', error.message);
      return [];
    }
  }

  // Process games in small batches
  async processGamesInBatches(batchSize = 20) {
    try {
      const gameIds = Array.from(this.allFoundGames);
      const totalGames = gameIds.length;
      
      console.log(`🎯 Processing ${totalGames} games in batches of ${batchSize}...`);
      
      let processed = 0;
      let batchNumber = 1;
      
      for (let i = 0; i < totalGames; i += batchSize) {
        const batch = gameIds.slice(i, i + batchSize);
        const batchStart = i + 1;
        const batchEnd = Math.min(i + batchSize, totalGames);
        
        console.log(`\n📦 Processing Batch ${batchNumber}: Games ${batchStart}-${batchEnd} of ${totalGames}`);
        
        for (let j = 0; j < batch.length; j++) {
          const bggId = batch[j];
          const gameIndex = i + j + 1;
          
          try {
            console.log(`   🎯 [${gameIndex}/${totalGames}] Processing: BGG ID ${bggId}`);
            
            const gameDetails = await this.getGameDetails(bggId);
            if (gameDetails) {
              this.totalCollected++;
              console.log(`   ✅ Successfully processed: ${gameDetails.nameEn}`);
            } else {
              this.totalSkipped++;
            }
            
            // Be respectful to BGG API
            await this.delay(1000);
            
          } catch (error) {
            console.error(`   ❌ Error processing game ${bggId}:`, error.message);
            this.totalErrors++;
          }
          
          processed++;
        }
        
        // Log progress after each batch
        await this.logProgress();
        
        // Save progress after each batch
        await this.saveProgress();
        
        batchNumber++;
        
        // Small delay between batches
        if (i + batchSize < totalGames) {
          console.log(`   ⏳ Waiting 5 seconds before next batch...`);
          await this.delay(5000);
        }
      }
      
      console.log(`\n🎯 All batches completed! Processed ${processed} games`);
      
    } catch (error) {
      console.error('❌ Error processing games in batches:', error);
    }
  }

  // Use the EXACT SAME method that worked
  async getGameDetails(bggId) {
    try {
      const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`);
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        return null;
      }

      const gameData = data.items.item;
      const game = Array.isArray(gameData) ? gameData[0] : gameData;
      
      // Extract game information
      const name = this.extractName(game);
      if (!name || name === 'Unknown') {
        return null;
      }

      // Check if game already exists
      if (await this.checkIfGameExists(name)) {
        return null;
      }

      const year = this.extractYear(game);
      const players = this.extractPlayers(game);
      const duration = this.extractDuration(game);
      const imageUrl = this.extractImage(game);
      const designer = this.extractDesigner(game);
      const developer = this.extractDeveloper(game);
      const description = this.extractDescription(game);
      
      // Create game in database
      const createdGame = await this.createGame({
        bggId: parseInt(bggId),
        nameEn: name,
        nameEs: name,
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
      return null;
    }
  }

  // Use the EXACT SAME extraction methods that worked
  extractName(game) {
    try {
      if (game.name) {
        if (Array.isArray(game.name)) {
          const primaryName = game.name.find(n => n.type === 'primary');
          if (primaryName && primaryName.value) {
            return primaryName.value;
          }
          if (game.name[0] && game.name[0].value) {
            return game.name[0].value;
          }
        } else {
          if (game.name.value) {
            return game.name.value;
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractYear(game) {
    try {
      if (game.yearpublished && game.yearpublished.value) {
        const year = parseInt(game.yearpublished.value);
        return isNaN(year) ? null : year;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractPlayers(game) {
    try {
      if (game.minplayers && game.maxplayers) {
        const min = parseInt(game.minplayers.value);
        const max = parseInt(game.maxplayers.value);
        if (!isNaN(min) && !isNaN(max)) {
          return { min, max };
        }
      }
      return { min: 1, max: 4 };
    } catch (error) {
      return { min: 1, max: 4 };
    }
  }

  extractDuration(game) {
    try {
      if (game.playingtime && game.playingtime.value) {
        const duration = parseInt(game.playingtime.value);
        return isNaN(duration) ? null : duration;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractImage(game) {
    try {
      if (game.thumbnail && game.thumbnail.value) {
        return game.thumbnail.value;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractDesigner(game) {
    try {
      if (game.link) {
        const links = Array.isArray(game.link) ? game.link : [game.link];
        const designerLink = links.find(l => l.type === 'boardgamedesigner');
        if (designerLink && designerLink.value) {
          return designerLink.value;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractDeveloper(game) {
    try {
      if (game.link) {
        const links = Array.isArray(game.link) ? game.link : [game.link];
        const developerLink = links.find(l => l.type === 'boardgamepublisher');
        if (developerLink && developerLink.value) {
          return developerLink.value;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractDescription(game) {
    try {
      if (game.description) {
        return this.cleanDescription(game.description);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  cleanDescription(description) {
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  async createGame(gameData) {
    try {
      if (!gameData.nameEn || !gameData.bggId) {
        throw new Error('Game name and BGG ID are required');
      }

      const game = await prisma.game.upsert({
        where: { bggId: gameData.bggId },
        update: gameData,
        create: gameData
      });
      return game;
    } catch (error) {
      throw error;
    }
  }

  async addDescription(gameId, description) {
    try {
      const shortDescription = this.createShortDescription(description);
      
      await prisma.gameDescription.upsert({
        where: {
          gameId_language: {
            gameId,
            language: 'en'
          }
        },
        update: {
          shortDescription: shortDescription,
          fullDescription: description
        },
        create: {
          gameId,
          language: 'en',
          shortDescription: shortDescription,
          fullDescription: description
        }
      });
    } catch (error) {
      // Skip description errors
    }
  }

  createShortDescription(description) {
    if (description.length <= 200) {
      return description;
    }
    return description.substring(0, 200) + '...';
  }

  async addDefaultCategories(gameId) {
    try {
      const defaultCategories = ['Strategy', 'Family', 'Party'];
      
      for (const categoryName of defaultCategories) {
        const category = await prisma.category.findFirst({
          where: { nameEn: categoryName }
        });
        
        if (category) {
          await prisma.gameCategory.upsert({
            where: {
              gameId_categoryId: {
                gameId,
                categoryId: category.id
              }
            },
            update: {},
            create: {
              gameId,
              categoryId: category.id
            }
          });
        }
      }
    } catch (error) {
      // Skip category errors
    }
  }

  async runSmartCollection() {
    try {
      console.log('🚀 STARTING SMART GAME COLLECTION 🚀\n');
      console.log('⏰ Start time:', new Date().toLocaleString());
      console.log('🎯 This will find and process games efficiently with progress saving...\n');
      
      // Phase 1: Find games using multiple methods (smaller batches)
      console.log('🔍 PHASE 1: Finding games using multiple methods...\n');
      
      await this.collectFromHotList();
      await this.delay(3000);
      
      await this.collectFromSearchTerms(15); // Smaller batch size
      await this.delay(3000);
      
      await this.collectByYearRanges(8); // Smaller batch size
      
      console.log(`\n🎯 PHASE 1 COMPLETE! Found ${this.allFoundGames.size} unique games!`);
      
      // Phase 2: Process games in small batches
      console.log('\n🎯 PHASE 2: Processing games in small batches...\n');
      
      await this.processGamesInBatches(25); // Process 25 games at a time
      
      // Final results
      console.log(`\n🏆 SMART COLLECTION COMPLETED!`);
      console.log(`⏰ End time:`, new Date().toLocaleString());
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   🎯 Total Collected: ${this.totalCollected}`);
      console.log(`   ⏭️ Total Skipped: ${this.totalSkipped}`);
      console.log(`   ❌ Total Errors: ${this.totalErrors}`);
      console.log(`   🔍 Total Found: ${this.allFoundGames.size}`);
      
      // Final save
      await this.saveProgress();
      
    } catch (error) {
      console.error('❌ Error in smart collection:', error);
      // Save progress even on error
      await this.saveProgress();
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  try {
    const collector = new SmartCollector();
    await collector.runSmartCollection();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
