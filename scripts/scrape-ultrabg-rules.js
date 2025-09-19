const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

const prisma = new PrismaClient();

// Configuration
const BASE_URL = 'https://ultraboardgames.com';
const DELAY_BETWEEN_REQUESTS = 2000; // 2 seconds between requests
const MAX_RETRIES = 3;
const TIMEOUT = 30000; // 30 seconds timeout

// Create directories for storing rules and images
const RULES_HTML_DIR = 'scraped_rules/html';
const RULES_IMAGES_DIR = 'scraped_rules/images';

/**
 * Ensure directories exist
 */
async function ensureDirectories() {
  try {
    await fs.mkdir(RULES_HTML_DIR, { recursive: true });
    await fs.mkdir(RULES_IMAGES_DIR, { recursive: true });
    console.log('📁 Directories created/verified');
  } catch (error) {
    console.error('❌ Error creating directories:', error);
  }
}

/**
 * Delay function for rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Download and save an image
 */
async function downloadImage(imageUrl, gameSlug, imageName) {
  try {
    const imageDir = path.join(RULES_IMAGES_DIR, gameSlug);
    await fs.mkdir(imageDir, { recursive: true });
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const imagePath = path.join(imageDir, imageName);
    await fs.writeFile(imagePath, response.data);
    
    // Return relative path for database storage
    return `scraped_rules/images/${gameSlug}/${imageName}`;
  } catch (error) {
    console.error(`⚠️ Failed to download image ${imageUrl}:`, error.message);
    return null;
  }
}

/**
 * Fix image URLs and optionally download images
 */
async function processImages($, rulesDiv, gameSlug, downloadImages = true) {
  const images = rulesDiv.find('img');
  console.log(`🖼️ Found ${images.length} images to process`);
  
  for (let i = 0; i < images.length; i++) {
    const img = $(images[i]);
    let src = img.attr('src');
    
    if (!src) continue;
    
    // Fix relative URLs
    let absoluteUrl;
    if (src.startsWith('/')) {
      absoluteUrl = `${BASE_URL}${src}`;
    } else if (src.startsWith('../')) {
      absoluteUrl = `${BASE_URL}/${gameSlug}/${src.replace('../', '')}`;
    } else if (src.startsWith('http')) {
      absoluteUrl = src;
    } else {
      absoluteUrl = `${BASE_URL}/${gameSlug}/${src}`;
    }
    
    if (downloadImages) {
      // Extract filename from URL
      const urlObj = new URL(absoluteUrl);
      const imageName = path.basename(urlObj.pathname) || `image_${i}.jpg`;
      
      console.log(`📥 Downloading image: ${imageName}`);
      const localPath = await downloadImage(absoluteUrl, gameSlug, imageName);
      
      if (localPath) {
        // Update src to local path for database storage
        img.attr('src', localPath);
        console.log(`✅ Image saved: ${localPath}`);
      } else {
        // Keep original URL if download failed
        img.attr('src', absoluteUrl);
      }
    } else {
      // Just fix the URL without downloading
      img.attr('src', absoluteUrl);
    }
  }
}

/**
 * Clean up unwanted elements from the rules content
 */
function cleanRulesContent($, rulesDiv) {
  // Remove "Continue Reading" section and similar
  rulesDiv.find('.game-rules-bottom, .more, .continue-reading').remove();
  
  // Remove ads and promotional content (UltraBoardGames specific)
  rulesDiv.find('.ad, .advertisement, .promo, .banner, [id*="ezoic"], [id*="ad-"], [class*="ad-"]').remove();
  
  // Remove navigation elements
  rulesDiv.find('.nav, .navigation, .breadcrumb, .splitmenu').remove();
  
  // Remove social sharing buttons
  rulesDiv.find('.share, .social, .facebook, .twitter').remove();
  
  // Remove comments sections
  rulesDiv.find('.comments, .comment, #comments').remove();
  
  // Remove footer elements that might be inside content
  rulesDiv.find('.footer, footer, .post-footer').remove();
  
  // Remove scripts and style tags
  rulesDiv.find('script, style, noscript').remove();
  
  // Clean up empty elements
  rulesDiv.find('p:empty, div:empty, span:empty').remove();
  
  // Clean up any remaining unwanted attributes
  rulesDiv.find('*').each((i, el) => {
    const $el = $(el);
    // Remove event handlers
    $el.removeAttr('onclick onload onmouseover onmouseout onfocus onblur');
    // Remove inline styles that might interfere
    $el.removeAttr('style');
    // Remove data attributes that might be tracking related
    const attrs = el.attribs || {};
    Object.keys(attrs).forEach(attr => {
      if (attr.startsWith('data-ez') || attr.startsWith('data-cfasync') || attr.startsWith('data-ezscrex')) {
        $el.removeAttr(attr);
      }
    });
  });
  
  console.log('🧹 Content cleaned and sanitized');
}

/**
 * Scrape rules for a specific game
 */
async function scrapeGameRules(gameSlug, downloadImages = true, retries = MAX_RETRIES) {
  const url = `${BASE_URL}/${gameSlug}/game-rules.php`;
  
  console.log(`\n🎲 Scraping rules for: ${gameSlug}`);
  console.log(`📍 URL: ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Try multiple selectors to find rules content
    let rulesDiv = $('.game-rules');
    
    if (rulesDiv.length === 0) {
      // Try UltraBoardGames specific selectors
      rulesDiv = $('#main.post.post-single, .post.post-single, #main');
    }
    
    if (rulesDiv.length === 0) {
      // Try alternative selectors
      rulesDiv = $('.rules-content, .content, .game-content, .main-content');
    }
    
    if (rulesDiv.length === 0) {
      // Try to find content by looking for common patterns
      rulesDiv = $('div:contains("Game Rules"), div:contains("How to Play"), div:contains("Components")').first().closest('.post, .content, div[id]');
    }
    
    if (rulesDiv.length === 0) {
      console.log(`❌ No rules content found for ${gameSlug}`);
      console.log('🔍 Available classes on page:');
      $('[class]').each((i, el) => {
        if (i < 10) { // Show first 10 classes for debugging
          console.log(`   .${$(el).attr('class')}`);
        }
      });
      return null;
    }
    
    console.log(`✅ Rules content found for ${gameSlug}`);
    
    // Clean unwanted content
    cleanRulesContent($, rulesDiv);
    
    // Process images
    await processImages($, rulesDiv, gameSlug, downloadImages);
    
    // Extract the title
    const titleElement = rulesDiv.find('h1').first();
    const title = titleElement.text().trim() || `${gameSlug} Game Rules`;
    
    // Get the cleaned HTML content
    const htmlContent = rulesDiv.html();
    
    // Save HTML file locally
    await fs.mkdir(RULES_HTML_DIR, { recursive: true }); // Ensure directory exists
    const htmlPath = path.join(RULES_HTML_DIR, `${gameSlug}.html`);
    await fs.writeFile(htmlPath, htmlContent, 'utf-8');
    console.log(`💾 HTML saved: ${htmlPath}`);
    
    return {
      title,
      htmlContent,
      gameSlug,
      sourceUrl: url,
      scrapedAt: new Date()
    };
    
  } catch (error) {
    console.error(`❌ Error scraping ${gameSlug}:`, error.message);
    
    if (retries > 0 && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
      console.log(`🔄 Retrying ${gameSlug} (${retries} attempts left)...`);
      await delay(5000); // Wait 5 seconds before retry
      return scrapeGameRules(gameSlug, downloadImages, retries - 1);
    }
    
    return null;
  }
}

/**
 * Save rules to database
 */
async function saveRulesToDatabase(rulesData) {
  if (!rulesData) return false;
  
  try {
    // Try to find the game by name similarity
    const searchTerm = rulesData.gameSlug.replace('-', ' ');
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { nameEn: { contains: searchTerm } },
          // Also try with exact slug match
          { name: { contains: rulesData.gameSlug } },
          { nameEn: { contains: rulesData.gameSlug } }
        ]
      }
    });
    
    if (games.length === 0) {
      console.log(`⚠️ No matching game found in database for ${rulesData.gameSlug}`);
      return false;
    }
    
    // Use the first matching game
    const game = games[0];
    
    // Check if rules already exist for English
    const existingRule = await prisma.gameRule.findFirst({
      where: { 
        gameId: game.id,
        language: 'en'
      }
    });
    
    if (existingRule) {
      // Update existing rule
      await prisma.gameRule.update({
        where: { id: existingRule.id },
        data: {
          rulesHtml: rulesData.htmlContent,
          rulesText: rulesData.title, // Store title in rulesText for now
          updatedAt: new Date()
        }
      });
      console.log(`🔄 Updated rules for ${game.name || game.nameEn}`);
    } else {
      // Create new rule
      await prisma.gameRule.create({
        data: {
          gameId: game.id,
          rulesHtml: rulesData.htmlContent,
          rulesText: rulesData.title, // Store title in rulesText for now
          language: 'en'
        }
      });
      console.log(`✅ Created rules for ${game.name || game.nameEn}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Database error for ${rulesData.gameSlug}:`, error.message);
    return false;
  }
}

/**
 * Main scraping function
 */
async function scrapeUltraBGRules(gameSlugs, downloadImages = true) {
  console.log('🚀 Starting UltraBoardGames rules scraper...');
  console.log(`📋 Games to scrape: ${gameSlugs.length}`);
  
  await ensureDirectories();
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < gameSlugs.length; i++) {
    const gameSlug = gameSlugs[i];
    console.log(`\n📊 Progress: ${i + 1}/${gameSlugs.length}`);
    
    const rulesData = await scrapeGameRules(gameSlug, downloadImages);
    
    if (rulesData) {
      const saved = await saveRulesToDatabase(rulesData);
      if (saved) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
    
    // Rate limiting - be polite to the server
    if (i < gameSlugs.length - 1) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS/1000} seconds...`);
      await delay(DELAY_BETWEEN_REQUESTS);
    }
  }
  
  console.log('\n📊 Final Results:');
  console.log(`✅ Successfully scraped: ${successCount} games`);
  console.log(`❌ Failed to scrape: ${failCount} games`);
  console.log(`📈 Success rate: ${((successCount / gameSlugs.length) * 100).toFixed(1)}%`);
}

// Sample game slugs for testing
const SAMPLE_GAMES = [
  '7wonders',
  'catan',
  'ticket-to-ride',
  'azul',
  'wingspan',
  'splendor',
  'king-of-tokyo',
  'pandemic',
  'carcassonne',
  'dominion'
];

// Full list of popular games (you can expand this)
const POPULAR_GAMES = [
  '7wonders',
  'catan',
  'ticket-to-ride',
  'azul',
  'wingspan',
  'splendor',
  'king-of-tokyo',
  'pandemic',
  'carcassonne',
  'dominion',
  'scythe',
  'terraforming-mars',
  'gloomhaven',
  'brass-birmingham',
  'spirit-island',
  'root',
  'everdell',
  'ark-nova',
  'dune-imperium',
  'lost-ruins-of-arnak'
];

// Run the scraper
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'sample';
  const downloadImages = args[1] !== 'no-images';
  
  // Load comprehensive game lists
  let gameList;
  try {
    gameList = require('./comprehensive-game-list');
  } catch (error) {
    console.log('⚠️ Could not load comprehensive game list, using built-in lists');
    gameList = { 
      ULTRA_POPULAR_GAMES: POPULAR_GAMES,
      CLASSIC_GAMES: ['monopoly', 'scrabble', 'chess', 'checkers'],
      CARD_GAMES: ['poker', 'bridge', 'uno'],
      DICE_GAMES: ['yahtzee', 'farkle'],
      ALL_GAMES: [...POPULAR_GAMES, 'monopoly', 'scrabble', 'chess', 'checkers', 'poker', 'bridge', 'uno', 'yahtzee', 'farkle']
    };
  }
  
  let gamesToScrape;
  if (mode === 'sample') {
    gamesToScrape = SAMPLE_GAMES;
    console.log('🧪 Running in SAMPLE mode');
  } else if (mode === 'popular') {
    gamesToScrape = POPULAR_GAMES;
    console.log('🔥 Running in POPULAR mode');
  } else if (mode === 'ultra') {
    gamesToScrape = gameList.ULTRA_POPULAR_GAMES;
    console.log('🌟 Running in ULTRA POPULAR mode');
  } else if (mode === 'classic') {
    gamesToScrape = gameList.CLASSIC_GAMES;
    console.log('🏛️ Running in CLASSIC GAMES mode');
  } else if (mode === 'card') {
    gamesToScrape = gameList.CARD_GAMES;
    console.log('🃏 Running in CARD GAMES mode');
  } else if (mode === 'dice') {
    gamesToScrape = gameList.DICE_GAMES;
    console.log('🎲 Running in DICE GAMES mode');
  } else if (mode === 'all' || mode === 'continuous') {
    gamesToScrape = gameList.ALL_GAMES;
    console.log('🚀 Running in ALL GAMES mode (CONTINUOUS)');
    if (mode === 'continuous') {
      console.log('⏰ CONTINUOUS MODE: Will run all night scraping all games!');
    }
  } else {
    // Custom list of games passed as arguments
    gamesToScrape = args;
    console.log('🎯 Running with CUSTOM game list');
  }
  
  console.log(`📋 Total games to scrape: ${gamesToScrape.length}`);
  
  scrapeUltraBGRules(gamesToScrape, downloadImages)
    .then(() => {
      console.log('🎉 Scraping completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { scrapeUltraBGRules, scrapeGameRules };
