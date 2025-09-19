const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class MassiveCollector {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
    this.totalCollected = 0;
    this.totalSkipped = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
    this.allFoundGames = new Set(); // Track all unique games found
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

  // Method 1: Hot List
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

  // Method 2: Collection endpoint with different users
  async collectFromCollections() {
    try {
      console.log(`📚 Collecting from BGG Collections...`);
      
      const users = ['boardgamegeek', 'admin', 'moderator'];
      let allGames = [];
      
      for (const username of users) {
        try {
          console.log(`   👤 Checking collection for user: ${username}`);
          
          const response = await axios.get(`https://boardgamegeek.com/xmlapi2/collection?username=${username}&subtype=boardgame&excludesubtype=boardgameexpansion&limit=100`);
          const data = this.parser.parse(response.data);
          
          if (data.items && data.items.item) {
            const userGames = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
            allGames = allGames.concat(userGames);
            console.log(`   📋 User ${username}: Found ${userGames.length} games`);
          }
          
          await this.delay(2000); // Be respectful
          
        } catch (error) {
          console.log(`   ⚠️ Could not get collection for ${username}: ${error.message}`);
        }
      }
      
      // Add to our master list
      allGames.forEach(game => {
        if (game.objectid) {
          this.allFoundGames.add(game.objectid);
        }
      });
      
      console.log(`   📋 Total collection games found: ${allGames.length}`);
      return allGames;
      
    } catch (error) {
      console.error('   ❌ Error collecting from collections:', error.message);
      return [];
    }
  }

  // Method 3: Search with MANY more terms
  async collectFromSearchTerms() {
    try {
      console.log(`🔍 Collecting from BGG Search Terms...`);
      
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
      
      for (const term of searchTerms) {
        try {
          console.log(`   🔍 Searching for: ${term}`);
          
          const response = await axios.get(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(term)}&type=boardgame&limit=100`);
          const data = this.parser.parse(response.data);
          
          if (data.items && data.items.item) {
            const termGames = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
            allGames = allGames.concat(termGames);
            console.log(`   📋 Term "${term}": Found ${termGames.length} games`);
          }
          
          await this.delay(1500); // Be respectful but faster
          
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

  // Method 4: Get games by year ranges
  async collectByYearRanges() {
    try {
      console.log(`📅 Collecting games by year ranges...`);
      
      const currentYear = new Date().getFullYear();
      const yearRanges = [
        { start: currentYear - 5, end: currentYear, name: 'Recent' },
        { start: currentYear - 10, end: currentYear - 6, name: 'Modern' },
        { start: currentYear - 20, end: currentYear - 11, name: 'Classic' },
        { start: currentYear - 30, end: currentYear - 21, name: 'Vintage' }
      ];
      
      let allGames = [];
      
      for (const range of yearRanges) {
        try {
          console.log(`   📅 Searching years ${range.start}-${range.end} (${range.name})`);
          
          for (let year = range.start; year <= range.end; year++) {
            const response = await axios.get(`https://boardgamegeek.com/xmlapi2/search?query=${year}&type=boardgame&limit=50`);
            const data = this.parser.parse(response.data);
            
            if (data.items && data.items.item) {
              const yearGames = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
              allGames = allGames.concat(yearGames);
              console.log(`   📋 Year ${year}: Found ${yearGames.length} games`);
            }
            
            await this.delay(1000);
          }
          
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

  // Method 5: Get games by ID ranges (smart approach)
  async collectByIDRanges() {
    try {
      console.log(`🔢 Collecting games by ID ranges...`);
      
      // Start from where we left off and go in chunks
      const idRanges = [
        { start: 1, end: 10000, name: 'Early Games' },
        { start: 10001, end: 50000, name: 'Classic Games' },
        { start: 50001, end: 100000, name: 'Modern Games' },
        { start: 100001, end: 200000, name: 'Recent Games' },
        { start: 200001, end: 300000, name: 'Latest Games' }
      ];
      
      let allGames = [];
      
      for (const range of idRanges) {
        try {
          console.log(`   🔢 Processing ID range ${range.start}-${range.end} (${range.name})`);
          
          // Sample every 100th ID to avoid overwhelming the API
          for (let id = range.start; id <= range.end; id += 100) {
            try {
              const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${id}&stats=1`);
              const data = this.parser.parse(response.data);
              
              if (data.items && data.items.item) {
                const game = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
                
                if (game.type === 'boardgame') {
                  allGames.push({ id: id.toString() });
                  this.allFoundGames.add(id.toString());
                  console.log(`   📋 ID ${id}: Found board game "${game.name?.[0]?.value || 'Unknown'}"`);
                }
              }
              
              await this.delay(500); // Fast but respectful
              
            } catch (error) {
              // Skip errors, continue with next ID
            }
          }
          
        } catch (error) {
          console.log(`   ⚠️ Error processing ID range ${range.start}-${range.end}: ${error.message}`);
        }
      }
      
      console.log(`   📋 Total ID-based games found: ${allGames.length}`);
      return allGames;
      
    } catch (error) {
      console.error('   ❌ Error collecting by ID ranges:', error.message);
      return [];
    }
  }

  // Process ALL games we found
  async processAllGames() {
    try {
      console.log(`🎯 Processing ALL ${this.allFoundGames.size} unique games found...`);
      
      const gameIds = Array.from(this.allFoundGames);
      let processed = 0;
      
      for (let i = 0; i < gameIds.length; i++) {
        const bggId = gameIds[i];
        
        try {
          console.log(`   🎯 [${i + 1}/${gameIds.length}] Processing: BGG ID ${bggId}`);
          
          const gameDetails = await this.getGameDetails(bggId);
          if (gameDetails) {
            this.totalCollected++;
            console.log(`   ✅ Successfully processed: ${gameDetails.nameEn}`);
          } else {
            this.totalSkipped++;
          }
          
          // Log progress every 50 games
          if (processed % 50 === 0) {
            await this.logProgress();
          }
          
          // Be respectful to BGG API
          await this.delay(1000);
          
        } catch (error) {
          console.error(`   ❌ Error processing game ${bggId}:`, error.message);
          this.totalErrors++;
        }
        
        processed++;
      }
      
    } catch (error) {
      console.error('❌ Error processing all games:', error);
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

  async runMassiveCollection() {
    try {
      console.log('🚀 STARTING MASSIVE GAME COLLECTION 🚀\n');
      console.log('⏰ Start time:', new Date().toLocaleString());
      console.log('🎯 This will find and process THOUSANDS of games...\n');
      
      // Phase 1: Find ALL games using multiple methods
      console.log('🔍 PHASE 1: Finding games using multiple methods...\n');
      
      await this.collectFromHotList();
      await this.delay(3000);
      
      await this.collectFromCollections();
      await this.delay(3000);
      
      await this.collectFromSearchTerms();
      await this.delay(3000);
      
      await this.collectByYearRanges();
      await this.delay(3000);
      
      await this.collectByIDRanges();
      
      console.log(`\n🎯 PHASE 1 COMPLETE! Found ${this.allFoundGames.size} unique games!`);
      
      // Phase 2: Process ALL games found
      console.log('\n🎯 PHASE 2: Processing ALL games found...\n');
      
      await this.processAllGames();
      
      // Final results
      console.log(`\n🏆 MASSIVE COLLECTION COMPLETED!`);
      console.log(`⏰ End time:`, new Date().toLocaleString());
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   🎯 Total Collected: ${this.totalCollected}`);
      console.log(`   ⏭️ Total Skipped: ${this.totalSkipped}`);
      console.log(`   ❌ Total Errors: ${this.totalErrors}`);
      console.log(`   🔍 Total Found: ${this.allFoundGames.size}`);
      
    } catch (error) {
      console.error('❌ Error in massive collection:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  try {
    const collector = new MassiveCollector();
    await collector.runMassiveCollection();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();

