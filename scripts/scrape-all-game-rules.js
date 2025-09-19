const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

class ComprehensiveRuleScraper {
  constructor() {
    this.sources = {
      'catan': 'https://www.catan.com/game/catan',
      'exploding-kittens': 'https://www.explodingkittens.com/pages/instructions',
      'days-of-wonder': 'https://www.days-of-wonder.com',
      'fantasy-flight': 'https://www.fantasyflightgames.com',
      'stonemaier': 'https://stonemaiergames.com',
      'leder-games': 'https://ledergames.com',
      'asmodee': 'https://www.asmodee.com',
      'iello': 'https://www.iellogames.com',
      'matagot': 'https://www.matagot.com'
    };
    
    this.delayMs = 3000; // 3 seconds between requests
  }

  async scrapeAllGameRules(limit = 10) {
    try {
      console.log('🚀 Starting comprehensive rule scraping...\n');
      
      // Get games without rules or with only short descriptions
      const games = await prisma.game.findMany({
        include: {
          rules: true,
          descriptions: true
        },
        take: limit,
        orderBy: {
          id: 'asc'
        }
      });

      console.log(`Found ${games.length} games to process\n`);

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const game of games) {
        try {
          console.log(`\n🔄 Processing: ${game.nameEn} (ID: ${game.id})`);
          
          // Check if we already have good rules
          const existingRules = game.rules.find(r => r.language === 'en');
          if (existingRules && existingRules.rulesText && existingRules.rulesText.length > 2000) {
            console.log(`⏭️  Skipping - already have comprehensive rules (${existingRules.rulesText.length} chars)`);
            skipCount++;
            continue;
          }

          // Try to scrape rules
          const rules = await this.scrapeGameRules(game);
          
          if (rules && rules.length > 1000) {
            console.log(`✅ Successfully scraped rules (${rules.length} characters)`);
            
            // Store the rules
            await this.storeGameRules(game.id, rules, 'en');
            successCount++;
          } else {
            console.log(`❌ No substantial rules found`);
            errorCount++;
          }

          // Be respectful to servers
          await this.delay(3000);

        } catch (error) {
          console.error(`❌ Error processing ${game.nameEn}:`, error.message);
          errorCount++;
        }
      }

      console.log(`\n🎯 Scraping Summary:`);
      console.log(`✅ Successfully scraped: ${successCount} games`);
      console.log(`⏭️  Skipped (already have rules): ${skipCount} games`);
      console.log(`❌ Errors: ${errorCount} games`);
      console.log(`📊 Total processed: ${games.length} games`);

    } catch (error) {
      console.error('Error in scrapeAllGameRules:', error);
    }
  }

  async scrapeGameRules(game) {
    try {
      // Try official websites first
      const officialRules = await this.searchOfficialWebsites(game);
      if (officialRules) {
        return officialRules;
      }

      // Try BGG as fallback
      const bggRules = await this.searchBGGRules(game.nameEn);
      if (bggRules) {
        return bggRules;
      }

      return null;

    } catch (error) {
      console.error(`Error scraping rules for ${game.nameEn}:`, error.message);
      return null;
    }
  }

  async searchOfficialWebsites(game) {
    try {
      const gameName = game.nameEn.toLowerCase();
      
      // Try Catan website first (as test case)
      if (gameName.includes('catan')) {
        return await this.scrapeCatanWebsite();
      }

      // Try Exploding Kittens website
      if (gameName.includes('exploding kittens')) {
        return await this.scrapeExplodingKittensWebsite();
      }

      // Try Days of Wonder games
      if (gameName.includes('ticket to ride') || gameName.includes('small world')) {
        return await this.scrapeDaysOfWonder(game);
      }

      // Try Fantasy Flight games
      if (gameName.includes('arkham') || gameName.includes('twilight imperium')) {
        return await this.scrapeFantasyFlight(game);
      }

      // Try Stonemaier games
      if (gameName.includes('wingspan') || gameName.includes('scythe')) {
        return await this.scrapeStonemaier(game);
      }

      // Try Leder Games
      if (gameName.includes('root') || gameName.includes('vast')) {
        return await this.scrapeLederGames(game);
      }

      return null;

    } catch (error) {
      console.error('Error searching official websites:', error.message);
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
          if (text.length > 50) {
            rulesContent += text + '\n\n';
          }
        });
        
        if (rulesContent) {
          const cleaned = this.cleanRulesText(rulesContent);
          return cleaned;
        }
      }

      return null;

    } catch (error) {
      console.error('Error scraping Catan website:', error.message);
      return null;
    }
  }

  async scrapeExplodingKittensWebsite() {
    try {
      console.log('🔍 Scraping Exploding Kittens official website...');
      
      // Try the instructions page first
      const instructionsUrl = 'https://www.explodingkittens.com/pages/instructions';
      console.log(`Trying instructions page: ${instructionsUrl}`);
      
      const response = await axios.get(instructionsUrl);
      const $ = cheerio.load(response.data);
      
      // Look for downloadable instructions
      const downloadLinks = $('a[href*="download"], a[href*="pdf"], a[href*="instructions"]');
      console.log(`Found ${downloadLinks.length} potential download links`);
      
      // Try to find the main game content area
      const mainContent = $('main, .main-content, .content, .game-content, [role="main"]');
      let rulesContent = '';
      
      if (mainContent.length > 0) {
        console.log('✅ Found main content area');
        mainContent.each((index, element) => {
          const text = $(element).text().trim();
          if (text.length > 200) {
            rulesContent += text + '\n\n';
          }
        });
      }
      
      // If no main content, try specific game-related selectors
      if (!rulesContent) {
        const gameSelectors = [
          '.game-rules', '.instructions', '.how-to-play', '.gameplay',
          '[class*="game"]', '[class*="rule"]', '[class*="instruction"]'
        ];
        
        for (const selector of gameSelectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`✅ Found content with selector: ${selector}`);
            elements.each((index, element) => {
              const text = $(element).text().trim();
              if (text.length > 100) {
                rulesContent += text + '\n\n';
              }
            });
            if (rulesContent) break;
          }
        }
      }
      
      // Fallback to paragraphs if still no content
      if (!rulesContent) {
        const paragraphs = $('p');
        if (paragraphs.length > 0) {
          console.log('📝 Using paragraph fallback');
          paragraphs.each((index, element) => {
            const text = $(element).text().trim();
            if (text.length > 100) {
              rulesContent += text + '\n\n';
            }
          });
        }
      }
      
      if (rulesContent) {
        const cleaned = this.cleanRulesText(rulesContent);
        console.log(`✅ Found Exploding Kittens rules (${cleaned.length} characters)`);
        return cleaned;
      }

      console.log('❌ No rules content found on Exploding Kittens website');
      return null;

    } catch (error) {
      console.error('Error scraping Exploding Kittens website:', error.message);
      return null;
    }
  }

  async scrapeDaysOfWonder(game) {
    try {
      console.log('🔍 Scraping Days of Wonder website...');
      
      const gameName = game.nameEn.toLowerCase();
      let targetUrl = '';
      
      // Map specific games to their URLs
      if (gameName.includes('ticket to ride')) {
        targetUrl = 'https://www.days-of-wonder.com/tickettoride/en/gameplay/';
      } else if (gameName.includes('small world')) {
        targetUrl = 'https://www.days-of-wonder.com/smallworld/en/gameplay/';
      } else {
        // Generic Days of Wonder games page
        targetUrl = 'https://www.days-of-wonder.com/games/';
      }
      
      if (targetUrl) {
        console.log(`Trying URL: ${targetUrl}`);
        const response = await axios.get(targetUrl);
        const $ = cheerio.load(response.data);
        
        // Look for game rules content
        const gameContent = $('.game-rules, .rules, .instructions, .gameplay, [class*="rule"]');
        let rulesContent = '';
        
        if (gameContent.length > 0) {
          gameContent.each((index, element) => {
            const text = $(element).text().trim();
            if (text.length > 100) {
              rulesContent += text + '\n\n';
            }
          });
          
          if (rulesContent) {
            const cleaned = this.cleanRulesText(rulesContent);
            console.log(`✅ Found Days of Wonder rules (${cleaned.length} characters)`);
            return cleaned;
          }
        }
        
        // Fallback to main content
        const mainContent = $('main, .main-content, .content');
        if (mainContent.length > 0) {
          mainContent.each((index, element) => {
            const text = $(element).text().trim();
            if (text.length > 200) {
              rulesContent += text + '\n\n';
            }
          });
          
          if (rulesContent) {
            const cleaned = this.cleanRulesText(rulesContent);
            console.log(`✅ Found Days of Wonder content (${cleaned.length} characters)`);
            return cleaned;
          }
        }
      }
      
      console.log('❌ No rules content found on Days of Wonder website');
      return null;

    } catch (error) {
      console.error('Error scraping Days of Wonder:', error.message);
      return null;
    }
  }

  async scrapeFantasyFlight(game) {
    try {
      console.log('🔍 Scraping Fantasy Flight website...');
      
      // This would need specific URLs for each game
      // For now, return null as placeholder
      return null;

    } catch (error) {
      console.error('Error scraping Fantasy Flight:', error.message);
      return null;
    }
  }

  async scrapeStonemaier(game) {
    try {
      console.log('🔍 Scraping Stonemaier website...');
      
      // This would need specific URLs for each game
      // For now, return null as placeholder
      return null;

    } catch (error) {
      console.error('Error scraping Stonemaier:', error.message);
      return null;
    }
  }

  async scrapeLederGames(game) {
    try {
      console.log('🔍 Scraping Leder Games website...');
      
      // This would need specific URLs for each game
      // For now, return null as placeholder
      return null;

    } catch (error) {
      console.error('Error scraping Leder Games:', error.message);
      return null;
    }
  }

  async searchBGGRules(gameName) {
    try {
      // Search BGG for the game
      const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`;
      
      const searchResponse = await axios.get(searchUrl);
      
      // Parse XML to find game ID
      const gameId = this.extractBGGGameId(searchResponse.data, gameName);
      if (!gameId) {
        return null;
      }

      // Get game details
      const gameUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
      const gameResponse = await axios.get(gameUrl);
      
      // Extract description content
      const rules = this.extractBGGRulebook(gameResponse.data);
      return rules;

    } catch (error) {
      console.error('Error searching BGG:', error.message);
      return null;
    }
  }

  extractBGGGameId(xmlData, gameName) {
    try {
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
      const descMatch = xmlData.match(/<description[^>]*>(.*?)<\/description>/s);
      if (descMatch && descMatch[1]) {
        const description = this.cleanRulesText(descMatch[1]);
        if (description && description.length > 100) {
          return description;
        }
      }
      return null;
    } catch (error) {
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
    
    // Remove navigation elements
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
        await prisma.gameRule.create({
          data: {
            gameId: gameId,
            language: language,
            rulesText: rulesText
          }
        });
      }

      return true;

    } catch (error) {
      console.error('Error storing game rules:', error);
      return null;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  try {
    const scraper = new ComprehensiveRuleScraper();
    
    // Start with a small batch for testing
    console.log('🧪 Testing comprehensive rule scraping...');
    await scraper.scrapeAllGameRules(5);

  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
