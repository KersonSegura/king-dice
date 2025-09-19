const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');

const prisma = new PrismaClient();
const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });

async function getHotGames() {
  try {
    console.log('🔥 Obteniendo juegos populares (Hot Games) de BGG...');
    
    const response = await axios.get('https://boardgamegeek.com/xmlapi2/hot?type=boardgame', {
      timeout: 10000,
      headers: {
        'User-Agent': 'KingDice/1.0'
      }
    });
    
    const data = await parser.parseStringPromise(response.data);
    const items = data.items?.item;
    
    if (!items) {
      console.error('❌ No se encontraron juegos en la respuesta');
      return [];
    }
    
    const games = Array.isArray(items) ? items : [items];
    console.log(`✅ Obtenidos ${games.length} juegos populares de BGG`);
    
    return games.map((item, index) => ({
      bggId: parseInt(item.id),
      name: item.name?.value || item.name,
      year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
      ranking: index + 1, // Ranking basado en la posición en la lista hot
      source: 'hot'
    }));
  } catch (error) {
    console.error('❌ Error obteniendo juegos populares:', error.message);
    return [];
  }
}

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
      category: 'hot' // Marcar como hot game
    };
  } catch (error) {
    console.error(`❌ Error obteniendo detalles para BGG ID ${bggId}:`, error.message);
    return null;
  }
}

async function loadHotGames() {
  console.log('🏆 Cargando los JUEGOS POPULARES (Hot Games) de BoardGameGeek...');
  console.log('📊 Estos son juegos que están de moda actualmente');
  
  // Obtener la lista de juegos populares
  const hotGames = await getHotGames();
  
  if (hotGames.length === 0) {
    console.log('❌ No se pudieron obtener juegos populares');
    return;
  }
  
  console.log(`📋 Lista de juegos populares obtenida:`);
  hotGames.forEach((game, index) => {
    console.log(`${index + 1}. ${game.name} (BGG ID: ${game.bggId})`);
  });
  
  // Obtener detalles de cada juego
  const loadedGames = [];
  
  for (let i = 0; i < hotGames.length; i++) {
    const hotGame = hotGames[i];
    console.log(`\n🔄 [${i + 1}/${hotGames.length}] Obteniendo detalles de: ${hotGame.name} (BGG ID: ${hotGame.bggId})`);
    
    const gameDetails = await getGameDetails(hotGame.bggId);
    
    if (gameDetails) {
      try {
        // Usar el ranking de hot games si no hay ranking real
        if (!gameDetails.ranking) {
          gameDetails.ranking = hotGame.ranking;
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
  
  // Ordenar por ranking
  loadedGames.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
  
  console.log('\n📊 JUEGOS POPULARES ordenados por ranking:');
  loadedGames.forEach((game, index) => {
    console.log(`${index + 1}. ${game.name} (Ranking BGG: ${game.ranking})`);
  });
  
  console.log(`\n🎉 Carga completada! Se cargaron ${loadedGames.length} juegos populares.`);
  console.log('💡 Estos son juegos que están de moda actualmente en BGG.');
  await prisma.$disconnect();
}

loadHotGames().catch(console.error); 