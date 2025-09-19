const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class MassiveGameCollector {
  constructor() {
    this.delayMs = 1000; // 1 second between requests to be respectful but fast
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
      if (!nameEn) return null;

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
    if (!game.name) return null;
    
    if (Array.isArray(game.name)) {
      // Find the primary name
      const primaryName = game.name.find(n => n.type === 'primary');
      if (primaryName) return primaryName.value;
      
      // Fallback to first name
      return game.name[0].value;
    }
    
    return game.name.value;
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

  async collectFromHotList(limit = 100) {
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
            
            // Log progress every 10 games
            if (this.totalCollected % 10 === 0) {
              await this.logProgress();
            }
          } else {
            console.log(`   ❌ Failed to save: ${extractedData.nameEn}`);
            this.totalErrors++;
          }
          
        } catch (error) {
          console.log(`   ❌ Error processing ${hotGame.name.value}: ${error.message}`);
          this.totalErrors++;
        }
        
        // Delay between requests
        await this.delay();
      }
      
    } catch (error) {
      console.error('❌ Error collecting from hot list:', error);
    }
  }

  async collectFromTopList(limit = 100) {
    try {
      console.log(`🏆 Collecting from BGG Top List (target: ${limit} games)...\n`);
      
      // BGG top list is paginated, we'll collect from multiple pages
      const pages = Math.ceil(limit / 100);
      
      for (let page = 1; page <= pages; page++) {
        const offset = (page - 1) * 100;
        const pageLimit = Math.min(100, limit - offset);
        
        console.log(`📄 Processing page ${page} (offset: ${offset}, limit: ${pageLimit})`);
        
        const response = await axios.get(`https://boardgamegeek.com/xmlapi2/collection?username=boardgamegeek&top=1&subtype=boardgame&excludesubtype=boardgameexpansion&offset=${offset}&limit=${pageLimit}`);
        const parser = new XMLParser();
        const data = parser.parse(response.data);
        
        if (!data.items || !data.items.item) {
          console.log(`   ⚠️ No items found on page ${page}`);
          continue;
        }
        
        const topGames = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
        
        for (let i = 0; i < topGames.length; i++) {
          const topGame = topGames[i];
          console.log(`\n🎯 [${i + 1}/${topGames.length}] Processing: ${topGame.name}`);
          
          try {
            // Get detailed game info
            const gameResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${topGame.objectid}&stats=1`);
            const gameData = parser.parse(gameResponse.data);
            
            if (!gameData.items || !gameData.items.item) {
              console.log(`   ⚠️ No detailed data found for ${topGame.name}`);
              this.totalSkipped++;
              continue;
            }
            
            const game = gameData.items.item;
            const extractedData = await this.extractGameData(game);
            
            if (!extractedData) {
              console.log(`   ⚠️ Could not extract data for ${topGame.name}`);
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
              
              // Log progress every 10 games
              if (this.totalCollected % 10 === 0) {
                await this.logProgress();
              }
            } else {
              console.log(`   ❌ Failed to save: ${extractedData.nameEn}`);
              this.totalErrors++;
            }
            
          } catch (error) {
            console.log(`   ❌ Error processing ${topGame.name}: ${error.message}`);
            this.totalErrors++;
          }
          
          // Delay between requests
          await this.delay();
        }
        
        // Delay between pages
        if (page < pages) {
          console.log(`   ⏳ Waiting 5 seconds before next page...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
    } catch (error) {
      console.error('❌ Error collecting from top list:', error);
    }
  }

  async runMassiveCollection() {
    try {
      console.log('🚀 STARTING MASSIVE GAME COLLECTION - RUNNING ALL NIGHT! 🚀\n');
      console.log('⏰ Start time:', new Date().toLocaleString());
      console.log('🌙 This will run continuously to collect hundreds of games...\n');
      
      // Initial collection targets
      const targets = [
        { name: 'Hot List', limit: 200, method: 'hot' },
        { name: 'Top List', limit: 300, method: 'top' },
        { name: 'Hot List Again', limit: 200, method: 'hot' },
        { name: 'Top List Again', limit: 300, method: 'top' }
      ];
      
      for (let round = 0; round < 10; round++) { // Run for 10 rounds (all night)
        console.log(`\n🔄 ROUND ${round + 1}/10 - MASSIVE COLLECTION ROUND\n`);
        
        for (const target of targets) {
          console.log(`\n🎯 TARGET: ${target.name} (${target.limit} games)`);
          
          if (target.method === 'hot') {
            await this.collectFromHotList(target.limit);
          } else if (target.method === 'top') {
            await this.collectFromTopList(target.limit);
          }
          
          // Log progress
          await this.logProgress();
          
          // Wait between targets
          console.log(`\n⏳ Waiting 10 seconds before next target...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        // Log round completion
        console.log(`\n🎉 ROUND ${round + 1} COMPLETED!`);
        console.log(`📊 TOTAL PROGRESS:`);
        console.log(`   🎯 Collected: ${this.totalCollected}`);
        console.log(`   ⏭️ Skipped: ${this.totalSkipped}`);
        console.log(`   ❌ Errors: ${this.totalErrors}`);
        
        // Wait between rounds
        if (round < 9) {
          console.log(`\n🌙 Waiting 5 minutes before next round...`);
          await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
        }
      }
      
      console.log(`\n🏆 MASSIVE COLLECTION COMPLETED!`);
      console.log(`⏰ End time:`, new Date().toLocaleString());
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   🎯 Total Collected: ${this.totalCollected}`);
      console.log(`   ⏭️ Total Skipped: ${this.totalSkipped}`);
      console.log(`   ❌ Total Errors: ${this.totalErrors}`);
      
    } catch (error) {
      console.error('❌ Error in massive collection:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  const collector = new MassiveGameCollector();
  await collector.runMassiveCollection();
}

main().catch(console.error);
