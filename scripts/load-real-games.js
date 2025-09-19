const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');

const prisma = new PrismaClient();
const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

// Lista de juegos populares reales con sus BGG IDs
const popularGames = [
  { bggId: 13, name: "Catan" },
  { bggId: 9209, name: "Ticket to Ride" },
  { bggId: 30549, name: "Pandemic" },
  { bggId: 822, name: "Carcassonne" },
  { bggId: 31260, name: "Agricola" },
  { bggId: 167791, name: "Terraforming Mars" },
  { bggId: 237182, name: "Root" },
  { bggId: 266192, name: "Wingspan" },
  { bggId: 342942, name: "Azul" },
  { bggId: 291457, name: "Gloomhaven" },
  { bggId: 180263, name: "Blood Rage" },
  { bggId: 167791, name: "Terraforming Mars" },
  { bggId: 237182, name: "Root" },
  { bggId: 266192, name: "Wingspan" },
  { bggId: 342942, name: "Azul" }
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

    return {
      bggId: parseInt(item.id),
      name: gameName,
      year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
      minPlayers: item.minplayers?.value ? parseInt(item.minplayers.value) : null,
      maxPlayers: item.maxplayers?.value ? parseInt(item.maxplayers.value) : null,
      minPlayTime: item.minplaytime?.value ? parseInt(item.minplaytime.value) : null,
      maxPlayTime: item.maxplaytime?.value ? parseInt(item.maxplaytime.value) : null,
      image: item.image,
      ranking: item.statistics?.ratings?.ranks?.rank?.find(r => r.name === 'boardgame')?.value ? 
               parseInt(item.statistics.ratings.ranks.rank.find(r => r.name === 'boardgame').value) : null,
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

async function loadRealGames() {
  console.log('🌍 Cargando juegos reales de BoardGameGeek...');
  
  for (const game of popularGames) {
    console.log(`🔄 Obteniendo detalles de: ${game.name} (BGG ID: ${game.bggId})`);
    
    const gameDetails = await getGameDetails(game.bggId);
    
    if (gameDetails) {
      try {
        await prisma.game.upsert({
          where: { bggId: gameDetails.bggId },
          update: gameDetails,
          create: gameDetails
        });
        console.log(`✅ Guardado: ${gameDetails.name}`);
      } catch (error) {
        console.error(`❌ Error guardando ${gameDetails.name}:`, error.message);
      }
    }
    
    // Delay para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('🎉 Carga de juegos reales completada!');
  await prisma.$disconnect();
}

loadRealGames().catch(console.error); 