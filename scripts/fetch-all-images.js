const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');

const prisma = new PrismaClient();
const parser = new xml2js.Parser();

// BGG API Configuration - Based on BGG XML API2 documentation
const BGG_API_BASE_URL = 'https://boardgamegeek.com/xmlapi2';
const BATCH_SIZE = 20; // Maximum 20 IDs per request according to BGG API docs
const DELAY_BETWEEN_REQUESTS = 5000; // 5 seconds as recommended by BGG API docs
const MAX_RETRIES = 3;
const RETRY_DELAY = 10000; // 10 seconds for retries

/**
 * Delay function for rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make HTTP request with retry logic for BGG API
 */
async function makeRequestWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🌐 Making request to: ${url}`);
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'King Dice Board Game Database (contact@kingdice.com)'
        }
      });
      
      // Check for BGG specific response codes
      if (response.status === 202) {
        console.log('⏳ BGG API returned 202 (queued request), waiting and retrying...');
        await delay(RETRY_DELAY);
        continue;
      }
      
      if (response.status === 200 && response.data) {
        return response.data;
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      console.error(`❌ Request failed (attempt ${i + 1}/${retries}):`, error.message);
      
      if (error.response?.status === 429) {
        console.log('⏳ Rate limited, waiting longer...');
        await delay(RETRY_DELAY * 2);
      } else if (error.response?.status >= 500) {
        console.log('⏳ Server error, waiting before retry...');
        await delay(RETRY_DELAY);
      } else if (i === retries - 1) {
        throw error;
      } else {
        await delay(RETRY_DELAY);
      }
    }
  }
  
  throw new Error(`Failed after ${retries} attempts`);
}

/**
 * Fetch images for a batch of games using BGG XML API2
 */
async function fetchImagesForBatch(games) {
  if (!games || games.length === 0) {
    return { success: 0, failed: 0 };
  }
  
  // Extract BGG IDs and filter out null values
  const bggIds = games
    .filter(game => game.bggId && game.bggId > 0)
    .map(game => game.bggId);
  
  if (bggIds.length === 0) {
    console.log('⚠️ No valid BGG IDs in batch, skipping...');
    return { success: 0, failed: 0 };
  }
  
  console.log(`🔄 Fetching images for ${bggIds.length} games: [${bggIds.join(', ')}]`);
  
  try {
    // Build BGG API URL - Using thing endpoint with stats for complete data
    const url = `${BGG_API_BASE_URL}/thing?id=${bggIds.join(',')}&stats=1`;
    
    // Make request to BGG API
    const xmlData = await makeRequestWithRetry(url);
    
    // Parse XML response
    const result = await parser.parseStringPromise(xmlData);
    
    if (!result.items || !result.items.item) {
      console.log('⚠️ No items found in BGG response');
      return { success: 0, failed: bggIds.length };
    }
    
    // Handle both single item and array of items
    const items = Array.isArray(result.items.item) ? result.items.item : [result.items.item];
    
    let successCount = 0;
    let failedCount = 0;
    
    // Process each item from BGG response
    for (const item of items) {
      try {
        const bggId = parseInt(item.$.id);
        const game = games.find(g => g.bggId === bggId);
        
        if (!game) {
          console.log(`⚠️ No matching game found for BGG ID ${bggId}`);
          failedCount++;
          continue;
        }
        
        // Extract image URLs - prefer image over thumbnail
        let imageUrl = null;
        let thumbnailUrl = null;
        
        if (item.image && item.image.length > 0) {
          imageUrl = item.image[0];
        }
        
        if (item.thumbnail && item.thumbnail.length > 0) {
          thumbnailUrl = item.thumbnail[0];
        }
        
        // Use image if available, otherwise use thumbnail
        const finalImageUrl = imageUrl || thumbnailUrl;
        
        if (finalImageUrl) {
          // Update database with image URL
          await prisma.game.update({
            where: { bggId: bggId },
            data: { 
              image: finalImageUrl,
              imageUrl: imageUrl,
              thumbnailUrl: thumbnailUrl
            }
          });
          
          successCount++;
          console.log(`✅ Updated image for "${game.name || game.nameEn}" (BGG ID: ${bggId})`);
          console.log(`   Image: ${finalImageUrl}`);
        } else {
          console.log(`⚠️ No image found for "${game.name || game.nameEn}" (BGG ID: ${bggId})`);
          failedCount++;
        }
        
      } catch (itemError) {
        console.error(`❌ Error processing item:`, itemError.message);
        failedCount++;
      }
    }
    
    return { success: successCount, failed: failedCount };
    
  } catch (error) {
    console.error(`❌ Error fetching batch:`, error.message);
    return { success: 0, failed: bggIds.length };
  }
}

/**
 * Main function to fetch all missing images
 */
async function fetchAllMissingImages() {
  console.log('🚀 Starting comprehensive image fetching process...');
  console.log('📋 Using BGG XML API2 specification from repository');
  
  try {
    // Get all games without images
    const gamesWithoutImages = await prisma.game.findMany({
      where: {
        AND: [
          { bggId: { not: null } },
          { bggId: { gt: 0 } },
          {
            OR: [
              { image: null },
              { image: '' }
            ]
          }
        ]
      },
      select: {
        id: true,
        bggId: true,
        name: true,
        nameEn: true
      },
      orderBy: {
        bggId: 'asc'
      }
    });
    
    console.log(`📊 Found ${gamesWithoutImages.length} games without images`);
    
    if (gamesWithoutImages.length === 0) {
      console.log('✅ All games already have images!');
      return;
    }
    
    // Process games in batches of 20 (BGG API limit)
    const totalBatches = Math.ceil(gamesWithoutImages.length / BATCH_SIZE);
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (let i = 0; i < gamesWithoutImages.length; i += BATCH_SIZE) {
      const batch = gamesWithoutImages.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} games)`);
      
      const result = await fetchImagesForBatch(batch);
      totalSuccess += result.success;
      totalFailed += result.failed;
      
      console.log(`📊 Batch ${batchNumber} results: ${result.success} success, ${result.failed} failed`);
      console.log(`📊 Overall progress: ${totalSuccess} success, ${totalFailed} failed`);
      
      // Rate limiting delay between batches
      if (i + BATCH_SIZE < gamesWithoutImages.length) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_REQUESTS/1000} seconds before next batch...`);
        await delay(DELAY_BETWEEN_REQUESTS);
      }
    }
    
    // Final statistics
    console.log('\n📊 Final Results:');
    console.log(`✅ Successfully fetched: ${totalSuccess} images`);
    console.log(`❌ Failed to fetch: ${totalFailed} images`);
    console.log(`📈 Success rate: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%`);
    
    // Check final database status
    const totalGames = await prisma.game.count();
    const gamesWithImages = await prisma.game.count({
      where: {
        image: {
          not: null
        }
      }
    });
    
    console.log(`\n📊 Updated Database Status:`);
    console.log(`Total games: ${totalGames}`);
    console.log(`Games with images: ${gamesWithImages}`);
    console.log(`Completion percentage: ${((gamesWithImages / totalGames) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Fatal error in main process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fetchAllMissingImages()
    .then(() => {
      console.log('🎉 Image fetching process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { fetchAllMissingImages };
