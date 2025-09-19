const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class SimpleGameCollector {
  constructor() {
    this.delayMs = 3000; // 3 seconds between requests to avoid rate limiting
    this.totalCollected = 0;
    this.totalSkipped = 0;
    this.totalErrors = 0;
    this.startTime = Date.now();
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.delayMs));
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

  async checkIfGameExists(gameName) {
    try {
      const existingGame = await prisma.game.findFirst({
        where: {
          nameEn: gameName
        }
      });
      return existingGame !== null;
    } catch (error) {
      console.log(`   ❌ Error checking if game exists: ${error.message}`);
      return false;
    }
  }

  async extractGameData(game) {
    try {
      // Extract basic game info
      const nameEn = this.extractName(game);
      if (!nameEn) {
        console.log(`   ⚠️ Could not extract name from game data`);
        return null;
      }

      const yearRelease = game.yearpublished ? parseInt(game.yearpublished.value) : null;
      const minPlayers = game.minplayers ? parseInt(game.minplayers.value) : null;
      const maxPlayers = game.maxplayers ? parseInt(game.maxplayers.value) : null;
      const durationMinutes = game.playingtime ? parseInt(game.playingtime.value) : null;
      
      // Extract designer and developer
      const designer = this.extractDesigner(game);
      const developer = this.extractDeveloper(game);
      
      // Extract description
      const description = this.extractDescription(game);
      
      // Extract thumbnail
      const thumbnailUrl = game.thumbnail || null;
      
      // Extract categories and mechanics
      const categories = this.extractCategories(game);
      const mechanics = this.extractMechanics(game);
      
      // Check if it's an expansion
      const isExpansion = this.isExpansion(game);
      const baseGameId = isExpansion ? this.extractBaseGameId(game) : null;

      return {
        nameEn,
        nameEs: nameEn, // For now, same as English
        yearRelease,
        designer,
        developer,
        minPlayers,
        maxPlayers,
        durationMinutes,
        description,
        thumbnailUrl,
        categories,
        mechanics,
        isExpansion,
        baseGameId,
        bggId: parseInt(game.id)
      };
    } catch (error) {
      console.log(`   ❌ Error extracting game data: ${error.message}`);
      return null;
    }
  }

  extractName(game) {
    if (!game.name) {
      console.log(`   ⚠️ No name field in game data`);
      return null;
    }
    
    if (Array.isArray(game.name)) {
      // Find the primary name
      const primaryName = game.name.find(n => n.type === 'primary');
      if (primaryName) {
        console.log(`   📝 Found primary name: ${primaryName.value}`);
        return primaryName.value;
      }
      
      // Fallback to first name
      const firstName = game.name[0];
      if (firstName && firstName.value) {
        console.log(`   📝 Using first name: ${firstName.value}`);
        return firstName.value;
      }
      
      console.log(`   ⚠️ No valid name found in array:`, game.name);
      return null;
    }
    
    if (game.name.value) {
      console.log(`   📝 Using direct name: ${game.name.value}`);
      return game.name.value;
    }
    
    console.log(`   ⚠️ No valid name value found:`, game.name);
    return null;
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
    if (!game.description) return null;
    
    // Clean HTML entities
    return game.description
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&hellip;/g, '...')
      .replace(/&nbsp;/g, ' ');
  }

  extractCategories(game) {
    if (!game.link) return [];
    
    return game.link
      .filter(l => l.type === 'boardgamecategory')
      .map(l => l.value);
  }

  extractMechanics(game) {
    if (!game.link) return [];
    
    return game.link
      .filter(l => l.type === 'boardgamemechanic')
      .map(l => l.value);
  }

  isExpansion(game) {
    if (!game.link) return false;
    
    return game.link.some(l => l.type === 'boardgameexpansion');
  }

  extractBaseGameId(game) {
    if (!game.link) return null;
    
    const expansionLink = game.link.find(l => l.type === 'boardgameexpansion');
    return expansionLink ? parseInt(expansionLink.id) : null;
  }

  async saveGame(gameData) {
    try {
      // Save the main game
      const game = await prisma.game.create({
        data: {
          bggId: gameData.bggId,
          nameEn: gameData.nameEn,
          nameEs: gameData.nameEs,
          yearRelease: gameData.yearRelease,
          designer: gameData.designer,
          developer: gameData.developer,
          minPlayers: gameData.minPlayers,
          maxPlayers: gameData.maxPlayers,
          durationMinutes: gameData.durationMinutes,
          imageUrl: gameData.thumbnailUrl,
          thumbnailUrl: gameData.thumbnailUrl,
          expansions: 0
        }
      });

      // Save description if available
      if (gameData.description) {
        await prisma.gameDescription.create({
          data: {
            gameId: game.id,
            language: 'en',
            shortDescription: gameData.description.substring(0, 200),
            fullDescription: gameData.description
          }
        });
      }

      // Save categories
      for (const categoryName of gameData.categories) {
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
            gameId: game.id,
            categoryId: category.id
          }
        });
      }

      // Save mechanics
      for (const mechanicName of gameData.mechanics) {
        let mechanic = await prisma.mechanic.findFirst({
          where: { nameEn: mechanicName }
        });
        
        if (!mechanic) {
          mechanic = await prisma.mechanic.create({
            data: {
              nameEn: mechanicName,
              nameEs: mechanicName
            }
          });
        }
        
        await prisma.gameMechanic.create({
          data: {
            gameId: game.id,
            mechanicId: mechanic.id
          }
        });
      }

      // Save expansion relationship if it's an expansion
      if (gameData.isExpansion && gameData.baseGameId) {
        const baseGame = await prisma.game.findFirst({
          where: { bggId: gameData.baseGameId }
        });
        
        if (baseGame) {
          await prisma.expansion.create({
            data: {
              gameId: game.id,
              expansionForId: baseGame.id
            }
          });
          
          // Update base game expansion count
          await prisma.game.update({
            where: { id: baseGame.id },
            data: { expansions: { increment: 1 } }
          });
        }
      }

      return game;
    } catch (error) {
      console.log(`   ❌ Error saving game: ${error.message}`);
      return null;
    }
  }

  async collectFromHotList(limit = 50) {
    try {
      console.log(`🔥 Collecting from BGG Hot List (target: ${limit} games)...\n`);
      
      const response = await axios.get(`https://boardgamegeek.com/xmlapi2/hot?type=boardgame`);
      const parser = new XMLParser();
      const data = parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log('❌ No items found in hot list');
        return;
      }
      
      const hotGames = data.items.item.slice(0, limit);
      console.log(`📋 Found ${hotGames.length} hot games to process\n`);
      
      for (let i = 0; i < hotGames.length; i++) {
        const hotGame = hotGames[i];
        
        if (!hotGame.name || !hotGame.name.value) {
          console.log(`\n🎯 [${i + 1}/${hotGames.length}] Skipping game with no name`);
          this.totalSkipped++;
          continue;
        }
        
        console.log(`\n🎯 [${i + 1}/${hotGames.length}] Processing: ${hotGame.name.value}`);
        
        try {
          // Get detailed game info
          const gameResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${hotGame.id}&stats=1`);
          const gameData = parser.parse(gameResponse.data);
          
          if (!gameData.items || !gameData.items.item) {
            console.log(`   ⚠️ No detailed data found for ${hotGame.name.value}`);
            this.totalSkipped++;
            continue;
          }
          
          const game = gameData.items.item;
          const extractedData = await this.extractGameData(game);
          
          if (!extractedData) {
            console.log(`   ⚠️ Could not extract data for ${hotGame.name.value}`);
            this.totalSkipped++;
            continue;
          }
          
          // Check if game already exists
          const exists = await this.checkIfGameExists(extractedData.nameEn);
          if (exists) {
            console.log(`   ⏭️ Game already exists: ${extractedData.nameEn}`);
            this.totalSkipped++;
            continue;
          }
          
          // Save the game
          const savedGame = await this.saveGame(extractedData);
          if (savedGame) {
            console.log(`   ✅ Saved: ${extractedData.nameEn} (ID: ${savedGame.id})`);
            this.totalCollected++;
            
            // Log progress every 5 games
            if (this.totalCollected % 5 === 0) {
              await this.logProgress();
            }
          } else {
            console.log(`   ❌ Failed to save: ${extractedData.nameEn}`);
            this.totalErrors++;
          }
          
        } catch (error) {
          if (error.response && error.response.status === 429) {
            console.log(`   ⏳ Rate limited (429), waiting 10 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
            i--; // Retry this game
          } else {
            console.log(`   ❌ Error processing ${hotGame.name.value}: ${error.message}`);
            this.totalErrors++;
          }
        }
        
        // Delay between requests
        await this.delay();
      }
      
    } catch (error) {
      console.error('❌ Error collecting from hot list:', error);
    }
  }

  async runSimpleCollection() {
    try {
      console.log('🚀 STARTING SIMPLE GAME COLLECTION 🚀\n');
      console.log('⏰ Start time:', new Date().toLocaleString());
      console.log('🎯 This will collect games from BGG Hot List...\n');
      
      // Start with a smaller batch to test
      await this.collectFromHotList(50);
      
      // Log final results
      console.log(`\n🏆 COLLECTION COMPLETED!`);
      console.log(`⏰ End time:`, new Date().toLocaleString());
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   🎯 Total Collected: ${this.totalCollected}`);
      console.log(`   ⏭️ Total Skipped: ${this.totalSkipped}`);
      console.log(`   ❌ Total Errors: ${this.totalErrors}`);
      
    } catch (error) {
      console.error('❌ Error in simple collection:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  const collector = new SimpleGameCollector();
  await collector.runSimpleCollection();
}

main().catch(console.error);
