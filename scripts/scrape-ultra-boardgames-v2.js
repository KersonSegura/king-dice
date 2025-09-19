const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

class UltraBoardGamesScraperV2 {
  constructor() {
    this.delayMs = 2000; // 2 seconds between requests to be respectful
    this.baseUrl = 'https://ultraboardgames.com';
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.delayMs));
  }

  async getAllGameLinks() {
    try {
      console.log('🔍 Getting all game links from Ultra BoardGames...');
      
      const response = await axios.get(`${this.baseUrl}/games.php`);
      const $ = cheerio.load(response.data);
      
      const gameLinks = [];
      
      // Look for links that contain game rules
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        
        if (href && text && text.length > 5 && text.length < 100) {
          // Check if it looks like a game link
          if (href.includes('/game/') || 
              text.toLowerCase().includes('rules') || 
              text.toLowerCase().includes('game') ||
              text.toLowerCase().includes('card')) {
            gameLinks.push({ href, text });
          }
        }
      });
      
      console.log(`   Found ${gameLinks.length} potential game links`);
      
      // Show first 10 for verification
      gameLinks.slice(0, 10).forEach((link, i) => {
        console.log(`     ${i + 1}. "${link.text}" -> ${link.href}`);
      });
      
      return gameLinks;
      
    } catch (error) {
      console.log(`   ❌ Error getting game links: ${error.message}`);
      return [];
    }
  }

  async scrapeGameRules(gameUrl, gameName) {
    try {
      console.log(`📄 Scraping rules for: ${gameName}`);
      
      // Fix URL construction - ensure proper separation between domain and path
      let fullUrl;
      if (gameUrl.startsWith('http')) {
        fullUrl = gameUrl;
      } else if (gameUrl.startsWith('/')) {
        fullUrl = `${this.baseUrl}${gameUrl}`;
      } else {
        fullUrl = `${this.baseUrl}/${gameUrl}`;
      }
      
      console.log(`   Full URL: ${fullUrl}`);
      
      const response = await axios.get(fullUrl);
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

  async findMatchingGameInDatabase(gameName) {
    try {
      // Try to find a game in our database that matches
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
      
      // Simple fuzzy matching
      const gameNameLower = gameName.toLowerCase();
      for (const game of games) {
        const dbNameLower = game.nameEn.toLowerCase();
        
        // Check if names are similar
        if (gameNameLower.includes(dbNameLower) || 
            dbNameLower.includes(gameNameLower) ||
            gameNameLower.split(' ').some(word => dbNameLower.includes(word)) ||
            dbNameLower.split(' ').some(word => gameNameLower.includes(word))) {
          return game;
        }
      }
      
      return null;
      
    } catch (error) {
      console.log(`   ❌ Error finding matching game: ${error.message}`);
      return null;
    }
  }

  async scrapeAllGames() {
    try {
      console.log('🚀 Starting Ultra BoardGames scraping for all games...\n');
      
      // Get all game links
      const gameLinks = await this.getAllGameLinks();
      
      if (gameLinks.length === 0) {
        console.log('❌ No game links found');
        return;
      }
      
      console.log(`\n📚 Processing ${gameLinks.length} games...\n`);
      
      let successCount = 0;
      let totalCount = 0;
      
      // Process first 20 games to test
      for (let i = 0; i < Math.min(gameLinks.length, 20); i++) {
        const gameLink = gameLinks[i];
        totalCount++;
        
        console.log(`\n🎯 [${i + 1}/${Math.min(gameLinks.length, 20)}] Processing: ${gameLink.text}`);
        
        // Try to find a matching game in our database
        const matchingGame = await this.findMatchingGameInDatabase(gameLink.text);
        
        if (matchingGame) {
          console.log(`   ✅ Found matching game in database: ${matchingGame.nameEn} (ID: ${matchingGame.id})`);
          
          // Scrape the rules
          const rulesData = await this.scrapeGameRules(gameLink.href, gameLink.text);
          
          if (rulesData.rulesText.length > 100) {
            // Save the rules
            const saved = await this.saveRules(matchingGame.id, rulesData, matchingGame.nameEn);
            if (saved) successCount++;
          } else {
            console.log(`   ❌ No substantial rules found`);
          }
        } else {
          console.log(`   ⚠️ No matching game found in database`);
        }
        
        // Delay between requests
        if (i < Math.min(gameLinks.length, 20) - 1) {
          console.log(`   ⏳ Waiting ${this.delayMs/1000}s before next request...`);
          await this.delay();
        }
      }
      
      console.log(`\n🎉 Ultra BoardGames scraping completed!`);
      console.log(`📊 Results: ${successCount}/${totalCount} games processed successfully`);
      
    } catch (error) {
      console.error('Error in scrapeAllGames:', error);
    }
  }
}

async function main() {
  const scraper = new UltraBoardGamesScraperV2();
  await scraper.scrapeAllGames();
  await prisma.$disconnect();
}

main().catch(console.error);
