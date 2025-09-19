const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugImageIssues() {
  try {
    console.log('🔍 Investigating image issues...\n');
    
    // Check games with images
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
      },
      take: 10
    });
    
    console.log('✅ Games WITH images (first 10):');
    gamesWithImages.forEach(game => {
      console.log(`   🎮 ${game.nameEn} (BGG: ${game.bggId})`);
      console.log(`      Thumbnail: ${game.thumbnailUrl}`);
      console.log(`      Image: ${game.imageUrl}`);
      console.log('');
    });
    
    // Check games without images
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
        bggId: true
      },
      take: 10
    });
    
    console.log('❌ Games WITHOUT images (first 10):');
    gamesWithoutImages.forEach(game => {
      console.log(`   🎮 ${game.nameEn} (BGG: ${game.bggId})`);
    });
    
    // Check BGG API response for a few games without images
    console.log('\n🔍 Testing BGG API for games without images...');
    
    const axios = require('axios');
    const { XMLParser } = require('fast-xml-parser');
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text'
    });
    
    for (let i = 0; i < 3; i++) {
      const game = gamesWithoutImages[i];
      if (!game.bggId) continue;
      
      try {
        console.log(`\n   🎯 Testing BGG ID ${game.bggId} (${game.nameEn})...`);
        
        const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${game.bggId}&stats=1`);
        const data = parser.parse(response.data);
        
        if (data.items && data.items.item) {
          const gameData = data.items.item;
          const gameItem = Array.isArray(gameData) ? gameData[0] : gameData;
          
          console.log(`      📸 Thumbnail: ${gameItem.thumbnail?.value || 'NULL'}`);
          console.log(`      🖼️ Image: ${gameItem.image?.value || 'NULL'}`);
          
          if (gameItem.thumbnail?.value || gameItem.image?.value) {
            console.log(`      ✅ BGG HAS images but our DB doesn't!`);
          } else {
            console.log(`      ❌ BGG also has NO images`);
          }
        }
        
        // Be respectful to BGG API
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
      }
    }
    
    // Check if there are any broken image URLs
    console.log('\n🔍 Checking for broken image URLs...');
    
    const brokenImages = await prisma.game.findMany({
      where: {
        OR: [
          { thumbnailUrl: { not: null } },
          { imageUrl: { not: null } }
        ]
      },
      select: {
        id: true,
        nameEn: true,
        thumbnailUrl: true,
        imageUrl: true
      }
    });
    
    let brokenCount = 0;
    for (const game of brokenImages) {
      if (game.thumbnailUrl) {
        try {
          const response = await axios.head(game.thumbnailUrl, { timeout: 5000 });
          if (response.status !== 200) {
            console.log(`   ❌ Broken thumbnail: ${game.nameEn} - ${game.thumbnailUrl} (Status: ${response.status})`);
            brokenCount++;
          }
        } catch (error) {
          console.log(`   ❌ Broken thumbnail: ${game.nameEn} - ${game.thumbnailUrl} (Error: ${error.message})`);
          brokenCount++;
        }
      }
      
      if (game.imageUrl) {
        try {
          const response = await axios.head(game.imageUrl, { timeout: 5000 });
          if (response.status !== 200) {
            console.log(`   ❌ Broken image: ${game.nameEn} - ${game.imageUrl} (Status: ${response.status})`);
            brokenCount++;
          }
        } catch (error) {
          console.log(`   ❌ Broken image: ${game.nameEn} - ${game.imageUrl} (Error: ${error.message})`);
          brokenCount++;
        }
      }
    }
    
    console.log(`\n📊 IMAGE ANALYSIS SUMMARY:`);
    console.log(`   ✅ Games with images: ${gamesWithImages.length}`);
    console.log(`   ❌ Games without images: ${gamesWithoutImages.length}`);
    console.log(`   🔗 Broken image URLs: ${brokenCount}`);
    
  } catch (error) {
    console.error('❌ Error investigating images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugImageIssues();
