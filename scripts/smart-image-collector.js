const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const prisma = new PrismaClient();

class SmartImageCollector {
  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
    this.totalProcessed = 0;
    this.imagesFound = 0;
    this.errors = 0;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async logProgress() {
    console.log(`\n📊 PROGRESS UPDATE:`);
    console.log(`   🔍 Total Processed: ${this.totalProcessed}`);
    console.log(`   📸 Images Found: ${this.imagesFound}`);
    console.log(`   ❌ Errors: ${this.errors}`);
  }

  // Try to get images from BGG with different endpoints
  async tryBGGImages(bggId, gameName) {
    try {
      // Try the main thing endpoint first
      const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`);
      const data = this.parser.parse(response.data);
      
      if (data.items && data.items.item) {
        const gameData = data.items.item;
        const gameItem = Array.isArray(gameData) ? gameData[0] : gameData;
        
        // Check for thumbnail and image
        if (gameItem.thumbnail?.value && gameItem.thumbnail.value !== 'NULL') {
          try {
            const imgResponse = await axios.head(gameItem.thumbnail.value, { timeout: 5000 });
            if (imgResponse.status === 200) {
              return { thumbnailUrl: gameItem.thumbnail.value };
            }
          } catch (error) {
            // Image not accessible
          }
        }
        
        if (gameItem.image?.value && gameItem.image.value !== 'NULL') {
          try {
            const imgResponse = await axios.head(gameItem.image.value, { timeout: 5000 });
            if (imgResponse.status === 200) {
              return { imageUrl: gameItem.image.value };
            }
          } catch (error) {
            // Image not accessible
          }
        }
      }
      
      // Try the files endpoint for additional images
      try {
        const filesResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&type=boardgame&stats=1`);
        const filesData = this.parser.parse(filesResponse.data);
        
        if (filesData.items && filesData.items.item) {
          const gameData = filesData.items.item;
          const gameItem = Array.isArray(gameData) ? gameData[0] : gameData;
          
          // Look for image files
          if (gameItem.file) {
            const files = Array.isArray(gameItem.file) ? gameItem.file : [gameItem.file];
            const imageFile = files.find(f => f.type === 'image' || f.type === 'graphic');
            
            if (imageFile && imageFile.url) {
              try {
                const imgResponse = await axios.head(imageFile.url, { timeout: 5000 });
                if (imgResponse.status === 200) {
                  return { imageUrl: imageFile.url };
                }
              } catch (error) {
                // Image not accessible
              }
            }
          }
        }
      } catch (error) {
        // Files endpoint failed, continue
      }
      
      return null;
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`      ⏳ BGG rate limited, waiting...`);
        await this.delay(5000); // Wait 5 seconds for rate limit
        return null;
      }
      console.log(`      ❌ BGG error: ${error.message}`);
      return null;
    }
  }

  // Try to find images from publisher websites
  async tryPublisherWebsite(gameName, designer, developer) {
    try {
      // Common publisher domains
      const publishers = [
        'fantasyflightgames.com',
        'asmodee.com',
        'days of wonder',
        'rio grande games',
        'studiomcgyver.com',
        'iellogames.com',
        'matagot.com',
        'space cowboy',
        'edge entertainment',
        'libellud.com'
      ];
      
      // This is a simplified approach - in a real implementation you'd:
      // 1. Scrape publisher websites
      // 2. Search for game images
      // 3. Handle authentication and rate limiting
      
      console.log(`      🔍 Publisher search not fully implemented yet`);
      return null;
      
    } catch (error) {
      return null;
    }
  }

  // Try to find images using a search API (placeholder for future implementation)
  async trySearchAPI(gameName) {
    try {
      // This could use:
      // - Google Custom Search API
      // - Bing Image Search API
      // - DuckDuckGo (no API key needed)
      // - Unsplash API for generic board game images
      
      console.log(`      🔍 Search API not implemented yet`);
      return null;
      
    } catch (error) {
      return null;
    }
  }

  // Generate a placeholder image URL based on game name
  async generatePlaceholderImage(gameName) {
    try {
      // Use a service like DiceBear or similar to generate placeholder images
      // For now, we'll use a simple approach
      
      const encodedName = encodeURIComponent(gameName);
      const placeholderUrl = `https://via.placeholder.com/200x150/4F46E5/FFFFFF?text=${encodedName}`;
      
      return { thumbnailUrl: placeholderUrl };
      
    } catch (error) {
      return null;
    }
  }

  // Main collection method
  async collectImages() {
    console.log('🚀 STARTING SMART IMAGE COLLECTION 🚀\n');
    console.log('⏰ Start time:', new Date().toLocaleString());
    
    // Get games without images
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
      take: 50 // Process in smaller batches
    });
    
    console.log(`🎯 Found ${gamesWithoutImages.length} games without images to process...\n`);
    
    for (let i = 0; i < gamesWithoutImages.length; i++) {
      const game = gamesWithoutImages[i];
      
      try {
        console.log(`   🎯 [${i + 1}/${gamesWithoutImages.length}] Processing: ${game.nameEn}`);
        
        let imageFound = false;
        let updateData = {};
        let imageSource = '';
        
        // Method 1: Try BGG
        if (game.bggId) {
          console.log(`      🔍 Trying BGG...`);
          const bggResult = await this.tryBGGImages(game.bggId, game.nameEn);
          if (bggResult) {
            if (bggResult.thumbnailUrl) {
              updateData.thumbnailUrl = bggResult.thumbnailUrl;
            }
            if (bggResult.imageUrl) {
              updateData.imageUrl = bggResult.imageUrl;
            }
            imageFound = true;
            imageSource = 'BGG Main'; // Source is not stored in DB, so we can't update it here
            console.log(`      ✅ Found image from ${imageSource}`);
          }
        }
        
        // Method 2: Try publisher website (if BGG failed)
        if (!imageFound) {
          console.log(`      🔍 Trying publisher website...`);
          const publisherResult = await this.tryPublisherWebsite(game.nameEn, game.designer, game.developer);
          if (publisherResult) {
            updateData = { ...updateData, ...publisherResult };
            imageFound = true;
            imageSource = 'Publisher Website'; // Source is not stored in DB, so we can't update it here
            console.log(`      ✅ Found image from ${imageSource}`);
          }
        }
        
        // Method 3: Try search API (if previous methods failed)
        if (!imageFound) {
          console.log(`      🔍 Trying search API...`);
          const searchResult = await this.trySearchAPI(game.nameEn);
          if (searchResult) {
            updateData = { ...updateData, ...searchResult };
            imageFound = true;
            imageSource = 'Search API'; // Source is not stored in DB, so we can't update it here
            console.log(`      ✅ Found image from ${imageSource}`);
          }
        }
        
        // Method 4: Generate placeholder (last resort)
        if (!imageFound) {
          console.log(`      🔍 Generating placeholder...`);
          const placeholderResult = await this.generatePlaceholderImage(game.nameEn);
          if (placeholderResult) {
            updateData = { ...updateData, ...placeholderResult };
            imageFound = true;
            imageSource = 'Placeholder Generated'; // Source is not stored in DB, so we can't update it here
            console.log(`      ✅ Generated placeholder image`);
          }
        }
        
        // Update database if we found any image
        if (imageFound && Object.keys(updateData).length > 0) {
          await prisma.game.update({
            where: { id: game.id },
            data: updateData
          });
          this.imagesFound++;
          console.log(`      🎉 Updated database with image from ${imageSource}`);
        } else {
          console.log(`      ❌ No images found from any source`);
        }
        
        this.totalProcessed++;
        
        // Log progress every 10 games
        if (this.totalProcessed % 10 === 0) {
          await this.logProgress();
        }
        
        // Be respectful to APIs - 1 second delay
        if (i < gamesWithoutImages.length - 1) {
          await this.delay(1000);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${game.nameEn}:`, error.message);
        this.errors++;
      }
    }
    
    // Final results
    console.log(`\n🏆 SMART IMAGE COLLECTION COMPLETED!`);
    console.log(`⏰ End time:`, new Date().toLocaleString());
    console.log(`📊 FINAL RESULTS:`);
    console.log(`   🔍 Total Processed: ${this.totalProcessed}`);
    console.log(`   📸 Images Found: ${this.imagesFound}`);
    console.log(`   ❌ Errors: ${this.errors}`);
    
    if (this.imagesFound === 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      console.log(`   1. BGG has very limited images for most games`);
      console.log(`   2. Consider implementing publisher website scraping`);
      console.log(`   3. Use image search APIs (Google, Bing, DuckDuckGo)`);
      console.log(`   4. Generate placeholder images for visual consistency`);
      console.log(`   5. Focus on popular games first (higher chance of images)`);
    }
  }
}

async function main() {
  try {
    const collector = new SmartImageCollector();
    await collector.collectImages();
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
