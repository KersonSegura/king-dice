const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

class MoreGameRulesScraper {
  constructor() {
    this.delayMs = 3000; // 3 seconds between requests to be respectful
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.delayMs));
  }

  async scrapeWingspan() {
    try {
      console.log('🎯 Scraping Wingspan rules...');
      const response = await axios.get('https://stonemaiergames.com/games/wingspan/');
      const $ = cheerio.load(response.data);
      
      let rulesText = '';
      $('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          rulesText += text + '\n\n';
        }
      });

      if (rulesText.length > 500) {
        await this.saveRules(82, 'en', rulesText);
        console.log('✅ Wingspan rules saved!');
      } else {
        console.log('❌ Wingspan: Not enough content found');
      }
    } catch (error) {
      console.log('❌ Wingspan error:', error.message);
    }
  }

  async scrapeRoot() {
    try {
      console.log('🎯 Scraping Root rules...');
      const response = await axios.get('https://ledergames.com/root/');
      const $ = cheerio.load(response.data);
      
      let rulesText = '';
      $('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          rulesText += text + '\n\n';
        }
      });

      if (rulesText.length > 500) {
        await this.saveRules(72, 'en', rulesText);
        console.log('✅ Root rules saved!');
      } else {
        console.log('❌ Root: Not enough content found');
      }
    } catch (error) {
      console.log('❌ Root error:', error.message);
    }
  }

  async scrapeNemesis() {
    try {
      console.log('🎯 Scraping Nemesis rules...');
      const response = await axios.get('https://awakenrealms.com/nemesis/');
      const $ = cheerio.load(response.data);
      
      let rulesText = '';
      $('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          rulesText += text + '\n\n';
        }
      });

      if (rulesText.length > 500) {
        await this.saveRules(83, 'en', rulesText);
        console.log('✅ Nemesis rules saved!');
      } else {
        console.log('❌ Nemesis: Not enough content found');
      }
    } catch (error) {
      console.log('❌ Nemesis error:', error.message);
    }
  }

  async scrapeLostRuinsOfArnak() {
    try {
      console.log('🎯 Scraping Lost Ruins of Arnak rules...');
      const response = await axios.get('https://czechgames.com/en/games/lost-ruins-of-arnak/');
      const $ = cheerio.load(response.data);
      
      let rulesText = '';
      $('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) {
          rulesText += text + '\n\n';
        }
      });

      if (rulesText.length > 500) {
        await this.saveRules(62, 'en', rulesText);
        console.log('✅ Lost Ruins of Arnak rules saved!');
      } else {
        console.log('❌ Lost Ruins of Arnak: Not enough content found');
      }
    } catch (error) {
      console.log('❌ Lost Ruins of Arnak error:', error.message);
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
    console.log('🚀 Starting more game rules scraping...\n');
    
    await this.scrapeWingspan();
    await this.delay();
    
    await this.scrapeRoot();
    await this.delay();
    
    await this.scrapeNemesis();
    await this.delay();
    
    await this.scrapeLostRuinsOfArnak();
    await this.delay();
    
    console.log('\n🎉 More game rules scraping completed!');
  }
}

async function main() {
  const scraper = new MoreGameRulesScraper();
  await scraper.scrapeAll();
  await prisma.$disconnect();
}

main().catch(console.error);
