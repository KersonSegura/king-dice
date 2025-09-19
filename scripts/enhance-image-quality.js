const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs').promises;

const prisma = new PrismaClient();

// Function to get image dimensions and quality info
async function getImageInfo(imageUrl) {
  try {
    const response = await axios.head(imageUrl, { timeout: 5000 });
    const contentLength = response.headers['content-length'];
    const contentType = response.headers['content-type'];
    
    return {
      size: contentLength ? parseInt(contentLength) : 0,
      type: contentType,
      exists: response.status === 200
    };
  } catch (error) {
    return { size: 0, type: null, exists: false };
  }
}

// Function to enhance BGG image URLs for better quality
function enhanceBGGImageUrl(url) {
  if (!url || !url.includes('cf.geekdo-images.com')) {
    return url;
  }
  
  // Replace thumbnail with original if not already
  if (url.includes('__thumb')) {
    return url.replace('__thumb', '__original');
  }
  
  // Ensure we get the original quality
  if (url.includes('__original')) {
    return url;
  }
  
  // Try to construct original URL
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const hash = parts[parts.length - 2];
  
  if (hash && filename) {
    return `https://cf.geekdo-images.com/${hash}__original/img/${filename}`;
  }
  
  return url;
}

async function enhanceImageQuality() {
  try {
    console.log('=== Enhancing Image Quality ===');
    
    // Get games that might have low-quality images
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { imageUrl: { contains: '__thumb' } },
          { thumbnailUrl: { not: null } },
          { imageUrl: null }
        ]
      },
      select: {
        id: true,
        nameEn: true,
        imageUrl: true,
        thumbnailUrl: true,
        bggId: true
      },
      take: 100 // Process in batches
    });

    console.log(`Processing ${games.length} games for image quality enhancement...`);
    
    let enhanced = 0;
    let failed = 0;

    for (const game of games) {
      try {
        let bestImageUrl = game.imageUrl;
        
        // Try to enhance current imageUrl
        if (game.imageUrl) {
          const enhancedUrl = enhanceBGGImageUrl(game.imageUrl);
          if (enhancedUrl !== game.imageUrl) {
            const info = await getImageInfo(enhancedUrl);
            if (info.exists && info.size > 50000) { // At least 50KB for quality
              bestImageUrl = enhancedUrl;
            }
          }
        }
        
        // If no good imageUrl, try to use thumbnailUrl as base
        if (!bestImageUrl && game.thumbnailUrl) {
          const enhancedUrl = enhanceBGGImageUrl(game.thumbnailUrl);
          const info = await getImageInfo(enhancedUrl);
          if (info.exists && info.size > 50000) {
            bestImageUrl = enhancedUrl;
          }
        }
        
        // Update if we found a better image
        if (bestImageUrl && bestImageUrl !== game.imageUrl) {
          await prisma.game.update({
            where: { id: game.id },
            data: { imageUrl: bestImageUrl }
          });
          
          console.log(`✅ Enhanced: ${game.nameEn}`);
          enhanced++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`❌ Failed: ${game.nameEn} - ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n=== Enhancement Complete ===`);
    console.log(`Enhanced: ${enhanced} games`);
    console.log(`Failed: ${failed} games`);
    
  } catch (error) {
    console.error('Error enhancing image quality:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enhanceImageQuality();
