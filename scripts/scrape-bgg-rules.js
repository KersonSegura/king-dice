const axios = require('axios');
const cheerio = require('cheerio');
const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuration
const BGG_API_BASE_URL = 'https://boardgamegeek.com/xmlapi2';
const BGG_BASE_URL = 'https://boardgamegeek.com';
const BGG_FILES_DIR = 'scraped_rules/bgg_files';
const DELAY_BETWEEN_REQUESTS = 8000; // 8 seconds (BGG is strict)
const TIMEOUT = 30000;
const MAX_RETRIES = 3;

/**
 * Utility function to add delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ensure directories exist
 */
async function ensureDirectories() {
  await fs.mkdir(BGG_FILES_DIR, { recursive: true });
}

/**
 * Get game details from BGG API
 */
async function getBGGGameDetails(gameId) {
  try {
    const url = `${BGG_API_BASE_URL}/thing?id=${gameId}&stats=1`;
    const response = await axios.get(url, { timeout: TIMEOUT });
    
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    if (result.items && result.items.item && result.items.item[0]) {
      const item = result.items.item[0];
      return {
        id: gameId,
        name: item.name[0].$.value,
        description: item.description ? item.description[0] : '',
        year: item.yearpublished ? item.yearpublished[0].$.value : null,
        minPlayers: item.minplayers ? item.minplayers[0].$.value : null,
        maxPlayers: item.maxplayers ? item.maxplayers[0].$.value : null,
        playingTime: item.playingtime ? item.playingtime[0].$.value : null
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error fetching BGG game details for ${gameId}:`, error.message);
    return null;
  }
}

/**
 * Scrape rule files from BGG game page
 */
async function scrapeBGGFiles(gameId) {
  try {
    const url = `${BGG_BASE_URL}/boardgame/${gameId}/files`;
    console.log(`📍 Scraping files from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const ruleFiles = [];
    
    // Look for file listings
    $('.filepage-file-section').each((i, section) => {
      const $section = $(section);
      const sectionTitle = $section.find('h3').text().toLowerCase();
      
      // Focus on rules-related sections
      if (sectionTitle.includes('rules') || sectionTitle.includes('reference') || 
          sectionTitle.includes('player aid') || sectionTitle.includes('summary')) {
        
        $section.find('.filepage-file').each((j, file) => {
          const $file = $(file);
          const title = $file.find('.filepage-file-title a').text().trim();
          const link = $file.find('.filepage-file-title a').attr('href');
          const description = $file.find('.filepage-file-description').text().trim();
          
          if (title && link) {
            ruleFiles.push({
              title,
              link: link.startsWith('http') ? link : `${BGG_BASE_URL}${link}`,
              description,
              category: sectionTitle
            });
          }
        });
      }
    });
    
    console.log(`📋 Found ${ruleFiles.length} rule files for game ${gameId}`);
    return ruleFiles;
    
  } catch (error) {
    console.error(`❌ Error scraping BGG files for ${gameId}:`, error.message);
    return [];
  }
}

/**
 * Download and process a rule file
 */
async function downloadRuleFile(fileInfo, gameId) {
  try {
    console.log(`📥 Downloading: ${fileInfo.title}`);
    
    const response = await axios.get(fileInfo.link, {
      timeout: TIMEOUT,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Determine file extension
    let extension = '.pdf';
    const contentType = response.headers['content-type'];
    if (contentType) {
      if (contentType.includes('pdf')) extension = '.pdf';
      else if (contentType.includes('image')) extension = '.jpg';
      else if (contentType.includes('text')) extension = '.txt';
    }
    
    // Clean filename
    const cleanTitle = fileInfo.title.replace(/[^a-zA-Z0-9\-_\s]/g, '').substring(0, 50);
    const filename = `${gameId}_${cleanTitle}${extension}`;
    const filepath = path.join(BGG_FILES_DIR, filename);
    
    await fs.writeFile(filepath, response.data);
    console.log(`✅ Downloaded: ${filename}`);
    
    return {
      filename,
      filepath,
      originalTitle: fileInfo.title,
      description: fileInfo.description,
      category: fileInfo.category,
      fileSize: response.data.length
    };
    
  } catch (error) {
    console.error(`❌ Error downloading ${fileInfo.title}:`, error.message);
    return null;
  }
}

/**
 * Scrape BGG game rules and files
 */
async function scrapeBGGGameRules(gameId, downloadFiles = true) {
  try {
    console.log(`\n🎲 Scraping BGG rules for game ID: ${gameId}`);
    
    const gameDetails = await getBGGGameDetails(gameId);
    if (!gameDetails) {
      console.log(`❌ Could not fetch game details for ${gameId}`);
      return null;
    }
    
    console.log(`📖 Game: ${gameDetails.name}`);
    
    const ruleFiles = await scrapeBGGFiles(gameId);
    
    let downloadedFiles = [];
    if (downloadFiles && ruleFiles.length > 0) {
      console.log(`📥 Downloading ${ruleFiles.length} rule files...`);
      
      for (const fileInfo of ruleFiles) {
        const downloadedFile = await downloadRuleFile(fileInfo, gameId);
        if (downloadedFile) {
          downloadedFiles.push(downloadedFile);
        }
        await delay(1000);
      }
    }
    
    return {
      gameId,
      gameDetails,
      ruleFiles,
      downloadedFiles,
      scrapedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Error scraping BGG rules for ${gameId}:`, error.message);
    return null;
  }
}

/**
 * Save BGG rules to database
 */
async function saveBGGRulesToDatabase(bggData) {
  if (!bggData) return false;
  
  try {
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { name: { contains: bggData.gameDetails.name } },
          { nameEn: { contains: bggData.gameDetails.name } },
          { bggId: parseInt(bggData.gameId) }
        ]
      }
    });
    
    if (games.length === 0) {
      console.log(`⚠️ No matching game found in database for BGG ID ${bggData.gameId}`);
      return false;
    }
    
    const game = games[0];
    
    for (const file of bggData.downloadedFiles) {
      const existingRule = await prisma.gameRule.findFirst({
        where: {
          gameId: game.id,
          language: 'en',
          rulesText: { contains: file.originalTitle }
        }
      });
      
      if (!existingRule) {
        await prisma.gameRule.create({
          data: {
            gameId: game.id,
            language: 'en',
            rulesText: `BGG File: ${file.originalTitle}\n\nDescription: ${file.description}\n\nCategory: ${file.category}\n\nFile: ${file.filename}\n\nDownloaded from BoardGameGeek`,
            rulesHtml: `<div class="bgg-rules"><h2>${file.originalTitle}</h2><p><strong>Description:</strong> ${file.description}</p><p><strong>Category:</strong> ${file.category}</p><p><strong>File:</strong> <a href="${file.filepath}">${file.filename}</a></p><p><em>Downloaded from BoardGameGeek</em></p></div>`
          }
        });
        console.log(`✅ Created BGG rule entry for ${game.name || game.nameEn}: ${file.originalTitle}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Database error for BGG game ${bggData.gameId}:`, error.message);
    return false;
  }
}

/**
 * Get BGG game IDs from database
 */
async function getBGGGameIds(limit = 50) {
  try {
    const games = await prisma.game.findMany({
      where: {
        bggId: { not: null },
        rules: { none: {} }
      },
      select: { bggId: true, name: true, nameEn: true },
      take: limit
    });
    
    return games.filter(g => g.bggId).map(g => ({
      bggId: g.bggId,
      name: g.name || g.nameEn
    }));
  } catch (error) {
    console.error('❌ Error fetching BGG IDs:', error.message);
    return [];
  }
}

/**
 * Main BGG scraping function
 */
async function scrapeBGGRules(gameIds, downloadFiles = true) {
  console.log('🚀 Starting BGG rules scraper...');
  console.log(`📋 Games to scrape: ${gameIds.length}`);
  
  await ensureDirectories();
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < gameIds.length; i++) {
    const gameInfo = gameIds[i];
    console.log(`\n📊 Progress: ${i + 1}/${gameIds.length}`);
    
    const bggData = await scrapeBGGGameRules(gameInfo.bggId, downloadFiles);
    
    if (bggData && bggData.downloadedFiles.length > 0) {
      const saved = await saveBGGRulesToDatabase(bggData);
      if (saved) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      console.log(`⚠️ No rule files found for ${gameInfo.name}`);
      failCount++;
    }
    
    if (i < gameIds.length - 1) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS/1000} seconds...`);
      await delay(DELAY_BETWEEN_REQUESTS);
    }
  }
  
  console.log('\n📊 BGG Scraping Results:');
  console.log(`✅ Successfully scraped: ${successCount} games`);
  console.log(`❌ Failed to scrape: ${failCount} games`);
  console.log(`📈 Success rate: ${((successCount / gameIds.length) * 100).toFixed(1)}%`);
}

// Run the BGG scraper
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'auto';
  const downloadFiles = args[1] !== 'no-files';
  
  if (mode === 'auto') {
    console.log('🤖 AUTO mode: Finding games with BGG IDs that need rules...');
    getBGGGameIds(25).then(ids => {
      if (ids.length === 0) {
        console.log('✅ No games found that need BGG rules!');
        process.exit(0);
      }
      return scrapeBGGRules(ids, downloadFiles);
    })
    .then(() => {
      console.log('🎉 BGG scraping completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
  } else {
    const gameIds = args.map(arg => ({ bggId: parseInt(arg), name: `Game ${arg}` }));
    
    scrapeBGGRules(gameIds, downloadFiles)
      .then(() => {
        console.log('🎉 BGG scraping completed!');
        process.exit(0);
      })
      .catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
  }
}

module.exports = { scrapeBGGRules, scrapeBGGGameRules };
