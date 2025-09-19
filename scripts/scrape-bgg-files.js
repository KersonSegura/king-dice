const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

class BGGFilesScraper {
  constructor() {
    this.delayMs = 3000; // 3 seconds between requests to be respectful
  }

  async delay() {
    return new Promise(resolve => setTimeout(resolve, this.delayMs));
  }

  async scrapeGameFiles(gameId, gameName) {
    try {
      console.log(`🎯 Scraping files for ${gameName} (ID: ${gameId})...`);
      
      const response = await axios.get(`https://boardgamegeek.com/boardgame/${gameId}/files`);
      const $ = cheerio.load(response.data);
      
      let pdfLinks = [];
      let rulebookLinks = [];
      
      // Look for PDF links
      $('a[href*=".pdf"]').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && !href.startsWith('#')) {
          pdfLinks.push({ href, text });
        }
      });

      // Look for rulebook-related links
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().toLowerCase();
        
        if (href && (text.includes('rule') || text.includes('manual') || text.includes('instruction'))) {
          rulebookLinks.push({ href, text: $(el).text().trim() });
        }
      });

      console.log(`   Found ${pdfLinks.length} PDF links and ${rulebookLinks.length} rulebook links`);
      
      if (pdfLinks.length > 0) {
        console.log('   PDF Links:');
        pdfLinks.slice(0, 5).forEach(link => {
          console.log(`     - ${link.text}: ${link.href}`);
        });
      }
      
      if (rulebookLinks.length > 0) {
        console.log('   Rulebook Links:');
        rulebookLinks.slice(0, 5).forEach(link => {
          console.log(`     - ${link.text}: ${link.href}`);
        });
      }

      // If we found PDFs, try to download and extract text from the first one
      if (pdfLinks.length > 0) {
        await this.processPDFRulebook(gameId, pdfLinks[0]);
      }

      return { pdfLinks, rulebookLinks };
      
    } catch (error) {
      console.log(`   ❌ Error scraping files: ${error.message}`);
      return { pdfLinks: [], rulebookLinks: [] };
    }
  }

  async processPDFRulebook(gameId, pdfLink) {
    try {
      console.log(`   📄 Processing PDF: ${pdfLink.href}`);
      
      // For now, we'll just save the PDF link as a note
      // In the future, we could use a PDF parsing library to extract text
      
      await prisma.gameRule.upsert({
        where: {
          gameId_language: {
            gameId: gameId,
            language: 'en'
          }
        },
        update: {
          rulesText: `PDF Rulebook available at: ${pdfLink.href}\n\nNote: This is a link to a PDF rulebook found on BGG. The actual rules text would need to be extracted from the PDF.`,
          rulesHtml: `<p>PDF Rulebook available at: <a href="${pdfLink.href}" target="_blank">${pdfLink.href}</a></p><p>Note: This is a link to a PDF rulebook found on BGG. The actual rules text would need to be extracted from the PDF.</p>`
        },
        create: {
          gameId: gameId,
          language: 'en',
          rulesText: `PDF Rulebook available at: ${pdfLink.href}\n\nNote: This is a link to a PDF rulebook found on BGG. The actual rules text would need to be extracted from the PDF.`,
          rulesHtml: `<p>PDF Rulebook available at: <a href="${pdfLink.href}" target="_blank">${pdfLink.href}</a></p><p>Note: This is a link to a PDF rulebook found on BGG. The actual rules text would need to be extracted from the PDF.</p>`
        }
      });
      
      console.log(`   ✅ PDF link saved for game ${gameId}`);
      
    } catch (error) {
      console.log(`   ❌ Error processing PDF: ${error.message}`);
    }
  }

  async scrapeAllGames() {
    try {
      console.log('🚀 Starting BGG files scraping for all games...\n');
      
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
      
      for (let i = 0; i < Math.min(games.length, 10); i++) { // Process first 10 games
        const game = games[i];
        await this.scrapeGameFiles(game.bggId, game.nameEn);
        
        if (i < Math.min(games.length, 10) - 1) {
          console.log(`   ⏳ Waiting ${this.delayMs/1000}s before next request...\n`);
          await this.delay();
        }
      }
      
      console.log('\n🎉 BGG files scraping completed!');
      
    } catch (error) {
      console.error('Error in scrapeAllGames:', error);
    }
  }
}

async function main() {
  const scraper = new BGGFilesScraper();
  await scraper.scrapeAllGames();
  await prisma.$disconnect();
}

main().catch(console.error);
