const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');

const prisma = new PrismaClient();
const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Different games to reach exactly 50 in each category
const differentRankedGames = [
  { bggId: 12493, name: "Android: Netrunner" },
  { bggId: 120677, name: "Terra Mystica" },
  { bggId: 146021, name: "Fields of Arle" },
  { bggId: 155069, name: "Orléans" },
  { bggId: 12493, name: "Android: Netrunner" }
];

// Different games to reach exactly 50 in each category
const differentHotGames = [
  { bggId: 12493, name: "Android: Netrunner" },
  { bggId: 120677, name: "Terra Mystica" },
  { bggId: 146021, name: "Fields of Arle" },
  { bggId: 155069, name: "Orléans" },
  { bggId: 12493, name: "Android: Netrunner" },
  { bggId: 120677, name: "Terra Mystica" }
];

async function getGameDetails(bggId, category = 'ranked') {
  try {
    const response = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'KingDice/1.0'
      }
    });
    
    const data = await parser.parseStringPromise(response.data);
    const item = data.items?.item;
    
    if (!item) return null;
    
    // Extract the primary name
    let gameName = 'Unknown Game';
    if (item.name) {
      if (Array.isArray(item.name)) {
        const primaryName = item.name.find(n => n.type === 'primary');
        gameName = primaryName ? primaryName.value : item.name[0]?.value || 'Unknown Game';
      } else if (item.name.value) {
        gameName = item.name.value;
      } else if (typeof item.name === 'string') {
        gameName = item.name;
      }
    }

    // Get the real BGG ranking
    let realRanking = null;
    if (item.statistics?.ratings?.ranks?.rank) {
      const boardgameRank = Array.isArray(item.statistics.ratings.ranks.rank) 
        ? item.statistics.ratings.ranks.rank.find(r => r.name === 'boardgame')
        : item.statistics.ratings.ranks.rank;
      
      if (boardgameRank && boardgameRank.value) {
        realRanking = parseInt(boardgameRank.value);
      }
    }

    return {
      bggId: parseInt(item.id),
      name: gameName,
      year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
      minPlayers: item.minplayers?.value ? parseInt(item.minplayers.value) : null,
      maxPlayers: item.maxplayers?.value ? parseInt(item.maxplayers.value) : null,
      minPlayTime: item.minplaytime?.value ? parseInt(item.minplaytime.value) : null,
      maxPlayTime: item.maxplaytime?.value ? parseInt(item.maxplaytime.value) : null,
      image: item.image,
      ranking: realRanking,
      averageRating: item.statistics?.ratings?.average?.value ? 
                    parseFloat(item.statistics.ratings.average.value) : null,
      numVotes: item.statistics?.ratings?.usersrated?.value ? 
                parseInt(item.statistics.ratings.usersrated.value) : null,
      userRating: 0,
      userVotes: 0,
      expansions: 0,
      category: category
    };
  } catch (error) {
    console.error(`❌ Error getting details for BGG ID ${bggId}:`, error.message);
    return null;
  }
}

async function addFinalGames() {
  console.log('🎯 Adding final games to reach exactly 50 in each category...');
  
  // Check current counts
  const currentHotGames = await prisma.game.count({ where: { category: 'hot' } });
  const currentRankedGames = await prisma.game.count({ where: { category: 'ranked' } });
  
  console.log(`📊 Current counts:`);
  console.log(`🔥 Hot games: ${currentHotGames}`);
  console.log(`🏆 Ranked games: ${currentRankedGames}`);
  
  // Add ranked games if needed
  if (currentRankedGames < 50) {
    console.log(`\n🏆 Adding ranked games to reach 50...`);
    
    let addedRanked = 0;
    for (let i = 0; i < differentRankedGames.length && addedRanked < (50 - currentRankedGames); i++) {
      const game = differentRankedGames[i];
      
      // Check if game already exists
      const existingGame = await prisma.game.findUnique({
        where: { bggId: game.bggId }
      });
      
      if (existingGame) {
        console.log(`⏭️ Skipping existing game: ${game.name}`);
        continue;
      }
      
      console.log(`\n🔄 [${i + 1}/${differentRankedGames.length}] Adding ranked game: ${game.name} (BGG ID: ${game.bggId})`);
      
      const gameDetails = await getGameDetails(game.bggId, 'ranked');
      
      if (gameDetails) {
        try {
          await prisma.game.create({
            data: gameDetails
          });
          
          console.log(`✅ Added ranked game: ${gameDetails.name} (Ranking: ${gameDetails.ranking})`);
          addedRanked++;
        } catch (error) {
          console.error(`❌ Error adding ${gameDetails.name}:`, error.message);
        }
      }
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Add hot games if needed
  if (currentHotGames < 50) {
    console.log(`\n🔥 Adding hot games to reach 50...`);
    
    let addedHot = 0;
    for (let i = 0; i < differentHotGames.length && addedHot < (50 - currentHotGames); i++) {
      const game = differentHotGames[i];
      
      // Check if game already exists
      const existingGame = await prisma.game.findUnique({
        where: { bggId: game.bggId }
      });
      
      if (existingGame) {
        console.log(`⏭️ Skipping existing game: ${game.name}`);
        continue;
      }
      
      console.log(`\n🔄 [${i + 1}/${differentHotGames.length}] Adding hot game: ${game.name} (BGG ID: ${game.bggId})`);
      
      const gameDetails = await getGameDetails(game.bggId, 'hot');
      
      if (gameDetails) {
        try {
          await prisma.game.create({
            data: gameDetails
          });
          
          console.log(`✅ Added hot game: ${gameDetails.name} (Ranking: ${gameDetails.ranking})`);
          addedHot++;
        } catch (error) {
          console.error(`❌ Error adding ${gameDetails.name}:`, error.message);
        }
      }
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Final count
  const finalHotCount = await prisma.game.count({ where: { category: 'hot' } });
  const finalRankedCount = await prisma.game.count({ where: { category: 'ranked' } });
  
  console.log(`\n📊 Final counts:`);
  console.log(`🔥 Hot games: ${finalHotCount}`);
  console.log(`🏆 Ranked games: ${finalRankedCount}`);
  console.log(`📈 Total games: ${finalHotCount + finalRankedCount}`);
  
  await prisma.$disconnect();
}

addFinalGames().catch(console.error); 