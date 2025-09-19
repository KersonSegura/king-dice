const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

class GameRuleScraper {
  constructor() {
    this.sources = [
      'https://boardgamegeek.com',
      'https://www.catan.com',
      'https://www.days-of-wonder.com'
    ];
  }

  async scrapeGameRules(gameName, gameId) {
    try {
      console.log(`🔍 Searching for rules for: ${gameName}`);
      
      // Try official websites first (most reliable for actual rules)
      const officialRules = await this.searchOfficialWebsite(gameName);
      if (officialRules) {
        console.log(`✅ Found official website rules for ${gameName}`);
        return await this.storeGameRules(gameId, officialRules, 'en');
      }

      // Try BGG as fallback (usually just descriptions, not full rules)
      const bggRules = await this.searchBGGRules(gameName);
      if (bggRules) {
        console.log(`✅ Found BGG description for ${gameName} (not full rules)`);
        return await this.storeGameRules(gameId, bggRules, 'en');
      }

      console.log(`❌ No rules found for ${gameName}`);
      return null;

    } catch (error) {
      console.error(`❌ Error scraping rules for ${gameName}:`, error.message);
      return null;
    }
  }

  async searchBGGRules(gameName) {
    try {
      // Search BGG for the game
      const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
      console.log(`🔍 Searching BGG: ${searchUrl}`);
      
      const searchResponse = await axios.get(searchUrl);
      
      // Parse XML to find game ID
      const gameId = this.extractBGGGameId(searchResponse.data, gameName);
      if (!gameId) {
        console.log(`❌ No BGG game ID found for ${gameName}`);
        return null;
      }

      console.log(`✅ Found BGG game ID: ${gameId}`);

      // Get game details including rulebook files
      const gameUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
      console.log(`🔍 Fetching game details: ${gameUrl}`);
      
      const gameResponse = await axios.get(gameUrl);
      
      // Extract rulebook content
      const rules = this.extractBGGRulebook(gameResponse.data);
      
      if (rules) {
        console.log(`✅ Extracted description from BGG (${rules.length} characters)`);
        return rules;
      } else {
        console.log(`❌ No description extracted from BGG for ${gameName}`);
        return null;
      }

    } catch (error) {
      console.error('Error searching BGG:', error.message);
      return null;
    }
  }

  async searchOfficialWebsite(gameName) {
    try {
      // Try Catan website first (as test case)
      if (gameName.toLowerCase().includes('catan')) {
        return await this.scrapeCatanWebsite();
      }

      // Add more official websites here
      return null;

    } catch (error) {
      console.error('Error searching official website:', error.message);
      return null;
    }
  }

  async scrapeCatanWebsite() {
    try {
      console.log('🔍 Scraping Catan official website...');
      
      const response = await axios.get('https://www.catan.com/game/catan');
      const $ = cheerio.load(response.data);
      
      // Extract rules content from paragraphs
      const paragraphs = $('p');
      let rulesContent = '';
      
      if (paragraphs.length > 0) {
        paragraphs.each((index, element) => {
          const text = $(element).text().trim();
          if (text.length > 50) { // Only include substantial paragraphs
            rulesContent += text + '\n\n';
          }
        });
        
        if (rulesContent) {
          const cleaned = this.cleanRulesText(rulesContent);
          console.log(`✅ Found Catan website rules (${cleaned.length} characters)`);
          return cleaned;
        }
      }

      console.log('❌ No rules content found on Catan website');
      return null;

    } catch (error) {
      console.error('Error scraping Catan website:', error.message);
      return null;
    }
  }

  extractBGGGameId(xmlData, gameName) {
    try {
      // Simple XML parsing to find game ID
      const matches = xmlData.match(/id="(\d+)"/g);
      if (matches && matches.length > 0) {
        const firstId = matches[0].match(/id="(\d+)"/)[1];
        return firstId;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractBGGRulebook(xmlData) {
    try {
      console.log('🔍 Extracting description content from BGG XML...');
      
      // Try to extract description first (most reliable)
      const descMatch = xmlData.match(/<description[^>]*>(.*?)<\/description>/s);
      if (descMatch && descMatch[1]) {
        const description = this.cleanRulesText(descMatch[1]);
        if (description && description.length > 100) {
          console.log(`✅ Found description content (${description.length} characters)`);
          return description;
        }
      }

      console.log('❌ No suitable description content found in BGG XML');
      return null;

    } catch (error) {
      console.error('Error extracting BGG description:', error);
      return null;
    }
  }

  cleanRulesText(text) {
    if (!text) return null;
    
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, '');
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove HTML entities
    text = text.replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");
    
    // Remove breadcrumb text and other navigation elements
    text = text.replace(/breadcrumb/gi, '')
                .replace(/navigation/gi, '')
                .replace(/menu/gi, '');
    
    // Limit length
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '...';
    }
    
    return text;
  }

  async storeGameRules(gameId, rulesText, language) {
    try {
      // Check if rules already exist
      const existingRule = await prisma.gameRule.findUnique({
        where: {
          gameId_language: {
            gameId: gameId,
            language: language
          }
        }
      });

      if (existingRule) {
        console.log(`🔄 Updating existing ${language} rules for game ID ${gameId}`);
        await prisma.gameRule.update({
          where: {
            gameId_language: {
              gameId: gameId,
              language: language
            }
          },
          data: {
            rulesText: rulesText
          }
        });
      } else {
        console.log(`🆕 Creating new ${language} rules for game ID ${gameId}`);
        await prisma.gameRule.create({
          data: {
            gameId: gameId,
            language: language,
            rulesText: rulesText
          }
        });
      }

      console.log(`✅ Stored ${language} rules for game ID ${gameId}`);
      return true;

    } catch (error) {
      console.error('Error storing game rules:', error);
      return null;
    }
  }

  async scrapeAllGameRules() {
    try {
      console.log('🚀 Starting to scrape rules for all games...');
      
      const games = await prisma.game.findMany({
        where: {
          gameRules: {
            none: {}
          }
        },
        take: 5, // Start with 5 games for testing
        orderBy: {
          id: 'asc'
        }
      });

      console.log(`Found ${games.length} games without rules`);

      for (const game of games) {
        console.log(`\n🔄 Processing: ${game.nameEn}`);
        await this.scrapeGameRules(game.nameEn, game.id);
        
        // Delay to be respectful to servers
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('\n✅ Rule scraping completed!');

    } catch (error) {
      console.error('Error in scrapeAllGameRules:', error);
    }
  }
}

async function main() {
  try {
    const scraper = new GameRuleScraper();
    
    // Test with a single game first
    console.log('🧪 Testing rule scraping with a single game...');
    
    const testGame = await prisma.game.findFirst({
      where: {
        nameEn: {
          contains: 'Catan'
        }
      }
    });

    if (testGame) {
      console.log(`Testing with: ${testGame.nameEn}`);
      await scraper.scrapeGameRules(testGame.nameEn, testGame.id);
    } else {
      console.log('No Catan game found, testing with first available game...');
      const firstGame = await prisma.game.findFirst();
      if (firstGame) {
        await scraper.scrapeGameRules(firstGame.nameEn, firstGame.id);
      }
    }

    // Uncomment to scrape all games
    // await scraper.scrapeAllGameRules();

  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
