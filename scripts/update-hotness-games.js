const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');

const prisma = new PrismaClient();

async function fetchBggHotness() {
  try {
    console.log('🔥 Fetching BGG Hotness list...');
    
    // Fetch the BGG hotness XML
    const response = await axios.get('https://boardgamegeek.com/xmlapi2/hot?type=boardgame');
    const xmlText = response.data;
    
    // Parse XML to extract game IDs and ranks
    const itemRegex = /<item id="(\d+)" rank="(\d+)">/g;
    const hotnessGames = [];
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      hotnessGames.push({
        bggId: parseInt(match[1]),
        rank: parseInt(match[2])
      });
    }
    
    console.log(`📊 Found ${hotnessGames.length} hotness games from BGG`);
    
    // Update our database
    let updatedCount = 0;
    let addedCount = 0;
    
    for (const hotGame of hotnessGames) {
      try {
        // Check if game exists in our database
        const existingGame = await prisma.game.findFirst({
          where: { bggId: hotGame.bggId }
        });
        
        if (existingGame) {
          // Update existing game to hotness category
          await prisma.game.update({
            where: { id: existingGame.id },
            data: { category: 'hotness' }
          });
          updatedCount++;
          console.log(`✅ Updated: ${existingGame.nameEn || existingGame.name} (BGG ID: ${hotGame.bggId})`);
        } else {
          // Game doesn't exist in our database yet
          console.log(`⚠️ Game not found in database: BGG ID ${hotGame.bggId}`);
        }
      } catch (error) {
        console.error(`❌ Error processing BGG ID ${hotGame.bggId}:`, error.message);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Updated ${updatedCount} games to hotness category`);
    console.log(`⚠️ ${hotnessGames.length - updatedCount} games not found in our database`);
    
    // Check final count
    const finalCount = await prisma.game.count({
      where: { category: 'hotness' }
    });
    console.log(`🔥 Total hotness games in database: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Error fetching BGG hotness:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fetchBggHotness();
