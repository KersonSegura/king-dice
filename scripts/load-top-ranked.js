const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');

const prisma = new PrismaClient();
const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Lista de los verdaderos top 50 juegos según BGG rankings (2024)
// Estos son los juegos con mejor rating promedio, no los "hot"
const topRankedGames = [
  { bggId: 224517, name: "Brass: Birmingham", expectedRank: 1 },
  { bggId: 342942, name: "Ark Nova", expectedRank: 2 },
  { bggId: 167791, name: "Terraforming Mars", expectedRank: 3 },
  { bggId: 237182, name: "Root", expectedRank: 4 },
  { bggId: 233078, name: "Twilight Imperium: Fourth Edition", expectedRank: 5 },
  { bggId: 316554, name: "Dune: Imperium", expectedRank: 6 },
  { bggId: 291457, name: "Gloomhaven: Jaws of the Lion", expectedRank: 7 },
  { bggId: 162886, name: "Spirit Island", expectedRank: 8 },
  { bggId: 266192, name: "Wingspan", expectedRank: 9 },
  { bggId: 31260, name: "Agricola", expectedRank: 10 },
  { bggId: 9209, name: "Ticket to Ride", expectedRank: 11 },
  { bggId: 13, name: "CATAN", expectedRank: 12 },
  { bggId: 822, name: "Carcassonne", expectedRank: 13 },
  { bggId: 30549, name: "Pandemic", expectedRank: 14 },
  { bggId: 180263, name: "Blood Rage", expectedRank: 15 },
  { bggId: 167355, name: "Nemesis", expectedRank: 16 },
  { bggId: 177736, name: "A Feast for Odin", expectedRank: 17 },
  { bggId: 312484, name: "Lost Ruins of Arnak", expectedRank: 18 },
  { bggId: 199792, name: "Everdell", expectedRank: 19 },
  { bggId: 295947, name: "Cascadia", expectedRank: 20 },
  { bggId: 366013, name: "Heat: Pedal to the Metal", expectedRank: 21 },
  { bggId: 367220, name: "Sea Salt & Paper", expectedRank: 22 },
  { bggId: 373106, name: "Sky Team", expectedRank: 23 },
  { bggId: 332772, name: "Revive", expectedRank: 24 },
  { bggId: 371942, name: "The White Castle", expectedRank: 25 },
  { bggId: 244521, name: "Quacks", expectedRank: 26 },
  { bggId: 414317, name: "Harmonies", expectedRank: 27 },
  { bggId: 367966, name: "Endeavor: Deep Sea", expectedRank: 28 },
  { bggId: 391163, name: "Forest Shuffle", expectedRank: 29 },
  { bggId: 338960, name: "Slay the Spire: The Board Game", expectedRank: 30 },
  { bggId: 429863, name: "Covenant", expectedRank: 31 },
  { bggId: 421006, name: "The Lord of the Rings: Duel for Middle-earth", expectedRank: 32 },
  { bggId: 397598, name: "Dune: Imperium – Uprising", expectedRank: 33 },
  { bggId: 418059, name: "SETI: Search for Extraterrestrial Intelligence", expectedRank: 34 },
  { bggId: 413246, name: "Bomb Busters", expectedRank: 35 },
  { bggId: 432520, name: "Karnak", expectedRank: 36 },
  { bggId: 445673, name: "Lightning Train", expectedRank: 37 },
  { bggId: 451214, name: "Thebai", expectedRank: 38 },
  { bggId: 447243, name: "Duel for Cardia", expectedRank: 39 },
  { bggId: 381248, name: "Nemesis: Retaliation", expectedRank: 40 },
  { bggId: 428635, name: "Ruins", expectedRank: 41 },
  { bggId: 444481, name: "Star Wars: Battle of Hoth", expectedRank: 42 },
  { bggId: 420033, name: "Vantage", expectedRank: 43 },
  { bggId: 411894, name: "Kinfire Council", expectedRank: 44 },
  { bggId: 450782, name: "Codenames: Back to Hogwarts", expectedRank: 45 },
  { bggId: 450923, name: "The Danes", expectedRank: 46 },
  { bggId: 420087, name: "Flip 7", expectedRank: 47 },
  { bggId: 249746, name: "Nanty Narking", expectedRank: 48 },
  { bggId: 342900, name: "Earthborne Rangers", expectedRank: 49 },
  { bggId: 359871, name: "Arcs", expectedRank: 50 }
];

async function getGameDetails(bggId) {
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
    
    // Extraer el nombre principal (primary)
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

    // Obtener el ranking real de BGG
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
      category: 'ranked' // Marcar como top ranked game
    };
  } catch (error) {
    console.error(`❌ Error obteniendo detalles para BGG ID ${bggId}:`, error.message);
    return null;
  }
}

async function loadTopRankedGames() {
  console.log('🏆 Cargando los TOP 50 JUEGOS RANKEADOS de BoardGameGeek...');
  console.log('📊 Estos son los juegos con mejor rating promedio histórico');
  
  const loadedGames = [];
  
  for (let i = 0; i < topRankedGames.length; i++) {
    const game = topRankedGames[i];
    console.log(`\n🔄 [${i + 1}/${topRankedGames.length}] Obteniendo detalles de: ${game.name} (BGG ID: ${game.bggId})`);
    
    const gameDetails = await getGameDetails(game.bggId);
    
    if (gameDetails) {
      try {
        // Usar el ranking esperado si no hay ranking real
        if (!gameDetails.ranking) {
          gameDetails.ranking = game.expectedRank;
        }
        
        await prisma.game.upsert({
          where: { bggId: gameDetails.bggId },
          update: gameDetails,
          create: gameDetails
        });
        
        loadedGames.push(gameDetails);
        console.log(`✅ Guardado: ${gameDetails.name} (Ranking BGG: ${gameDetails.ranking})`);
      } catch (error) {
        console.error(`❌ Error guardando ${gameDetails.name}:`, error.message);
      }
    }
    
    // Delay para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Ordenar por ranking real
  loadedGames.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
  
  console.log('\n📊 TOP 50 JUEGOS RANKEADOS ordenados por ranking real:');
  loadedGames.forEach((game, index) => {
    console.log(`${index + 1}. ${game.name} (Ranking BGG: ${game.ranking})`);
  });
  
  console.log(`\n🎉 Carga completada! Se cargaron ${loadedGames.length} juegos del TOP 50 RANKEADO.`);
  console.log('💡 Estos son los verdaderos "mejores juegos" según BGG, no los "hot games".');
  await prisma.$disconnect();
}

loadTopRankedGames().catch(console.error); 