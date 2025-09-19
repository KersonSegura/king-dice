const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class ImageCollector {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
    this.totalProcessed = 0;
    this.imagesFixed = 0;
    this.imagesCollected = 0;
    this.errors = 0;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async logProgress() {
    console.log(`\n📊 PROGRESS UPDATE:`);
    console.log(`   🔍 Total Processed: ${this.totalProcessed}`);
    console.log(`   🛠️ Images Fixed: ${this.imagesFixed}`);
    console.log(`   📸 Images Collected: ${this.imagesCollected}`);
    console.log(`   ❌ Errors: ${this.errors}`);
  }

  // Fix broken image URLs
  async fixBrokenImages() {
    console.log('🛠️ Fixing broken image URLs...\n');
    
    const gamesWithImages = await prisma.game.findMany({
      where: {
        OR: [
          { thumbnailUrl: { not: null } },
          { imageUrl: { not: null } }
        ]
      },
      select: {
        id: true,
        nameEn: true,
        bggId: true,
        thumbnailUrl: true,
        imageUrl: true
      }
    });

    for (const game of gamesWithImages) {
      try {
        let needsUpdate = false;
        const updateData = {};

        // Check thumbnail
        if (game.thumbnailUrl) {
          try {
            const response = await axios.head(game.thumbnailUrl, { timeout: 5000 });
            if (response.status !== 200) {
              console.log(`   ❌ Broken thumbnail for ${game.nameEn}: ${game.thumbnailUrl}`);
              needsUpdate = true;
              updateData.thumbnailUrl = null;
            }
          } catch (error) {
            console.log(`   ❌ Broken thumbnail for ${game.nameEn}: ${game.thumbnailUrl}`);
            needsUpdate = true;
            updateData.thumbnailUrl = null;
          }
        }

        // Check main image
        if (game.imageUrl) {
          try {
            const response = await axios.head(game.imageUrl, { timeout: 5000 });
            if (response.status !== 200) {
              console.log(`   ❌ Broken image for ${game.nameEn}: ${game.imageUrl}`);
              needsUpdate = true;
              updateData.imageUrl = null;
            }
          } catch (error) {
            console.log(`   ❌ Broken image for ${game.nameEn}: ${game.imageUrl}`);
            needsUpdate = true;
            updateData.imageUrl = null;
          }
        }

        // Update if needed
        if (needsUpdate) {
          await prisma.game.update({
            where: { id: game.id },
            data: updateData
          });
          this.imagesFixed++;
        }

        this.totalProcessed++;
        
        if (this.totalProcessed % 50 === 0) {
          await this.logProgress();
        }

      } catch (error) {
        console.error(`   ❌ Error fixing images for ${game.nameEn}:`, error.message);
        this.errors++;
      }
    }
  }

  // Collect missing images from BGG
  async collectMissingImages() {
    console.log('\n📸 Collecting missing images from BGG...\n');
    
    const gamesWithoutImages = await prisma.game.findMany({
      where: {
        AND: [
          { thumbnailUrl: null },
          { imageUrl: null },
          { bggId: { not: null } }
        ]
      },
      select: {
        id: true,
        nameEn: true,
        bggId: true
      },
      take: 100 // Process in batches
    });

    console.log(`🎯 Found ${gamesWithoutImages.length} games without images to process...\n`);

    for (let i = 0; i < gamesWithoutImages.length; i++) {
      const game = gamesWithoutImages[i];
      
      try {
        console.log(`   🎯 [${i + 1}/${gamesWithoutImages.length}] Processing: ${game.nameEn} (BGG: ${game.bggId})`);
        
        // Get fresh data from BGG
        const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${game.bggId}&stats=1`);
        const data = this.parser.parse(response.data);
        
        if (data.items && data.items.item) {
          const gameData = data.items.item;
          const gameItem = Array.isArray(gameData) ? gameData[0] : gameData;
          
          let hasNewImage = false;
          const updateData = {};
          
          // Check thumbnail
          if (gameItem.thumbnail?.value && gameItem.thumbnail.value !== 'NULL') {
            const thumbnailUrl = gameItem.thumbnail.value;
            try {
              // Verify the image is accessible
              const imgResponse = await axios.head(thumbnailUrl, { timeout: 5000 });
              if (imgResponse.status === 200) {
                updateData.thumbnailUrl = thumbnailUrl;
                hasNewImage = true;
                console.log(`      ✅ Found thumbnail: ${thumbnailUrl}`);
              }
            } catch (error) {
              console.log(`      ⚠️ Thumbnail not accessible: ${thumbnailUrl}`);
            }
          }
          
          // Check main image
          if (gameItem.image?.value && gameItem.image.value !== 'NULL') {
            const imageUrl = gameItem.image.value;
            try {
              // Verify the image is accessible
              const imgResponse = await axios.head(imageUrl, { timeout: 5000 });
              if (imgResponse.status === 200) {
                updateData.imageUrl = imageUrl;
                hasNewImage = true;
                console.log(`      ✅ Found image: ${imageUrl}`);
              }
            } catch (error) {
              console.log(`      ⚠️ Image not accessible: ${imageUrl}`);
            }
          }
          
          // Update database if we found new images
          if (hasNewImage) {
            await prisma.game.update({
              where: { id: game.id },
              data: updateData
            });
            this.imagesCollected++;
            console.log(`      🎉 Updated database with new images!`);
          } else {
            console.log(`      ❌ No accessible images found`);
          }
        }
        
        this.totalProcessed++;
        
        // Log progress every 25 games
        if (this.totalProcessed % 25 === 0) {
          await this.logProgress();
        }
        
        // Be respectful to BGG API - 2 second delay
        if (i < gamesWithoutImages.length - 1) {
          await this.delay(2000);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${game.nameEn}:`, error.message);
        this.errors++;
      }
    }
  }

  // Try to find images from other sources
  async findAlternativeImages() {
    console.log('\n🔍 Looking for alternative image sources...\n');
    
    // This could include:
    // - Publisher websites
    // - Board game review sites
    // - Image search APIs (with proper attribution)
    // - Community uploads
    
    console.log('   💡 Alternative sources not implemented yet');
    console.log('   🎯 Focus on BGG images first');
  }

  async run() {
    try {
      console.log('🚀 STARTING IMAGE COLLECTION AND FIXING 🚀\n');
      console.log('⏰ Start time:', new Date().toLocaleString());
      
      // Step 1: Fix broken images
      await this.fixBrokenImages();
      await this.logProgress();
      
      // Step 2: Collect missing images from BGG
      await this.collectMissingImages();
      await this.logProgress();
      
      // Step 3: Look for alternative sources
      await this.findAlternativeImages();
      
      // Final results
      console.log(`\n🏆 IMAGE COLLECTION COMPLETED!`);
      console.log(`⏰ End time:`, new Date().toLocaleString());
      console.log(`📊 FINAL RESULTS:`);
      console.log(`   🔍 Total Processed: ${this.totalProcessed}`);
      console.log(`   🛠️ Images Fixed: ${this.imagesFixed}`);
      console.log(`   📸 Images Collected: ${this.imagesCollected}`);
      console.log(`   ❌ Errors: ${this.errors}`);
      
    } catch (error) {
      console.error('❌ Error in image collection:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  try {
    const collector = new ImageCollector();
    await collector.run();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main();
