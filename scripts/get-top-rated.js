const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config({ path: '.env.local' });

// Configuración
const BGG_API_BASE_URL = process.env.BGG_API_BASE_URL || 'https://boardgamegeek.com/xmlapi2';
const BGG_API_TIMEOUT = parseInt(process.env.BGG_API_TIMEOUT) || 30000;
const BGG_API_RETRY_ATTEMPTS = parseInt(process.env.BGG_API_RETRY_ATTEMPTS) || 3;
const BGG_API_RETRY_DELAY = parseInt(process.env.BGG_API_RETRY_DELAY) || 2000;

// Inicializar Prisma
const prisma = new PrismaClient();

// Parser XML
const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true
});

/**
 * Función para hacer delay entre requests
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Función para hacer requests con retry
 */
async function makeRequestWithRetry(url, retries = BGG_API_RETRY_ATTEMPTS) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: BGG_API_TIMEOUT,
        headers: {
          'User-Agent': 'ReglasDeMesa/1.0 (https://reglasdemesa.com)'
        }
      });
      return response.data;
    } catch (error) {
      console.log(`Intento ${i + 1} falló para ${url}: ${error.message}`);
      if (i === retries - 1) throw error;
      await delay(BGG_API_RETRY_DELAY);
    }
  }
}

/**
 * Extraer nombre de manera robusta
 */
function extractName(item) {
  if (!item.name) return 'Unknown Game';
  
  if (Array.isArray(item.name)) {
    const primaryName = item.name.find(n => n.type === 'primary');
    return primaryName?.value || item.name[0]?.value || 'Unknown Game';
  } else if (typeof item.name === 'object') {
    return item.name.value || 'Unknown Game';
  } else {
    return item.name;
  }
}

/**
 * Obtener juegos con mejor rating promedio
 */
async function getTopRatedGames() {
  console.log('🔄 Obteniendo juegos con mejor rating promedio...');
  
  const topRatedGames = [];
  
  try {
    // Obtener juegos con mejor rating (top 200)
    const ratedResponse = await makeRequestWithRetry(`${BGG_API_BASE_URL}/search?query=&type=boardgame&searchtype=rank`);
    const ratedData = await parser.parseStringPromise(ratedResponse);
    
    if (ratedData.items && ratedData.items.item) {
      const items = Array.isArray(ratedData.items.item) ? ratedData.items.item : [ratedData.items.item];
      
      // Tomar los primeros 200 con mejor rating
      for (let i = 0; i < Math.min(200, items.length); i++) {
        const item = items[i];
        topRatedGames.push({
          bggId: parseInt(item.id),
          name: extractName(item),
          year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
          source: 'toprated'
        });
      }
    }
    
    console.log(`✅ Obtenidos ${topRatedGames.length} juegos con mejor rating`);
    return topRatedGames;
  } catch (error) {
    console.error('❌ Error obteniendo juegos con mejor rating:', error.message);
    return [];
  }
}

/**
 * Obtener juegos más populares
 */
async function getTopPopularGames() {
  console.log('🔄 Obteniendo juegos más populares...');
  
  const topPopularGames = [];
  
  try {
    // Obtener juegos populares (hot games)
    const hotResponse = await makeRequestWithRetry(`${BGG_API_BASE_URL}/hot?type=boardgame`);
    const hotData = await parser.parseStringPromise(hotResponse);
    
    if (hotData.items && hotData.items.item) {
      const items = Array.isArray(hotData.items.item) ? hotData.items.item : [hotData.items.item];
      
      // Tomar los primeros 200 más populares
      for (let i = 0; i < Math.min(200, items.length); i++) {
        const item = items[i];
        topPopularGames.push({
          bggId: parseInt(item.id),
          name: extractName(item),
          year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
          source: 'toppopular'
        });
      }
    }
    
    console.log(`✅ Obtenidos ${topPopularGames.length} juegos más populares`);
    return topPopularGames;
  } catch (error) {
    console.error('❌ Error obteniendo juegos más populares:', error.message);
    return [];
  }
}

/**
 * Obtener juegos del Hall of Fame (juegos clásicos históricos)
 */
async function getHallOfFameGames() {
  console.log('🔄 Obteniendo juegos del Hall of Fame...');
  
  const hallOfFameGames = [];
  
  // Lista de juegos clásicos históricos (BGG Hall of Fame)
  const classicGameIds = [
    13,    // Catan
    237182, // Root
    167791, // Brass: Birmingham
    224517, // Spirit Island
    162886, // Agricola
    31260,  // Terraforming Mars
    342942, // Wingspan
    266192, // Dune: Imperium
    316554, // Dune: Imperium
    237182, // Root
    244521, // Quacks of Quedlinburg
    367966, // Endeavor: Deep Sea
    391752, // Steam Power
    397598, // Dune: Imperium – Uprising
    414117, // Wroth
    371942, // The White Castle
    408180, // Shackleton Base
    391163, // Forest Shuffle
    367220, // Sea Salt & Paper
    416851, // Sky Team
    167355, // Castle Combo
    418855, // Nemesis
    385761, // Dying Message
    367379, // Faraway
    365717, // Deal with the Devil
    199792  // Everdell
  ];
  
  try {
    for (let i = 0; i < classicGameIds.length; i++) {
      const gameId = classicGameIds[i];
      hallOfFameGames.push({
        bggId: gameId,
        name: `Classic Game ${gameId}`, // Placeholder, se actualizará con detalles
        year: null,
        source: 'halloffame'
      });
      
      // Delay para evitar rate limiting
      if (i < classicGameIds.length - 1) {
        await delay(100);
      }
    }
    
    console.log(`✅ Obtenidos ${hallOfFameGames.length} juegos del Hall of Fame`);
    return hallOfFameGames;
  } catch (error) {
    console.error('❌ Error obteniendo juegos del Hall of Fame:', error.message);
    return [];
  }
}

/**
 * Combinar y eliminar duplicados
 */
function combineAndDeduplicateGames(topRated, topPopular, hallOfFame) {
  console.log('🔄 Combinando y eliminando duplicados...');
  
  const allGames = [...topRated, ...topPopular, ...hallOfFame];
  const uniqueGames = [];
  const seenIds = new Set();
  
  for (const game of allGames) {
    if (!seenIds.has(game.bggId)) {
      seenIds.add(game.bggId);
      uniqueGames.push(game);
    }
  }
  
  console.log(`✅ Combinados ${allGames.length} juegos en ${uniqueGames.length} únicos`);
  return uniqueGames;
}

/**
 * Obtener detalles completos de juegos en lotes
 */
async function getGamesDetails(gameIds) {
  console.log(`🔄 Obteniendo detalles de ${gameIds.length} juegos en lotes...`);
  
  const allGames = [];
  const batchSize = 10; // Lotes más pequeños para evitar URLs largas
  
  for (let i = 0; i < gameIds.length; i += batchSize) {
    const batch = gameIds.slice(i, i + batchSize);
    const batchIds = batch.map(game => game.bggId).join(',');
    
    try {
      console.log(`🔄 Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(gameIds.length / batchSize)}...`);
      
      const response = await makeRequestWithRetry(`${BGG_API_BASE_URL}/thing?id=${batchIds}&stats=1`);
      const data = await parser.parseStringPromise(response);
      
      if (data.items && data.items.item) {
        const items = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
        
        for (const item of items) {
          const originalGame = batch.find(g => g.bggId === parseInt(item.id));
          
          if (originalGame) {
            // Extraer estadísticas de rating
            const stats = item.statistics?.ratings || {};
            const averageRating = stats.average?.value ? parseFloat(stats.average.value) : null;
            const numVotes = stats.usersrated?.value ? parseInt(stats.usersrated.value) : null;
            const rank = stats.ranks?.rank?.find(r => r.name === 'boardgame')?.value || null;
            
            allGames.push({
              ...originalGame,
              name: extractName(item),
              year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : originalGame.year,
              minPlayers: item.minplayers?.value ? parseInt(item.minplayers.value) : null,
              maxPlayers: item.maxplayers?.value ? parseInt(item.maxplayers.value) : null,
              minPlayTime: item.minplaytime?.value ? parseInt(item.minplaytime.value) : null,
              maxPlayTime: item.maxplaytime?.value ? parseInt(item.maxplaytime.value) : null,
              image: item.image?.value || item.thumbnail?.value || null,
              averageRating: averageRating,
              numVotes: numVotes,
              rank: rank ? parseInt(rank) : null
            });
          }
        }
      }
      
      // Delay entre lotes para evitar rate limiting
      if (i + batchSize < gameIds.length) {
        await delay(1000);
      }
      
    } catch (error) {
      console.error(`❌ Error procesando lote ${Math.floor(i / batchSize) + 1}:`, error.message);
    }
  }
  
  console.log(`✅ Procesados ${allGames.length} juegos con detalles`);
  return allGames;
}

/**
 * Guardar juegos en la base de datos
 */
async function saveGamesToDatabase(games) {
  console.log(`💾 Guardando ${games.length} juegos en la base de datos...`);
  
  let savedCount = 0;
  let updatedCount = 0;
  
  for (const game of games) {
    try {
      const existingGame = await prisma.game.findUnique({
        where: { bggId: game.bggId }
      });
      
      if (existingGame) {
        await prisma.game.update({
          where: { bggId: game.bggId },
          data: {
            name: game.name,
            year: game.year,
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            minPlayTime: game.minPlayTime,
            maxPlayTime: game.maxPlayTime,
            image: game.image,
            ranking: game.rank, // Usar el ranking real de BGG
            averageRating: game.averageRating,
            numVotes: game.numVotes
          }
        });
        updatedCount++;
        console.log(`✅ Actualizado: ${game.name} (Rating: ${game.averageRating?.toFixed(2) || 'N/A'})`);
      } else {
        await prisma.game.create({
          data: {
            bggId: game.bggId,
            name: game.name,
            year: game.year,
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            minPlayTime: game.minPlayTime,
            maxPlayTime: game.maxPlayTime,
            image: game.image,
            ranking: game.rank,
            averageRating: game.averageRating,
            numVotes: game.numVotes
          }
        });
        savedCount++;
        console.log(`✅ Creado: ${game.name} (Rating: ${game.averageRating?.toFixed(2) || 'N/A'})`);
      }
    } catch (error) {
      console.error(`❌ Error guardando juego ${game.bggId}:`, error.message);
    }
  }
  
  console.log(`✅ Guardados ${savedCount} juegos nuevos y actualizados ${updatedCount} existentes`);
  return { savedCount, updatedCount };
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando obtención de juegos más votados...');
    
    // Obtener juegos de diferentes fuentes
    const [topRatedGames, topPopularGames, hallOfFameGames] = await Promise.all([
      getTopRatedGames(),
      getTopPopularGames(),
      getHallOfFameGames()
    ]);
    
    // Combinar y eliminar duplicados
    const combinedGames = combineAndDeduplicateGames(topRatedGames, topPopularGames, hallOfFameGames);
    
    if (combinedGames.length === 0) {
      console.log('❌ No se pudieron obtener juegos');
      return;
    }
    
    console.log('📊 Juegos combinados obtenidos:');
    combinedGames.slice(0, 10).forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} (BGG ID: ${game.bggId})`);
    });
    
    // Obtener detalles completos
    const gamesWithDetails = await getGamesDetails(combinedGames);
    
    // Ordenar por rating promedio (descendente)
    gamesWithDetails.sort((a, b) => {
      if (!a.averageRating && !b.averageRating) return 0;
      if (!a.averageRating) return 1;
      if (!b.averageRating) return -1;
      return b.averageRating - a.averageRating;
    });
    
    // Guardar en la base de datos
    const { savedCount, updatedCount } = await saveGamesToDatabase(gamesWithDetails);
    
    // Estadísticas finales
    const totalGames = await prisma.game.count();
    const gamesWithRating = await prisma.game.count({
      where: {
        averageRating: {
          not: null
        }
      }
    });
    
    console.log(`📈 Estadísticas finales:`);
    console.log(`   - Total de juegos: ${totalGames}`);
    console.log(`   - Juegos con rating: ${gamesWithRating}`);
    console.log(`   - Juegos más votados agregados/actualizados: ${savedCount + updatedCount}`);
    
    console.log('✅ Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  main();
}

module.exports = { main }; 