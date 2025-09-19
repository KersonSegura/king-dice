const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

class UltraBoardGamesScraperV3 {
  constructor() {
    this.delayMs = 2000; // 2 seconds between requests to be respectful
    this.baseUrl = 'https://ultraboardgames.com';
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.delayMs));
  }

  // Convert game name to URL-friendly format
  convertGameNameToUrl(gameName) {
    return gameName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .trim();
  }

  // Test if a game rules page exists
  async testGameRulesPage(gameName) {
    try {
      const urlPath = this.convertGameNameToUrl(gameName);
      const testUrl = `${this.baseUrl}/${urlPath}/game-rules.php`;
      
      console.log(`   🔍 Testing URL: ${testUrl}`);
      
      const response = await axios.get(testUrl);
      const $ = cheerio.load(response.data);
      
      // Check if it's a valid rules page
      const title = $('title').text();
      const hasRulesContent = $('h1, h2, h3, p').text().length > 500;
      
      if (hasRulesContent && !title.includes('404') && !title.includes('Not Found')) {
        console.log(`   ✅ Rules page found! Title: ${title}`);
        return { exists: true, url: testUrl, title };
      } else {
        console.log(`   ❌ Not a valid rules page`);
        return { exists: false, url: testUrl };
      }
      
    } catch (error) {
      console.log(`   ❌ Page not found or error: ${error.message}`);
      return { exists: false, url: null };
    }
  }

  async scrapeGameRules(gameUrl, gameName) {
    try {
      console.log(`📄 Scraping rules from: ${gameUrl}`);
      
      const response = await axios.get(gameUrl);
      const $ = cheerio.load(response.data);
      
      let rulesText = '';
      let componentsText = '';
      
      // Look for game rules content - focus on the main content area
      $('h1, h2, h3, h4, h5, h6, p, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10) {
          const tagName = $(el).prop('tagName').toLowerCase();
          
          if (tagName.startsWith('h')) {
            rulesText += `\n\n${text.toUpperCase()}\n`;
          } else {
            rulesText += `${text}\n`;
          }
        }
      });
      
      // Look for components section specifically
      $('*:contains("Components"), *:contains("Object of the Game"), *:contains("Setup")').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          componentsText += `${text}\n\n`;
        }
      });
      
      // Clean up the text
      rulesText = rulesText.replace(/\n{3,}/g, '\n\n').trim();
      componentsText = componentsText.replace(/\n{3,}/g, '\n\n').trim();
      
      console.log(`   Rules text length: ${rulesText.length} characters`);
      console.log(`   Components text length: ${componentsText.length} characters`);
      
      return { rulesText, componentsText };
      
    } catch (error) {
      console.log(`   ❌ Scraping error: ${error.message}`);
      return { rulesText: '', componentsText: '' };
    }
  }

  async saveRules(gameId, rulesData, gameName) {
    try {
      const { rulesText, componentsText } = rulesData;
      
      if (rulesText.length < 100) {
        console.log(`   ❌ Not enough rules content (${rulesText.length} chars)`);
        return false;
      }
      
      // Combine components and rules
      const fullRules = componentsText + '\n\n' + rulesText;
      
      await prisma.gameRule.upsert({
        where: {
          gameId_language: {
            gameId: gameId,
            language: 'en'
          }
        },
        update: {
          rulesText: fullRules,
          rulesHtml: fullRules.replace(/\n/g, '<br>')
        },
        create: {
          gameId: gameId,
          language: 'en',
          rulesText: fullRules,
          rulesHtml: fullRules.replace(/\n/g, '<br>')
        }
      });
      
      console.log(`   ✅ Rules saved for ${gameName} (${fullRules.length} chars)`);
      return true;
      
    } catch (error) {
      console.log(`   ❌ Error saving rules: ${error.message}`);
      return false;
    }
  }

  async scrapeGamesFromDatabase() {
    try {
      console.log('🚀 Starting Ultra BoardGames scraping for database games...\n');
      
      const games = await prisma.game.findMany({
        where: {
          rules: {
            none: {}
          }
        },
        select: {
          id: true,
          nameEn: true,
          bggId: true
        }
      });

      console.log(`Found ${games.length} games without rules to process\n`);
      
      let successCount = 0;
      let totalCount = 0;
      
      // Process first 20 games to test
      for (let i = 0; i < Math.min(games.length, 20); i++) {
        const game = games[i];
        totalCount++;
        
        console.log(`\n🎯 [${i + 1}/${Math.min(games.length, 20)}] Processing: ${game.nameEn} (ID: ${game.id})`);
        
        // Test if the game rules page exists
        const pageTest = await this.testGameRulesPage(game.nameEn);
        
        if (pageTest.exists) {
          console.log(`   🎉 Found rules page! Scraping rules...`);
          
          // Scrape the rules
          const rulesData = await this.scrapeGameRules(pageTest.url, game.nameEn);
          
          if (rulesData.rulesText.length > 100) {
            // Save the rules
            const saved = await this.saveRules(game.id, rulesData, game.nameEn);
            if (saved) successCount++;
          } else {
            console.log(`   ❌ No substantial rules found`);
          }
        } else {
          console.log(`   ⚠️ No rules page found for this game`);
        }
        
        // Delay between requests
        if (i < Math.min(games.length, 20) - 1) {
          console.log(`   ⏳ Waiting ${this.delayMs/1000}s before next request...`);
          await this.delay();
        }
      }
      
      console.log(`\n🎉 Ultra BoardGames scraping completed!`);
      console.log(`📊 Results: ${successCount}/${totalCount} games processed successfully`);
      
    } catch (error) {
      console.error('Error in scrapeGamesFromDatabase:', error);
    }
  }

  // Test specific games that we know should have rules
  async testSpecificGames() {
    try {
      console.log('🧪 Testing specific games on Ultra BoardGames...\n');
      
      const testGames = [
        '7 Wonders',
        'Catan',
        'Ticket to Ride',
        'Pandemic',
        'Settlers of Catan'
      ];
      
      for (const gameName of testGames) {
        console.log(`\n🎯 Testing: ${gameName}`);
        const pageTest = await this.testGameRulesPage(gameName);
        
        if (pageTest.exists) {
          console.log(`   ✅ Rules page exists!`);
          
          // Try to scrape a preview
          const rulesData = await this.scrapeGameRules(pageTest.url, gameName);
          if (rulesData.rulesText.length > 100) {
            console.log(`   📖 Rules preview: ${rulesData.rulesText.substring(0, 200)}...`);
          }
        } else {
          console.log(`   ❌ No rules page found`);
        }
        
        await this.delay();
      }
      
    } catch (error) {
      console.error('Error in testSpecificGames:', error);
    }
  }
}

async function main() {
  const scraper = new UltraBoardGamesScraperV3();
  
  // First test with specific games to verify the approach
  // await scraper.testSpecificGames();
  
  // Then try with games from our database
  await scraper.scrapeGamesFromDatabase();
  
  await prisma.$disconnect();
}

main().catch(console.error);
