const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');

const prisma = new PrismaClient();
const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Additional games to reach 50 in each category
const additionalRankedGames = [
  { bggId: 224517, name: "Brass: Birmingham" },
  { bggId: 342942, name: "Ark Nova" },
  { bggId: 167791, name: "Terraforming Mars" },
  { bggId: 237182, name: "Root" },
  { bggId: 233078, name: "Twilight Imperium: Fourth Edition" },
  { bggId: 316554, name: "Dune: Imperium" },
  { bggId: 291457, name: "Gloomhaven: Jaws of the Lion" },
  { bggId: 162886, name: "Spirit Island" },
  { bggId: 266192, name: "Wingspan" },
  { bggId: 31260, name: "Agricola" },
  { bggId: 9209, name: "Ticket to Ride" },
  { bggId: 13, name: "CATAN" },
  { bggId: 822, name: "Carcassonne" },
  { bggId: 30549, name: "Pandemic" },
  { bggId: 180263, name: "Blood Rage" },
  { bggId: 167355, name: "Nemesis" },
  { bggId: 177736, name: "A Feast for Odin" },
  { bggId: 312484, name: "Lost Ruins of Arnak" },
  { bggId: 199792, name: "Everdell" },
  { bggId: 295947, name: "Cascadia" },
  { bggId: 366013, name: "Heat: Pedal to the Metal" },
  { bggId: 367220, name: "Sea Salt & Paper" },
  { bggId: 373106, name: "Sky Team" },
  { bggId: 332772, name: "Revive" },
  { bggId: 371942, name: "The White Castle" },
  { bggId: 244521, name: "Quacks" },
  { bggId: 414317, name: "Harmonies" },
  { bggId: 367966, name: "Endeavor: Deep Sea" },
  { bggId: 391163, name: "Forest Shuffle" },
  { bggId: 338960, name: "Slay the Spire: The Board Game" },
  { bggId: 429863, name: "Covenant" },
  { bggId: 421006, name: "The Lord of the Rings: Duel for Middle-earth" },
  { bggId: 397598, name: "Dune: Imperium – Uprising" },
  { bggId: 418059, name: "SETI: Search for Extraterrestrial Intelligence" },
  { bggId: 413246, name: "Bomb Busters" },
  { bggId: 432520, name: "Karnak" },
  { bggId: 445673, name: "Lightning Train" },
  { bggId: 451214, name: "Thebai" },
  { bggId: 447243, name: "Duel for Cardia" },
  { bggId: 381248, name: "Nemesis: Retaliation" },
  { bggId: 428635, name: "Ruins" },
  { bggId: 444481, name: "Star Wars: Battle of Hoth" },
  { bggId: 420033, name: "Vantage" },
  { bggId: 411894, name: "Kinfire Council" },
  { bggId: 450782, name: "Codenames: Back to Hogwarts" },
  { bggId: 450923, name: "The Danes" },
  { bggId: 420087, name: "Flip 7" },
  { bggId: 249746, name: "Nanty Narking" },
  { bggId: 342900, name: "Earthborne Rangers" },
  { bggId: 359871, name: "Arcs" },
  // Additional games to reach 50
  { bggId: 150376, name: "7 Wonders" },
  { bggId: 68448, name: "7 Wonders Duel" },
  { bggId: 12333, name: "Puerto Rico" },
  { bggId: 312484, name: "Lost Ruins of Arnak" },
  { bggId: 167791, name: "Terraforming Mars" },
  { bggId: 237182, name: "Root" },
  { bggId: 233078, name: "Twilight Imperium: Fourth Edition" },
  { bggId: 316554, name: "Dune: Imperium" },
  { bggId: 291457, name: "Gloomhaven: Jaws of the Lion" },
  { bggId: 162886, name: "Spirit Island" },
  { bggId: 266192, name: "Wingspan" },
  { bggId: 31260, name: "Agricola" },
  { bggId: 9209, name: "Ticket to Ride" },
  { bggId: 13, name: "CATAN" },
  { bggId: 822, name: "Carcassonne" },
  { bggId: 30549, name: "Pandemic" },
  { bggId: 180263, name: "Blood Rage" },
  { bggId: 167355, name: "Nemesis" },
  { bggId: 177736, name: "A Feast for Odin" },
  { bggId: 199792, name: "Everdell" },
  { bggId: 295947, name: "Cascadia" },
  { bggId: 366013, name: "Heat: Pedal to the Metal" },
  { bggId: 367220, name: "Sea Salt & Paper" },
  { bggId: 373106, name: "Sky Team" },
  { bggId: 332772, name: "Revive" },
  { bggId: 371942, name: "The White Castle" },
  { bggId: 244521, name: "Quacks" },
  { bggId: 414317, name: "Harmonies" },
  { bggId: 367966, name: "Endeavor: Deep Sea" },
  { bggId: 391163, name: "Forest Shuffle" },
  { bggId: 338960, name: "Slay the Spire: The Board Game" },
  { bggId: 429863, name: "Covenant" },
  { bggId: 421006, name: "The Lord of the Rings: Duel for Middle-earth" },
  { bggId: 397598, name: "Dune: Imperium – Uprising" },
  { bggId: 418059, name: "SETI: Search for Extraterrestrial Intelligence" },
  { bggId: 413246, name: "Bomb Busters" },
  { bggId: 432520, name: "Karnak" },
  { bggId: 445673, name: "Lightning Train" },
  { bggId: 451214, name: "Thebai" },
  { bggId: 447243, name: "Duel for Cardia" },
  { bggId: 381248, name: "Nemesis: Retaliation" },
  { bggId: 428635, name: "Ruins" },
  { bggId: 444481, name: "Star Wars: Battle of Hoth" },
  { bggId: 420033, name: "Vantage" },
  { bggId: 411894, name: "Kinfire Council" },
  { bggId: 450782, name: "Codenames: Back to Hogwarts" },
  { bggId: 450923, name: "The Danes" },
  { bggId: 420087, name: "Flip 7" },
  { bggId: 249746, name: "Nanty Narking" },
  { bggId: 342900, name: "Earthborne Rangers" },
  { bggId: 359871, name: "Arcs" }
];

// Additional hot games to reach 50
const additionalHotGames = [
  { bggId: 436217, name: "The Lord of the Rings: Fate of the Fellowship" },
  { bggId: 429861, name: "Ace of Spades" },
  { bggId: 228328, name: "Rurik: Dawn of Kiev" },
  { bggId: 416851, name: "Castle Combo" },
  { bggId: 408180, name: "Shackleton Base: A Journey to the Moon" },
  { bggId: 369880, name: "Beer & Bread" },
  { bggId: 391137, name: "Galactic Cruise" },
  { bggId: 224517, name: "Brass: Birmingham" },
  { bggId: 342942, name: "Ark Nova" },
  { bggId: 167791, name: "Terraforming Mars" },
  { bggId: 237182, name: "Root" },
  { bggId: 233078, name: "Twilight Imperium: Fourth Edition" },
  { bggId: 316554, name: "Dune: Imperium" },
  { bggId: 291457, name: "Gloomhaven: Jaws of the Lion" },
  { bggId: 162886, name: "Spirit Island" },
  { bggId: 266192, name: "Wingspan" },
  { bggId: 31260, name: "Agricola" },
  { bggId: 9209, name: "Ticket to Ride" },
  { bggId: 13, name: "CATAN" },
  { bggId: 822, name: "Carcassonne" },
  { bggId: 30549, name: "Pandemic" },
  { bggId: 180263, name: "Blood Rage" },
  { bggId: 167355, name: "Nemesis" },
  { bggId: 177736, name: "A Feast for Odin" },
  { bggId: 312484, name: "Lost Ruins of Arnak" },
  { bggId: 199792, name: "Everdell" },
  { bggId: 295947, name: "Cascadia" },
  { bggId: 366013, name: "Heat: Pedal to the Metal" },
  { bggId: 367220, name: "Sea Salt & Paper" },
  { bggId: 373106, name: "Sky Team" },
  { bggId: 332772, name: "Revive" },
  { bggId: 371942, name: "The White Castle" },
  { bggId: 244521, name: "Quacks" },
  { bggId: 414317, name: "Harmonies" },
  { bggId: 367966, name: "Endeavor: Deep Sea" },
  { bggId: 391163, name: "Forest Shuffle" },
  { bggId: 338960, name: "Slay the Spire: The Board Game" },
  { bggId: 429863, name: "Covenant" },
  { bggId: 421006, name: "The Lord of the Rings: Duel for Middle-earth" },
  { bggId: 397598, name: "Dune: Imperium – Uprising" },
  { bggId: 418059, name: "SETI: Search for Extraterrestrial Intelligence" },
  { bggId: 413246, name: "Bomb Busters" },
  { bggId: 432520, name: "Karnak" },
  { bggId: 445673, name: "Lightning Train" },
  { bggId: 451214, name: "Thebai" },
  { bggId: 447243, name: "Duel for Cardia" },
  { bggId: 381248, name: "Nemesis: Retaliation" },
  { bggId: 428635, name: "Ruins" },
  { bggId: 444481, name: "Star Wars: Battle of Hoth" },
  { bggId: 420033, name: "Vantage" },
  { bggId: 411894, name: "Kinfire Council" },
  { bggId: 450782, name: "Codenames: Back to Hogwarts" },
  { bggId: 450923, name: "The Danes" },
  { bggId: 420087, name: "Flip 7" },
  { bggId: 249746, name: "Nanty Narking" },
  { bggId: 342900, name: "Earthborne Rangers" },
  { bggId: 359871, name: "Arcs" }
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

async function addMissingGames() {
  console.log('🎯 Adding missing games to reach 50 in each category...');
  
  // Check current counts
  const currentHotGames = await prisma.game.count({ where: { category: 'hot' } });
  const currentRankedGames = await prisma.game.count({ where: { category: 'ranked' } });
  
  console.log(`📊 Current counts:`);
  console.log(`🔥 Hot games: ${currentHotGames}`);
  console.log(`🏆 Ranked games: ${currentRankedGames}`);
  
  // Add more ranked games if needed
  if (currentRankedGames < 50) {
    console.log(`\n🏆 Adding more ranked games to reach 50...`);
    
    let addedRanked = 0;
    for (let i = 0; i < additionalRankedGames.length && addedRanked < (50 - currentRankedGames); i++) {
      const game = additionalRankedGames[i];
      
      // Check if game already exists
      const existingGame = await prisma.game.findUnique({
        where: { bggId: game.bggId }
      });
      
      if (existingGame) {
        console.log(`⏭️ Skipping existing game: ${game.name}`);
        continue;
      }
      
      console.log(`\n🔄 [${i + 1}/${additionalRankedGames.length}] Adding ranked game: ${game.name} (BGG ID: ${game.bggId})`);
      
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
  
  // Add more hot games if needed
  if (currentHotGames < 50) {
    console.log(`\n🔥 Adding more hot games to reach 50...`);
    
    let addedHot = 0;
    for (let i = 0; i < additionalHotGames.length && addedHot < (50 - currentHotGames); i++) {
      const game = additionalHotGames[i];
      
      // Check if game already exists
      const existingGame = await prisma.game.findUnique({
        where: { bggId: game.bggId }
      });
      
      if (existingGame) {
        console.log(`⏭️ Skipping existing game: ${game.name}`);
        continue;
      }
      
      console.log(`\n🔄 [${i + 1}/${additionalHotGames.length}] Adding hot game: ${game.name} (BGG ID: ${game.bggId})`);
      
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
  const finalHotGames = await prisma.game.count({ where: { category: 'hot' } });
  const finalRankedGames = await prisma.game.count({ where: { category: 'ranked' } });
  
  console.log(`\n📊 Final counts:`);
  console.log(`🔥 Hot games: ${finalHotGames}`);
  console.log(`🏆 Ranked games: ${finalRankedGames}`);
  console.log(`📈 Total games: ${finalHotGames + finalRankedGames}`);
  
  await prisma.$disconnect();
}

addMissingGames().catch(console.error); 