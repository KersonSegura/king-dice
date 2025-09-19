const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class BoardGameCollector {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
  }

  async collectTopGames(limit = 100) {
    try {
      console.log(`Starting to collect top ${limit} board games from BGG...`);
      
      // Get top games from BGG
      const response = await axios.get(`https://boardgamegeek.com/xmlapi2/hot?type=boardgame`);
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log('No games found in response');
        return;
      }

      const games = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
      console.log(`Found ${games.length} games to process`);

      let processedCount = 0;
      let skippedCount = 0;
      let duplicateCount = 0;

      for (let i = 0; i < Math.min(games.length, limit * 2); i++) { // Process more to account for duplicates/skips
        const game = games[i];
        const bggId = game.id;
        
        console.log(`Processing game ${i + 1}/${Math.min(games.length, limit * 2)}: BGG ID ${bggId}`);
        
        try {
          // Check if we already have this game
          const gameName = game.name.value;
          if (await this.checkIfGameExists(gameName)) {
            console.log(`⏭️  Skipping "${gameName}" - already exists in database`);
            duplicateCount++;
            continue;
          }

          await this.getGameDetails(bggId);
          processedCount++;
          
          // Check if we've reached our limit
          if (processedCount >= limit) {
            console.log(`✅ Reached target limit of ${limit} games`);
            break;
          }
          
          // Be respectful to BGG API - add delay between requests
          if (i < Math.min(games.length, limit * 2) - 1) {
            await this.delay(1000); // 1 second delay
          }
        } catch (error) {
          console.error(`Error processing game ${bggId}:`, error.message);
          skippedCount++;
        }
      }
      
      console.log(`\n🎯 Collection Summary:`);
      console.log(`✅ Successfully processed: ${processedCount} games`);
      console.log(`⏭️  Skipped (duplicates): ${duplicateCount} games`);
      console.log(`❌ Skipped (errors): ${skippedCount} games`);
      console.log(`📊 Total processed: ${processedCount + duplicateCount + skippedCount} games`);
      
      console.log('Finished collecting games!');
    } catch (error) {
      console.error('Error collecting games:', error.message);
    }
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

  async getGameDetails(bggId) {
    try {
      const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`);
      const data = this.parser.parse(response.data);
      
      if (!data.items || !data.items.item) {
        console.log(`No data found for game ${bggId}`);
        return;
      }

      const gameData = data.items.item;
      const game = Array.isArray(gameData) ? gameData[0] : gameData;
      
      // Extract game information with better error handling
      const name = this.extractName(game);
      if (!name || name === 'Unknown') {
        console.log(`Skipping game ${bggId} - no valid name found`);
        return;
      }

      const year = this.extractYear(game);
      const players = this.extractPlayers(game);
      const duration = this.extractDuration(game);
      const imageUrl = this.extractImage(game);
      const designer = this.extractDesigner(game);
      const developer = this.extractDeveloper(game);
      const description = this.extractDescription(game);
      
      console.log(`Extracted data for "${name}": year=${year}, players=${players.min}-${players.max}, designer=${designer}, developer=${developer}`);
      
      // Create or update game in database
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

      // Add description
      if (description) {
        await this.addDescription(createdGame.id, description);
      }

      // Add default categories and mechanics
      await this.addDefaultCategories(createdGame.id);
      
      console.log(`Successfully processed: ${name}`);
      
    } catch (error) {
      console.error(`Error getting details for game ${bggId}:`, error.message);
    }
  }

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
    // Remove HTML tags and clean up the description
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

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  try {
    const collector = new BoardGameCollector();
    
    // Collect 500 games for massive database expansion
    console.log('Starting board game data collection...');
    await collector.collectTopGames(500);
    
    console.log('Data collection completed!');
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
