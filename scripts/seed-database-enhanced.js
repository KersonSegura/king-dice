const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config({ path: '.env.local' });

// Configuración mejorada
const BGG_API_BASE_URL = process.env.BGG_API_BASE_URL || 'https://boardgamegeek.com/xmlapi2';
const MAX_GAMES_TO_FETCH = parseInt(process.env.MAX_GAMES_TO_FETCH) || 5000;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 50;
const DELAY_BETWEEN_REQUESTS = parseInt(process.env.DELAY_BETWEEN_REQUESTS) || 500;
const BGG_API_TIMEOUT = parseInt(process.env.BGG_API_TIMEOUT) || 30000;
const BGG_API_RETRY_ATTEMPTS = parseInt(process.env.BGG_API_RETRY_ATTEMPTS) || 3;
const BGG_API_RETRY_DELAY = parseInt(process.env.BGG_API_RETRY_DELAY) || 1000;

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
 * Obtener juegos populares de BGG (Hot Games)
 */
async function getHotGames() {
  console.log('🔄 Obteniendo juegos populares (Hot Games) de BGG...');
  
  const hotGames = [];
  let currentRank = 1;
  
  try {
    const hotResponse = await makeRequestWithRetry(`${BGG_API_BASE_URL}/hot?type=boardgame`);
    const hotData = await parser.parseStringPromise(hotResponse);
    
    if (hotData.items && hotData.items.item) {
      const items = Array.isArray(hotData.items.item) ? hotData.items.item : [hotData.items.item];
      
      for (const item of items) {
        hotGames.push({
          bggId: parseInt(item.id),
          name: item.name?.value || item.name,
          year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
          ranking: currentRank,
          source: 'hot'
        });
        
        currentRank++;
      }
    }
    
    console.log(`✅ Obtenidos ${hotGames.length} juegos populares`);
    return hotGames;
  } catch (error) {
    console.error('❌ Error obteniendo juegos populares:', error.message);
    return [];
  }
}

/**
 * Obtener juegos por ranking (Top 1000)
 */
async function getTopRankedGames() {
  console.log('🔄 Obteniendo juegos por ranking (Top 1000) de BGG...');
  
  const topGames = [];
  let page = 1;
  const gamesPerPage = 100;
  
  try {
    while (topGames.length < 1000 && page <= 10) {
      const response = await makeRequestWithRetry(`${BGG_API_BASE_URL}/search?query=&type=boardgame&start=${(page - 1) * gamesPerPage}&numitems=${gamesPerPage}`);
      const data = await parser.parseStringPromise(response);
      
      if (data.items && data.items.item) {
        const items = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
        
        for (const item of items) {
          if (topGames.length >= 1000) break;
          
          // Extraer nombre de manera más robusta
          let name = 'Unknown Game';
          if (item.name) {
            if (Array.isArray(item.name)) {
              const primaryName = item.name.find(n => n.type === 'primary');
              name = primaryName?.value || item.name[0]?.value || 'Unknown Game';
            } else if (typeof item.name === 'object') {
              name = item.name.value || 'Unknown Game';
            } else {
              name = item.name;
            }
          }
          
          topGames.push({
            bggId: parseInt(item.id),
            name: name,
            year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
            ranking: topGames.length + 1,
            source: 'top'
          });
        }
      }
      
      page++;
      await delay(DELAY_BETWEEN_REQUESTS);
    }
    
    console.log(`✅ Obtenidos ${topGames.length} juegos por ranking`);
    return topGames;
  } catch (error) {
    console.error('❌ Error obteniendo juegos por ranking:', error.message);
    return [];
  }
}

/**
 * Obtener juegos por año (últimos 10 años)
 */
async function getRecentGames() {
  console.log('🔄 Obteniendo juegos recientes (últimos 10 años) de BGG...');
  
  const recentGames = [];
  const currentYear = new Date().getFullYear();
  
  try {
    for (let year = currentYear; year >= currentYear - 10; year--) {
      console.log(`📅 Obteniendo juegos del año ${year}...`);
      
      const response = await makeRequestWithRetry(`${BGG_API_BASE_URL}/search?query=&type=boardgame&year=${year}&numitems=100`);
      const data = await parser.parseStringPromise(response);
      
      if (data.items && data.items.item) {
        const items = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
        
        for (const item of items) {
          if (recentGames.length >= 2000) break;
          
          // Extraer nombre de manera más robusta
          let name = 'Unknown Game';
          if (item.name) {
            if (Array.isArray(item.name)) {
              const primaryName = item.name.find(n => n.type === 'primary');
              name = primaryName?.value || item.name[0]?.value || 'Unknown Game';
            } else if (typeof item.name === 'object') {
              name = item.name.value || 'Unknown Game';
            } else {
              name = item.name;
            }
          }
          
          recentGames.push({
            bggId: parseInt(item.id),
            name: name,
            year: year,
            ranking: null,
            source: 'recent'
          });
        }
      }
      
      await delay(DELAY_BETWEEN_REQUESTS);
    }
    
    console.log(`✅ Obtenidos ${recentGames.length} juegos recientes`);
    return recentGames;
  } catch (error) {
    console.error('❌ Error obteniendo juegos recientes:', error.message);
    return [];
  }
}

/**
 * Obtener detalles completos de un juego
 */
async function getGameDetails(bggId) {
  try {
    const response = await makeRequestWithRetry(`${BGG_API_BASE_URL}/thing?id=${bggId}&stats=1`);
    const data = await parser.parseStringPromise(response);
    
    if (data.items && data.items.item) {
      const item = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
      
      return {
        bggId: parseInt(item.id),
        name: item.name?.find(n => n.type === 'primary')?.value || item.name?.value || item.name,
        year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
        minPlayers: item.minplayers?.value ? parseInt(item.minplayers.value) : null,
        maxPlayers: item.maxplayers?.value ? parseInt(item.maxplayers.value) : null,
        minPlayTime: item.minplaytime?.value ? parseInt(item.minplaytime.value) : null,
        maxPlayTime: item.maxplaytime?.value ? parseInt(item.maxplaytime.value) : null,
        image: item.image?.value || item.thumbnail?.value || null,
        ranking: null
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles del juego ${bggId}:`, error.message);
    return null;
  }
}

/**
 * Obtener detalles de múltiples juegos en lotes
 */
async function getGamesDetailsInBatches(gameIds, batchSize = BATCH_SIZE) {
  console.log(`🔄 Obteniendo detalles de ${gameIds.length} juegos en lotes de ${batchSize}...`);
  
  const allGames = [];
  
  for (let i = 0; i < gameIds.length; i += batchSize) {
    const batch = gameIds.slice(i, i + batchSize);
    const batchIds = batch.map(game => game.bggId).join(',');
    
    try {
      const response = await makeRequestWithRetry(`${BGG_API_BASE_URL}/thing?id=${batchIds}&stats=1`);
      const data = await parser.parseStringPromise(response);
      
      if (data.items && data.items.item) {
        const items = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
        
        for (const item of items) {
          const originalGame = batch.find(g => g.bggId === parseInt(item.id));
          
          if (originalGame) {
            // Extraer nombre de manera más robusta
            let name = originalGame.name;
            if (item.name) {
              if (Array.isArray(item.name)) {
                const primaryName = item.name.find(n => n.type === 'primary');
                name = primaryName?.value || item.name[0]?.value || originalGame.name;
              } else if (typeof item.name === 'object') {
                name = item.name.value || originalGame.name;
              } else {
                name = item.name;
              }
            }
            
            allGames.push({
              ...originalGame,
              name: name,
              year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : originalGame.year,
              minPlayers: item.minplayers?.value ? parseInt(item.minplayers.value) : null,
              maxPlayers: item.maxplayers?.value ? parseInt(item.maxplayers.value) : null,
              minPlayTime: item.minplaytime?.value ? parseInt(item.minplaytime.value) : null,
              maxPlayTime: item.maxplaytime?.value ? parseInt(item.maxplaytime.value) : null,
              image: item.image?.value || item.thumbnail?.value || null,
              ranking: originalGame.ranking
            });
          }
        }
      }
      
      console.log(`✅ Procesado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(gameIds.length / batchSize)}`);
      await delay(DELAY_BETWEEN_REQUESTS);
    } catch (error) {
      console.error(`❌ Error procesando lote ${Math.floor(i / batchSize) + 1}:`, error.message);
    }
  }
  
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
            ranking: game.ranking
          }
        });
        updatedCount++;
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
            ranking: game.ranking
          }
        });
        savedCount++;
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
    console.log('🚀 Iniciando proceso de seeding mejorado...');
    
    // Obtener juegos de múltiples fuentes
    const [hotGames, topGames, recentGames] = await Promise.all([
      getHotGames(),
      getTopRankedGames(),
      getRecentGames()
    ]);
    
    // Combinar todos los juegos y eliminar duplicados
    const allGames = [...hotGames, ...topGames, ...recentGames];
    const uniqueGames = allGames.filter((game, index, self) => 
      index === self.findIndex(g => g.bggId === game.bggId)
    );
    
    console.log(`📊 Total de juegos únicos obtenidos: ${uniqueGames.length}`);
    console.log(`📈 Distribución por fuente:`);
    console.log(`   - Hot Games: ${hotGames.length}`);
    console.log(`   - Top Ranked: ${topGames.length}`);
    console.log(`   - Recent Games: ${recentGames.length}`);
    
    // Obtener detalles completos
    const gamesWithDetails = await getGamesDetailsInBatches(uniqueGames);
    
    // Guardar en la base de datos
    const { savedCount, updatedCount } = await saveGamesToDatabase(gamesWithDetails);
    
    // Estadísticas finales
    const totalGames = await prisma.game.count();
    console.log(`📈 Total de juegos en la base de datos: ${totalGames}`);
    
    console.log('✅ Proceso de seeding completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en el proceso de seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  main();
}

module.exports = { main }; 