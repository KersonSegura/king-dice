const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

class PopularGameRulesScraper {
  constructor() {
    this.delayMs = 2000; // 2 seconds between requests
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.delayMs));
  }

  async scrapeArkNova() {
    try {
      console.log('🎯 Scraping Ark Nova rules...');
      const response = await axios.get('https://www.capstone-games.com/ark-nova/');
      const $ = cheerio.load(response.data);
      
      let rulesText = '';
      $('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          rulesText += text + '\n\n';
        }
      });

      if (rulesText.length > 500) {
        await this.saveRules(56, 'en', rulesText);
        console.log('✅ Ark Nova rules saved!');
      } else {
        console.log('❌ Ark Nova: Not enough content found');
      }
    } catch (error) {
      console.log('❌ Ark Nova error:', error.message);
    }
  }

  async scrapeSpiritIsland() {
    try {
      console.log('🎯 Scraping Spirit Island rules...');
      const response = await axios.get('https://greaterthangames.com/spirit-island');
      const $ = cheerio.load(response.data);
      
      let rulesText = '';
      $('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          rulesText += text + '\n\n';
        }
      });

      if (rulesText.length > 500) {
        await this.saveRules(61, 'en', rulesText);
        console.log('✅ Spirit Island rules saved!');
      } else {
        console.log('❌ Spirit Island: Not enough content found');
      }
    } catch (error) {
      console.log('❌ Spirit Island error:', error.message);
    }
  }

  async scrapeTerraformingMars() {
    try {
      console.log('🎯 Scraping Terraforming Mars rules...');
      const response = await axios.get('https://www.fryxgames.se/games/terraforming-mars/');
      const $ = cheerio.load(response.data);
      
      let rulesText = '';
      $('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          rulesText += text + '\n\n';
        }
      });

      if (rulesText.length > 500) {
        await this.saveRules(67, 'en', rulesText);
        console.log('✅ Terraforming Mars rules saved!');
      } else {
        console.log('❌ Terraforming Mars: Not enough content found');
      }
    } catch (error) {
      console.log('❌ Terraforming Mars error:', error.message);
    }
  }

  async saveRules(gameId, language, rulesText) {
    try {
      await prisma.gameRule.upsert({
        where: {
          gameId_language: {
            gameId: gameId,
            language: language
          }
        },
        update: {
          rulesText: rulesText,
          rulesHtml: rulesText
        },
        create: {
          gameId: gameId,
          language: language,
          rulesText: rulesText,
          rulesHtml: rulesText
        }
      });
    } catch (error) {
      console.error('Error saving rules:', error);
    }
  }

  async scrapeAll() {
    console.log('🚀 Starting popular game rules scraping...\n');
    
    await this.scrapeArkNova();
    await this.delay();
    
    await this.scrapeSpiritIsland();
    await this.delay();
    
    await this.scrapeTerraformingMars();
    await this.delay();
    
    console.log('\n🎉 Popular game rules scraping completed!');
  }
}

async function main() {
  const scraper = new PopularGameRulesScraper();
  await scraper.scrapeAll();
  await prisma.$disconnect();
}

main().catch(console.error);
