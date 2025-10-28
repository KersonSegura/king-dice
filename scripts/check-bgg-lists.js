const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function checkBGGLists() {
  try {
    console.log('🔍 Checking BGG lists...\n');

    // 1. Check BGG Hotness
    console.log('📊 Fetching BGG Hotness...');
    const hotnessResponse = await axios.get('https://boardgamegeek.com/xmlapi2/hot?type=boardgame', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const hotnessXml = hotnessResponse.data;
    const hotnessItems = hotnessXml.match(/<item id="(\d+)" rank="(\d+)">/g) || [];
    
    const hotness = hotnessItems.map(item => {
      const match = item.match(/id="(\d+)" rank="(\d+)"/);
      return {
        bggId: parseInt(match[1]),
        rank: parseInt(match[2])
      };
    });

    console.log(`✅ Found ${hotness.length} BGG hotness games\n`);

    // 2. Check BGG Most Played
    console.log('📊 Fetching BGG Most Played...');
    const mostPlayedResponse = await axios.get('https://boardgamegeek.com/xmlapi2/hot?type=boardgame&domain=boardgame', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const mostPlayedXml = mostPlayedResponse.data;
    const mostPlayedItems = mostPlayedXml.match(/<item id="(\d+)" rank="(\d+)">/g) || [];
    
    const mostPlayed = mostPlayedItems.map(item => {
      const match = item.match(/id="(\d+)" rank="(\d+)"/);
      return {
        bggId: parseInt(match[1]),
        rank: parseInt(match[2])
      };
    });

    console.log(`✅ Found ${mostPlayed.length} BGG most played games\n`);

    // 3. Get our hotness games
    const ourHotness = await prisma.game.findMany({
      where: { category: 'hotness' },
      select: { bggId: true, nameEn: true }
    });

    console.log(`📋 Our hotness games: ${ourHotness.length}`);
    
    // Check which BGG hotness games we have
    const ourHotnessIds = new Set(ourHotness.map(g => g.bggId));
    let missingHotness = 0;
    let wrongOrderHotness = 0;

    console.log('\n🔥 HOTNESS COMPARISON:');
    hotness.slice(0, 50).forEach((item, index) => {
      const hasIt = ourHotnessIds.has(item.bggId);
      const shouldBeRank = index + 1;
      if (!hasIt) {
        console.log(`❌ Missing (Rank ${shouldBeRank}): BGG ID ${item.bggId}`);
        missingHotness++;
      }
    });

    // 4. Get our most-played games
    const ourMostPlayed = await prisma.game.findMany({
      where: { category: 'most-played' },
      select: { bggId: true, nameEn: true }
    });

    console.log(`\n📋 Our most-played games: ${ourMostPlayed.length}`);
    
    // Check which BGG most-played games we have
    const ourMostPlayedIds = new Set(ourMostPlayed.map(g => g.bggId));
    let missingMostPlayed = 0;

    console.log('\n🎮 MOST PLAYED COMPARISON:');
    mostPlayed.slice(0, 50).forEach((item, index) => {
      const hasIt = ourMostPlayedIds.has(item.bggId);
      const shouldBeRank = index + 1;
      if (!hasIt) {
        console.log(`❌ Missing (Rank ${shouldBeRank}): BGG ID ${item.bggId}`);
        missingMostPlayed++;
      }
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`🔥 Hotness: Missing ${missingHotness} games from top 50`);
    console.log(`🎮 Most Played: Missing ${missingMostPlayed} games from top 50`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBGGLists();

