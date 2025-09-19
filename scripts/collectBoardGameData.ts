import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const prisma = new PrismaClient();

interface BGGGame {
  id: string;
  name: string;
  yearpublished?: string;
  minplayers?: string;
  maxplayers?: string;
  playingtime?: string;
  minplaytime?: string;
  maxplaytime?: string;
  image?: string;
  thumbnail?: string;
  description?: string;
  statistics?: {
    ratings?: {
      average?: string;
      usersrated?: string;
      ranks?: {
        rank?: Array<{
          value?: string;
          type?: string;
        }>;
      };
    };
  };
  links?: Array<{
    type: string;
    id: string;
    value: string;
  }>;
}

interface BGGSearchResult {
  id: string;
  name: string;
  yearpublished?: string;
  type: string;
}

class BoardGameCollector {
  private bggApiUrl = 'https://boardgamegeek.com/xmlapi2';
  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '_text',
  });

  async collectTopGames(limit: number = 100): Promise<void> {
    console.log(`🎯 Collecting top ${limit} games from BoardGameGeek...`);
    
    try {
      // Get top games from BGG
      const response = await axios.get(`${this.bggApiUrl}/search?query=*&type=boardgame&stats=1`);
      const data = this.parser.parse(response.data);
      
      if (data.items && data.items.item) {
        const games = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
        
        console.log(`📊 Found ${games.length} games, processing first ${limit}...`);
        
        for (let i = 0; i < Math.min(games.length, limit); i++) {
          const game = games[i];
          await this.processGame(game);
          
          // Add delay to be respectful to BGG API
          if (i % 10 === 0) {
            console.log(`⏳ Processed ${i + 1}/${Math.min(games.length, limit)} games...`);
            await this.delay(1000);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error collecting top games:', error);
    }
  }

  async processGame(game: BGGSearchResult): Promise<void> {
    try {
      // Get detailed game information
      const gameDetails = await this.getGameDetails(game.id);
      if (!gameDetails) return;

      // Check if game already exists
      const existingGame = await prisma.game.findUnique({
        where: { bggId: parseInt(game.id) }
      });

      if (existingGame) {
        console.log(`🔄 Game ${gameDetails.name} already exists, updating...`);
        await this.updateGame(existingGame.id, gameDetails);
      } else {
        console.log(`➕ Adding new game: ${gameDetails.name}`);
        await this.createGame(gameDetails);
      }
    } catch (error) {
      console.error(`❌ Error processing game ${game.id}:`, error);
    }
  }

  async getGameDetails(bggId: string): Promise<BGGGame | null> {
    try {
      const response = await axios.get(`${this.bggApiUrl}/thing?id=${bggId}&stats=1`);
      const data = this.parser.parse(response.data);
      
      if (data.items && data.items.item) {
        return data.items.item;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting details for game ${bggId}:`, error);
      return null;
    }
  }

  async createGame(gameData: BGGGame): Promise<void> {
    try {
      // Extract basic information
      const name = this.extractName(gameData.name);
      const year = gameData.yearpublished ? parseInt(gameData.yearpublished) : undefined;
      const minPlayers = gameData.minplayers ? parseInt(gameData.minplayers) : undefined;
      const maxPlayers = gameData.maxplayers ? parseInt(gameData.maxplayers) : undefined;
      const duration = gameData.playingtime ? parseInt(gameData.playingtime) : 
                      gameData.minplaytime ? parseInt(gameData.minplaytime) : undefined;
      
      // Extract rating information
      const averageRating = gameData.statistics?.ratings?.average ? 
                           parseFloat(gameData.statistics.ratings.average) : undefined;
      const numVotes = gameData.statistics?.ratings?.usersrated ? 
                      parseInt(gameData.statistics.ratings.usersrated) : undefined;
      
      // Extract ranking
      let ranking: number | undefined;
      if (gameData.statistics?.ratings?.ranks?.rank) {
        const rankData = Array.isArray(gameData.statistics.ratings.ranks.rank) ? 
                        gameData.statistics.ratings.ranks.rank : 
                        [gameData.statistics.ratings.ranks.rank];
        const mainRank = rankData.find(r => r.type === 'subtype' && r.value === 'boardgame');
        if (mainRank && mainRank.value) {
          ranking = parseInt(mainRank.value);
        }
      }

      // Extract creator/designer
      let creator: string | undefined;
      if (gameData.links) {
        const designer = gameData.links.find(l => l.type === 'boardgamedesigner');
        if (designer) {
          creator = designer.value;
        }
      }

      // Extract publisher
      let publisher: string | undefined;
      if (gameData.links) {
        const pub = gameData.links.find(l => l.type === 'boardgamepublisher');
        if (pub) {
          publisher = pub.value;
        }
      }

      // Create the game
      const game = await prisma.game.create({
        data: {
          bggId: parseInt(gameData.id),
          nameEn: name,
          nameEs: name, // We'll translate this later
          yearRelease: year,
          creator: creator,
          publisher: publisher,
          minPlayers: minPlayers,
          maxPlayers: maxPlayers,
          durationMinutes: duration,
          complexityRating: undefined, // We'll calculate this later
          imageUrl: gameData.image,
          thumbnailUrl: gameData.thumbnail,
          ranking: ranking,
          averageRating: averageRating,
          numVotes: numVotes,
          // Legacy fields
          name: name,
          year: year,
          minPlayTime: duration,
          maxPlayTime: duration,
          image: gameData.image,
          expansions: 0,
          category: 'ranked',
          userRating: 0,
          userVotes: 0,
        },
      });

      // Add basic description
      if (gameData.description) {
        const cleanDescription = this.cleanDescription(gameData.description);
        await prisma.gameDescription.create({
          data: {
            gameId: game.id,
            language: 'en',
            shortDescription: this.createShortDescription(cleanDescription),
            fullDescription: cleanDescription,
          },
        });
      }

      // Add categories based on game type
      await this.addDefaultCategories(game.id, gameData);

      console.log(`✅ Created game: ${name}`);
    } catch (error) {
      console.error('❌ Error creating game:', error);
    }
  }

  async updateGame(gameId: number, gameData: BGGGame): Promise<void> {
    try {
      const name = this.extractName(gameData.name);
      const year = gameData.yearpublished ? parseInt(gameData.yearpublished) : undefined;
      const minPlayers = gameData.minplayers ? parseInt(gameData.minplayers) : undefined;
      const maxPlayers = gameData.maxplayers ? parseInt(gameData.maxplayers) : undefined;
      const duration = gameData.playingtime ? parseInt(gameData.playingtime) : 
                      gameData.minplaytime ? parseInt(gameData.minplaytime) : undefined;

      await prisma.game.update({
        where: { id: gameId },
        data: {
          nameEn: name,
          nameEs: name,
          yearRelease: year,
          minPlayers: minPlayers,
          maxPlayers: maxPlayers,
          durationMinutes: duration,
          imageUrl: gameData.image,
          thumbnailUrl: gameData.thumbnail,
          // Legacy fields
          name: name,
          year: year,
          minPlayTime: duration,
          maxPlayTime: duration,
          image: gameData.image,
        },
      });

      console.log(`🔄 Updated game: ${name}`);
    } catch (error) {
      console.error('❌ Error updating game:', error);
    }
  }

  private extractName(nameData: any): string {
    if (typeof nameData === 'string') return nameData;
    if (nameData && nameData._text) return nameData._text;
    if (nameData && nameData.value) return nameData.value;
    return 'Unknown Game';
  }

  private cleanDescription(description: string): string {
    // Remove HTML tags and clean up the description
    return description
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private createShortDescription(description: string): string {
    // Create a short description from the full description
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return description;
    
    const firstSentence = sentences[0].trim();
    if (firstSentence.length <= 200) return firstSentence;
    
    return firstSentence.substring(0, 200) + '...';
  }

  private async addDefaultCategories(gameId: number, gameData: BGGGame): Promise<void> {
    try {
      // Add basic categories based on game type
      const defaultCategories = ['Board Game'];
      
      for (const categoryName of defaultCategories) {
        const category = await prisma.category.findUnique({
          where: { nameEn: categoryName }
        });
        
        if (category) {
          await prisma.gameCategory.create({
            data: {
              gameId: gameId,
              categoryId: category.id,
            },
          });
        }
      }
    } catch (error) {
      console.error('❌ Error adding default categories:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting BoardGameGeek data collection...');
  
  const collector = new BoardGameCollector();
  
  // Start with a small batch to test
  await collector.collectTopGames(50);
  
  console.log('✅ Data collection completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error in main:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
