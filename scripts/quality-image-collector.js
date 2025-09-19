const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class QualityImageCollector {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
    this.totalProcessed = 0;
    this.imagesFound = 0;
    this.errors = 0;
    this.bggRateLimitCount = 0;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async logProgress() {
    console.log(`\n📊 PROGRESS UPDATE:`);
    console.log(`   🔍 Total Processed: ${this.totalProcessed}`);
    console.log(`   📸 Images Found: ${this.imagesFound}`);
    console.log(`   ❌ Errors: ${this.errors}`);
    console.log(`   ⏳ BGG Rate Limits: ${this.bggRateLimitCount}`);
  }

  // Try multiple BGG endpoints to find images
  async tryBGGImages(bggId, gameName) {
    try {
      // Method 1: Main thing endpoint with stats
      console.log(`      🔍 Trying BGG main endpoint...`);
      const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`);
      const data = this.parser.parse(response.data);
      
      if (data.items && data.items.item) {
        const gameData = data.items.item;
        const gameItem = Array.isArray(gameData) ? gameData[0] : gameData;
        
        // Check for thumbnail (most common)
        if (gameItem.thumbnail?.value && gameItem.thumbnail.value !== 'NULL') {
          const thumbnailUrl = gameItem.thumbnail.value;
          if (await this.verifyImageAccessible(thumbnailUrl)) {
            console.log(`      ✅ Found accessible thumbnail: ${thumbnailUrl}`);
            return { thumbnailUrl: thumbnailUrl, source: 'BGG Main' };
          }
        }
        
        // Check for main image
        if (gameItem.image?.value && gameItem.image.value !== 'NULL') {
          const imageUrl = gameItem.image.value;
          if (await this.verifyImageAccessible(imageUrl)) {
            console.log(`      ✅ Found accessible main image: ${imageUrl}`);
            return { imageUrl: imageUrl, source: 'BGG Main' };
          }
        }
      }

      // Method 2: Try files endpoint for additional images
      console.log(`      🔍 Trying BGG files endpoint...`);
      try {
        const filesResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&type=boardgame&stats=1`);
        const filesData = this.parser.parse(filesResponse.data);
        
        if (filesData.items && filesData.items.item) {
          const gameData = filesData.items.item;
          const gameItem = Array.isArray(gameData) ? gameData[0] : gameData;
          
          // Look for image files
          if (gameItem.file) {
            const files = Array.isArray(gameItem.file) ? gameItem.file : [gameItem.file];
            
            // Prioritize image types
            const imageTypes = ['image', 'graphic', 'photo', 'boxart'];
            for (const imageType of imageTypes) {
              const imageFile = files.find(f => f.type === imageType);
              if (imageFile && imageFile.url) {
                if (await this.verifyImageAccessible(imageFile.url)) {
                  console.log(`      ✅ Found accessible file image (${imageType}): ${imageFile.url}`);
                  return { imageUrl: imageFile.url, source: `BGG Files (${imageType})` };
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(`      ⚠️ Files endpoint failed: ${error.message}`);
      }

      // Method 3: Try search endpoint for alternative results
      console.log(`      🔍 Trying BGG search endpoint...`);
      try {
        const searchResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`);
        const searchData = this.parser.parse(searchResponse.data);
        
        if (searchData.items && searchData.items.item) {
          const searchItems = Array.isArray(searchData.items.item) ? searchData.items.item : [searchData.items.item];
          
          // Look for exact match or close match
          for (const item of searchItems) {
            if (item.name && item.name.value && item.name.value.toLowerCase().includes(gameName.toLowerCase())) {
              if (item.thumbnail && item.thumbnail.value && item.thumbnail.value !== 'NULL') {
                if (await this.verifyImageAccessible(item.thumbnail.value)) {
                  console.log(`      ✅ Found accessible search thumbnail: ${item.thumbnail.value}`);
                  return { thumbnailUrl: item.thumbnail.value, source: 'BGG Search' };
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(`      ⚠️ Search endpoint failed: ${error.message}`);
      }

      return null;
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`      ⏳ BGG rate limited, waiting 10 seconds...`);
        this.bggRateLimitCount++;
        await this.delay(10000); // Wait 10 seconds for rate limit
        return null;
      }
      console.log(`      ❌ BGG error: ${error.message}`);
      return null;
    }
  }

  // Verify that an image URL is actually accessible
  async verifyImageAccessible(imageUrl) {
    try {
      const response = await axios.head(imageUrl, { 
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // Check if it's actually an image
      const contentType = response.headers['content-type'];
      if (contentType && contentType.startsWith('image/')) {
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // Try to find images from publisher websites (basic implementation)
  async tryPublisherWebsite(gameName, designer, developer) {
    try {
      // This is a placeholder for future implementation
      // Could scrape publisher websites for game images
      console.log(`      🔍 Publisher website search not implemented yet`);
      return null;
    } catch (error) {
      return null;
    }
  }

  // Main collection method
  async collectQualityImages() {
    console.log('🚀 STARTING QUALITY IMAGE COLLECTION 🚀\n');
    console.log('🎯 Goal: Find REAL game images, not placeholders!');
    console.log('⏰ Start time:', new Date().toLocaleString());
    
    // Get games without images, prioritize popular ones
    const gamesWithoutImages = await prisma.game.findMany({
      where: {
        AND: [
          { thumbnailUrl: null },
          { imageUrl: null }
        ]
      },
      select: {
        id: true,
        nameEn: true,
        bggId: true,
        designer: true,
        developer: true
      },
      orderBy: [
        { bggId: 'asc' } // Start with lower BGG IDs (usually more popular)
      ],
      take: 100 // Process more games per batch
    });
    
    console.log(`🎯 Found ${gamesWithoutImages.length} games without images to process...\n`);
    
    for (let i = 0; i < gamesWithoutImages.length; i++) {
      const game = gamesWithoutImages[i];
      
      try {
        console.log(`   🎯 [${i + 1}/${gamesWithoutImages.length}] Processing: ${game.nameEn}`);
        
        let imageFound = false;
        let updateData = {};
        let imageSource = '';
        
        // Method 1: Try BGG (our main source)
        if (game.bggId) {
          const bggResult = await this.tryBGGImages(game.bggId, game.nameEn);
          if (bggResult) {
            updateData = { ...updateData, ...bggResult };
            imageFound = true;
            imageSource = bggResult.source;
            console.log(`      🎉 Found quality image from ${imageSource}`);
          }
        }
        
        // Method 2: Try publisher website (if BGG failed)
        if (!imageFound) {
          const publisherResult = await this.tryPublisherWebsite(game.nameEn, game.designer, game.developer);
          if (publisherResult) {
            updateData = { ...updateData, ...publisherResult };
            imageFound = true;
            imageSource = publisherResult.source;
            console.log(`      🎉 Found quality image from ${imageSource}`);
          }
        }
        
        // Update database if we found any image
        if (imageFound && Object.keys(updateData).length > 0) {
          await prisma.game.update({
            where: { id: game.id },
            data: updateData
          });
          this.imagesFound++;
          console.log(`      💾 Updated database with quality image!`);
        } else {
          console.log(`      ❌ No quality images found - skipping placeholder generation`);
        }
        
        this.totalProcessed++;
        
        // Log progress every 25 games
        if (this.totalProcessed % 25 === 0) {
          await this.logProgress();
        }
        
        // Be respectful to BGG API - longer delay to avoid rate limiting
        if (i < gamesWithoutImages.length - 1) {
          const delayTime = this.bggRateLimitCount > 2 ? 3000 : 2000; // Increase delay if rate limited
          await this.delay(delayTime);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${game.nameEn}:`, error.message);
        this.errors++;
      }
    }
    
    // Final results
    console.log(`\n🏆 QUALITY IMAGE COLLECTION COMPLETED!`);
    console.log(`⏰ End time:`, new Date().toLocaleString());
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   🔍 Total Processed: ${this.totalProcessed}`);
    console.log(`   📸 Quality Images Found: ${this.imagesFound}`);
    console.log(`   ❌ Errors: ${this.errors}`);
    console.log(`   ⏳ BGG Rate Limits: ${this.bggRateLimitCount}`);
    
    if (this.imagesFound > 0) {
      console.log(`\n🎉 SUCCESS! Found ${this.imagesFound} quality images from BGG!`);
      console.log(`💡 These are REAL game images, not placeholders.`);
    } else {
      console.log(`\n💡 RECOMMENDATIONS:`);
      console.log(`   1. BGG rate limiting may be too aggressive`);
      console.log(`   2. Try running again with longer delays`);
      console.log(`   3. Consider implementing publisher website scraping`);
      console.log(`   4. Focus on popular games first (higher chance of images)`);
    }
  }
}

async function main() {
  try {
    const collector = new QualityImageCollector();
    await collector.collectQualityImages();
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
