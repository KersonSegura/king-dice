const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

class UltraBoardGamesScraper {
  constructor() {
    this.delayMs = 3000; // 3 seconds between requests to be respectful
    this.baseUrl = 'https://ultraboardgames.com';
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.delayMs));
  }

  async searchGame(gameName) {
    try {
      console.log(`🔍 Searching for "${gameName}" on Ultra BoardGames...`);
      
      // Try different search approaches
      const searchUrls = [
        `${this.baseUrl}/?s=${encodeURIComponent(gameName)}`,
        `${this.baseUrl}/games/?s=${encodeURIComponent(gameName)}`,
        `${this.baseUrl}/?s=${encodeURIComponent(gameName.toLowerCase())}`
      ];

      for (const url of searchUrls) {
        try {
          const response = await axios.get(url);
          const $ = cheerio.load(response.data);
          
          // Look for game links
          const gameLinks = $('a[href*="/game/"], a[href*="/games/"]');
          
          if (gameLinks.length > 0) {
            console.log(`   Found ${gameLinks.length} potential game links`);
            
            // Show first few results
            gameLinks.slice(0, 5).each((i, el) => {
              const href = $(el).attr('href');
              const text = $(el).text().trim();
              if (text && text.length < 100) {
                console.log(`     ${i + 1}. "${text}" -> ${href}`);
              }
            });
            
            return gameLinks;
          }
        } catch (error) {
          console.log(`   Search URL ${url} failed: ${error.message}`);
        }
      }
      
      return [];
    } catch (error) {
      console.log(`   ❌ Search error: ${error.message}`);
      return [];
    }
  }

  async scrapeGameRules(gameUrl) {
    try {
      console.log(`📄 Scraping rules from: ${gameUrl}`);
      
      const response = await axios.get(gameUrl);
      const $ = cheerio.load(response.data);
      
      let rulesText = '';
      let componentsText = '';
      
      // Look for game rules content
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

  async saveRules(gameId, rulesData) {
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
      
      console.log(`   ✅ Rules saved for game ${gameId} (${fullRules.length} chars)`);
      return true;
      
    } catch (error) {
      console.log(`   ❌ Error saving rules: ${error.message}`);
      return false;
    }
  }

  async scrapeSpecificGames() {
    try {
      console.log('🚀 Starting Ultra BoardGames scraping for specific games...\n');
      
      // Test with some games that might have rules
      const testGames = [
        { name: 'Monopoly', searchTerm: 'Monopoly Speed Game' },
        { name: 'Dragon Rampage', searchTerm: 'Dragon Rampage' },
        { name: 'Warage', searchTerm: 'Warage Card Game' },
        { name: 'Robot Turtles', searchTerm: 'Robot Turtles' }
      ];
      
      for (const game of testGames) {
        console.log(`\n🎯 Processing: ${game.name}`);
        
        const gameLinks = await this.searchGame(game.searchTerm);
        
        if (gameLinks.length > 0) {
          // Take the first result
          const firstLink = gameLinks.first();
          const gameUrl = firstLink.attr('href');
          
          if (gameUrl) {
            const fullUrl = gameUrl.startsWith('http') ? gameUrl : `${this.baseUrl}${gameUrl}`;
            const rulesData = await this.scrapeGameRules(fullUrl);
            
            if (rulesData.rulesText.length > 100) {
              console.log(`   ✅ Found rules for ${game.name}!`);
              // For now, just show the first 200 characters
              console.log(`   Preview: ${rulesData.rulesText.substring(0, 200)}...`);
            } else {
              console.log(`   ❌ No substantial rules found for ${game.name}`);
            }
          }
        } else {
          console.log(`   ❌ No game links found for ${game.name}`);
        }
        
        await this.delay();
      }
      
      console.log('\n🎉 Ultra BoardGames scraping completed!');
      
    } catch (error) {
      console.error('Error in scrapeSpecificGames:', error);
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
      
      // Process first 5 games to test
      for (let i = 0; i < Math.min(games.length, 5); i++) {
        const game = games[i];
        console.log(`\n🎯 Processing: ${game.nameEn} (ID: ${game.id})`);
        
        const gameLinks = await this.searchGame(game.nameEn);
        
        if (gameLinks.length > 0) {
          const firstLink = gameLinks.first();
          const gameUrl = firstLink.attr('href');
          
          if (gameUrl) {
            const fullUrl = gameUrl.startsWith('http') ? gameUrl : `${this.baseUrl}${gameUrl}`;
            const rulesData = await this.scrapeGameRules(fullUrl);
            
            if (rulesData.rulesText.length > 100) {
              await this.saveRules(game.id, rulesData);
            } else {
              console.log(`   ❌ No substantial rules found`);
            }
          }
        } else {
          console.log(`   ❌ No game links found`);
        }
        
        if (i < Math.min(games.length, 5) - 1) {
          console.log(`   ⏳ Waiting ${this.delayMs/1000}s before next request...`);
          await this.delay();
        }
      }
      
      console.log('\n🎉 Database games scraping completed!');
      
    } catch (error) {
      console.error('Error in scrapeGamesFromDatabase:', error);
    }
  }
}

async function main() {
  const scraper = new UltraBoardGamesScraper();
  
  // First test with specific games
  await scraper.scrapeSpecificGames();
  
  // Then try with games from our database
  // await scraper.scrapeGamesFromDatabase();
  
  await prisma.$disconnect();
}

main().catch(console.error);
