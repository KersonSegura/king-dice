const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');

const prisma = new PrismaClient();
const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Lista actualizada de los juegos más populares según BGG (2024)
const topGames = [
  { bggId: 342942, name: "Ark Nova", expectedRank: 1 },
  { bggId: 167791, name: "Terraforming Mars", expectedRank: 2 },
  { bggId: 237182, name: "Root", expectedRank: 3 },
  { bggId: 266192, name: "Wingspan", expectedRank: 4 },
  { bggId: 291457, name: "Gloomhaven: Jaws of the Lion", expectedRank: 5 },
  { bggId: 31260, name: "Agricola", expectedRank: 6 },
  { bggId: 9209, name: "Ticket to Ride", expectedRank: 7 },
  { bggId: 13, name: "CATAN", expectedRank: 8 },
  { bggId: 822, name: "Carcassonne", expectedRank: 9 },
  { bggId: 30549, name: "Pandemic", expectedRank: 10 },
  { bggId: 180263, name: "Blood Rage", expectedRank: 11 },
  { bggId: 167791, name: "Terraforming Mars: Ares Expedition", expectedRank: 12 },
  { bggId: 342942, name: "Ark Nova", expectedRank: 13 },
  { bggId: 237182, name: "Root: A Game of Woodland Might and Right", expectedRank: 14 },
  { bggId: 266192, name: "Wingspan: European Expansion", expectedRank: 15 }
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
      expansions: 0
    };
  } catch (error) {
    console.error(`❌ Error obteniendo detalles para BGG ID ${bggId}:`, error.message);
    return null;
  }
}

async function loadTopGames() {
  console.log('🏆 Cargando los juegos más populares de BoardGameGeek...');
  
  const loadedGames = [];
  
  for (const game of topGames) {
    console.log(`🔄 Obteniendo detalles de: ${game.name} (BGG ID: ${game.bggId})`);
    
    const gameDetails = await getGameDetails(game.bggId);
    
    if (gameDetails) {
      try {
        // Usar el ranking real de BGG si está disponible, sino usar el esperado
        if (!gameDetails.ranking) {
          gameDetails.ranking = game.expectedRank;
        }
        
        await prisma.game.upsert({
          where: { bggId: gameDetails.bggId },
          update: gameDetails,
          create: gameDetails
        });
        
        loadedGames.push(gameDetails);
        console.log(`✅ Guardado: ${gameDetails.name} (Ranking: ${gameDetails.ranking})`);
      } catch (error) {
        console.error(`❌ Error guardando ${gameDetails.name}:`, error.message);
      }
    }
    
    // Delay para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Ordenar por ranking y actualizar si es necesario
  loadedGames.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
  
  console.log('\n📊 Juegos cargados ordenados por ranking:');
  loadedGames.forEach((game, index) => {
    console.log(`${index + 1}. ${game.name} (Ranking BGG: ${game.ranking})`);
  });
  
  console.log('\n🎉 Carga de juegos top completada!');
  await prisma.$disconnect();
}

loadTopGames().catch(console.error); 