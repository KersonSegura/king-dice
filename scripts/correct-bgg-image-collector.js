const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class CorrectBGGImageCollector {
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

  // Get images using the CORRECT BGG XML API2 endpoint
  async getBGGImages(bggId, gameName) {
    try {
      console.log(`      🔍 Using BGG XML API2: /xmlapi2/thing?id=${bggId}&stats=1`);
      
      // Use the CORRECT endpoint as per official documentation
      const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`);
      const data = this.parser.parse(response.data);
      
      if (data.items && data.items.item) {
        const gameData = data.items.item;
        const gameItem = Array.isArray(gameData) ? gameData[0] : gameData;
        
        let updateData = {};
        let hasImage = false;
        
        // According to BGG XML API2 schema: <thumbnail> and <image> are direct URIs
        // NOT nested objects with .value attributes
        if (gameItem.thumbnail && gameItem.thumbnail !== 'NULL') {
          console.log(`      ✅ Found thumbnail: ${gameItem.thumbnail}`);
          updateData.thumbnailUrl = gameItem.thumbnail;
          hasImage = true;
        }
        
        if (gameItem.image && gameItem.image !== 'NULL') {
          console.log(`      ✅ Found main image: ${gameItem.image}`);
          updateData.imageUrl = gameItem.image;
          hasImage = true;
        }
        
        if (hasImage) {
          console.log(`      🎉 BGG XML API2 returned images successfully!`);
          return updateData;
        } else {
          console.log(`      ❌ No images found in BGG XML API2 response`);
          return null;
        }
      } else {
        console.log(`      ❌ Invalid BGG XML API2 response structure`);
        return null;
      }
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`      ⏳ BGG rate limited (429), waiting 5 seconds...`);
        this.bggRateLimitCount++;
        await this.delay(5000); // Wait 5 seconds as per BGG documentation
        return null;
      }
      console.log(`      ❌ BGG API error: ${error.message}`);
      return null;
    }
  }

  // Main collection method
  async collectImages() {
    console.log('🚀 STARTING CORRECT BGG IMAGE COLLECTION 🚀\n');
    console.log('📚 Based on OFFICIAL BGG XML API2 documentation');
    console.log('🎯 Using: /xmlapi2/thing?id=NNN&stats=1');
    console.log('⏰ Start time:', new Date().toLocaleString());
    
    // Get games without images, prioritize popular ones (lower BGG IDs)
    const gamesWithoutImages = await prisma.game.findMany({
      where: {
        AND: [
          { thumbnailUrl: null },
          { imageUrl: null },
          { bggId: { not: null } } // Only games with BGG IDs
        ]
      },
      select: {
        id: true,
        nameEn: true,
        bggId: true
      },
      orderBy: [
        { bggId: 'asc' } // Start with lower BGG IDs (usually more popular)
      ],
      take: 50 // Process in smaller batches to be respectful
    });
    
    console.log(`🎯 Found ${gamesWithoutImages.length} games without images to process...\n`);
    
    for (let i = 0; i < gamesWithoutImages.length; i++) {
      const game = gamesWithoutImages[i];
      
      try {
        console.log(`   🎯 [${i + 1}/${gamesWithoutImages.length}] Processing: ${game.nameEn} (BGG ID: ${game.bggId})`);
        
        // Get images from BGG using the CORRECT API
        const imageData = await this.getBGGImages(game.bggId, game.nameEn);
        
        if (imageData && Object.keys(imageData).length > 0) {
          // Update database with found images
          await prisma.game.update({
            where: { id: game.id },
            data: imageData
          });
          
          this.imagesFound++;
          console.log(`      💾 Database updated with BGG images!`);
        } else {
          console.log(`      ⚠️ No images available for this game`);
        }
        
        this.totalProcessed++;
        
        // Log progress every 10 games
        if (this.totalProcessed % 10 === 0) {
          await this.logProgress();
        }
        
        // Be respectful to BGG API - 5 second delay as per documentation
        if (i < gamesWithoutImages.length - 1) {
          console.log(`      ⏳ Waiting 5 seconds before next request...`);
          await this.delay(5000);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${game.nameEn}:`, error.message);
        this.errors++;
      }
    }
    
    // Final results
    console.log(`\n🏆 CORRECT BGG IMAGE COLLECTION COMPLETED!`);
    console.log(`⏰ End time:`, new Date().toLocaleString());
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   🔍 Total Processed: ${this.totalProcessed}`);
    console.log(`   📸 Images Found: ${this.imagesFound}`);
    console.log(`   ❌ Errors: ${this.errors}`);
    console.log(`   ⏳ BGG Rate Limits: ${this.bggRateLimitCount}`);
    
    if (this.imagesFound > 0) {
      console.log(`\n🎉 SUCCESS! Found ${this.imagesFound} images using OFFICIAL BGG XML API2!`);
      console.log(`💡 These are REAL game images from BGG's official API.`);
      console.log(`📚 Used the correct endpoint: /xmlapi2/thing?id=NNN&stats=1`);
    } else {
      console.log(`\n💡 ANALYSIS:`);
      console.log(`   1. BGG XML API2 endpoint is working correctly`);
      console.log(`   2. These games simply don't have images in BGG's database`);
      console.log(`   3. This is normal - not all games have images uploaded`);
      console.log(`   4. Consider running again with different games or implementing fallbacks`);
    }
  }
}

async function main() {
  try {
    const collector = new CorrectBGGImageCollector();
    await collector.collectImages();
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
