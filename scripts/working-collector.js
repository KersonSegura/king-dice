const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class WorkingCollector {
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

  // Method 1: Use the SAME logic that worked for our 50 games
  async collectFromHotList(limit = 100) {
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

  // Method 2: Use collection endpoint with top games (this worked before)
  async collectFromTopGames(limit = 100) {
    try {
      console.log(`🏆 Collecting from BGG Top Games (target: ${limit} games)...`);
      
      // Use the collection endpoint that worked before
      const response = await axios.get('https://boardgamegeek.com/xmlapi2/collection?username=boardgamegeek&top=1&subtype=boardgame&excludesubtype=boardgameexpansion&limit=100');
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log('   ❌ No items found in top games');
        return { collected: 0, skipped: 0, errors: 0 };
      }
      
      const games = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
      console.log(`   📋 Found ${games.length} top games to process`);
      
      return await this.processGames(games, limit, 'Top Games');
      
    } catch (error) {
      console.error('   ❌ Error collecting from top games:', error.message);
      return { collected: 0, skipped: 0, errors: 0 };
    }
  }

  // Method 3: Use search endpoint with specific terms (this should work)
  async collectFromSearchTerms(limit = 100) {
    try {
      console.log(`🔍 Collecting from BGG Search Terms (target: ${limit} games)...`);
      
      const searchTerms = ['strategy', 'family', 'party', 'cooperative'];
      let allGames = [];
      
      for (const term of searchTerms) {
        console.log(`   🔍 Searching for: ${term}`);
        
        const response = await axios.get(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(term)}&type=boardgame&limit=50`);
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
      
      console.log(`   📋 Total unique games found: ${uniqueGames.length}`);
      return await this.processGames(uniqueGames, limit, 'Search Terms');
      
    } catch (error) {
      console.error('   ❌ Error collecting from search terms:', error.message);
      return { collected: 0, skipped: 0, errors: 0 };
    }
  }

  async processGames(games, limit, sourceName) {
    let collected = 0;
    let skipped = 0;
    let errors = 0;
    
    console.log(`   🎯 Processing ${Math.min(games.length, limit * 2)} games from ${sourceName}...`);
    
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
        // Get detailed game info using the SAME method that worked
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

  // Use the EXACT SAME method that worked for our 50 games
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
      
      // Extract game information with the SAME logic that worked
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
      
      // Create game in database using the SAME method
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

  // Use the EXACT SAME extraction methods that worked
  extractName(game) {
    try {
      if (game.name) {
        // Handle case where name is an array (multiple languages)
        if (Array.isArray(game.name)) {
          // Find the primary name (type: "primary")
          const primaryName = game.name.find(n => n.type === 'primary');
          if (primaryName && primaryName.value) {
            return primaryName.value;
          }
          // Fallback to first name if no primary found
          if (game.name[0] && game.name[0].value) {
            return game.name[0].value;
          }
        } else {
          // Handle single name object
          if (game.name.value) {
            return game.name.value;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting name:', error);
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
        // BGG provides description as a direct string, not as an object with .value
        return this.cleanDescription(game.description);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  cleanDescription(description) {
    if (!description) return '';
    
    // Remove HTML tags and clean up the description
    return description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Non-breaking space
      .replace(/&amp;/g, '&') // Ampersand
      .replace(/&lt;/g, '<') // Less than
      .replace(/&gt;/g, '>') // Greater than
      .replace(/&quot;/g, '"') // Quote
      .replace(/&#39;/g, "'") // Single quote
      .replace(/&apos;/g, "'") // Single quote (alternative)
      .replace(/&mdash;/g, '—') // Em dash
      .replace(/&ndash;/g, '–') // En dash
      .replace(/&hellip;/g, '...') // Ellipsis
      .replace(/&#10;/g, '\n') // Line break
      .replace(/&#13;/g, '\r') // Carriage return
      .replace(/&#9;/g, '\t') // Tab
      .replace(/&copy;/g, '©') // Copyright
      .replace(/&reg;/g, '®') // Registered trademark
      .replace(/&trade;/g, '™') // Trademark
      .replace(/&deg;/g, '°') // Degree
      .replace(/&plusmn;/g, '±') // Plus-minus
      .replace(/&times;/g, '×') // Multiplication
      .replace(/&divide;/g, '÷') // Division
      .replace(/&frac12;/g, '½') // Fraction 1/2
      .replace(/&frac14;/g, '¼') // Fraction 1/4
      .replace(/&frac34;/g, '¾') // Fraction 3/4
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\n\s*\n/g, '\n\n') // Multiple line breaks to double line breaks
      .trim();
  }

  async createGame(gameData) {
    try {
      // Validate required fields
      if (!gameData.nameEn) {
        throw new Error('Game name is required');
      }
      if (!gameData.bggId) {
        throw new Error('BGG ID is required');
      }

      const game = await prisma.game.upsert({
        where: { bggId: gameData.bggId },
        update: gameData,
        create: gameData
      });
      return game;
    } catch (error) {
      console.error('Error creating/updating game:', error);
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
      console.error('Error adding description:', error);
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
      // Add some default categories based on common game types
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
      console.error('Error adding default categories:', error);
    }
  }

  async runWorkingCollection() {
    try {
      console.log('🚀 STARTING WORKING GAME COLLECTION 🚀\n');
      console.log('⏰ Start time:', new Date().toLocaleString());
      console.log('🎯 This will use the EXACT SAME logic that worked for our 50 games...\n');
      
      // Method 1: Hot List (this worked before)
      const hotResults = await this.collectFromHotList(50);
      this.totalCollected += hotResults.collected;
      this.totalSkipped += hotResults.skipped;
      this.totalErrors += hotResults.errors;
      
      await this.logProgress();
      await this.delay(5000); // 5 second break
      
      // Method 2: Top Games (this worked before)
      const topResults = await this.collectFromTopGames(50);
      this.totalCollected += topResults.collected;
      this.totalSkipped += topResults.skipped;
      this.totalErrors += topResults.errors;
      
      await this.logProgress();
      await this.delay(5000); // 5 second break
      
      // Method 3: Search Terms (this should work with correct parser) - INCREASE LIMIT
      const searchResults = await this.collectFromSearchTerms(200); // Increased from 50 to 200
      this.totalCollected += searchResults.collected;
      this.totalSkipped += searchResults.skipped;
      this.totalErrors += searchResults.errors;
      
      // Final results
      console.log(`\n🏆 WORKING COLLECTION COMPLETED!`);
      console.log(`⏰ End time:`, new Date().toLocaleString());
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   🎯 Total Collected: ${this.totalCollected}`);
      console.log(`   ⏭️ Total Skipped: ${this.totalSkipped}`);
      console.log(`   ❌ Total Errors: ${this.totalErrors}`);
      
    } catch (error) {
      console.error('❌ Error in working collection:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  try {
    const collector = new WorkingCollector();
    await collector.runWorkingCollection();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
