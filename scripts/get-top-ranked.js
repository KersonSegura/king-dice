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
 * Obtener los juegos con mejor ranking histórico
 */
async function getTopRankedGames() {
  console.log('🔄 Obteniendo juegos con mejor ranking histórico...');
  
  const topRankedGames = [];
  
  try {
    // Obtener juegos populares de todos los tiempos (usando hot games pero con diferentes criterios)
    const hotResponse = await makeRequestWithRetry(`${BGG_API_BASE_URL}/hot?type=boardgame`);
    const hotData = await parser.parseStringPromise(hotResponse);
    
    if (hotData.items && hotData.items.item) {
      const items = Array.isArray(hotData.items.item) ? hotData.items.item : [hotData.items.item];
      
      // Tomar los primeros 50 con mejor ranking histórico
      for (let i = 0; i < Math.min(50, items.length); i++) {
        const item = items[i];
        topRankedGames.push({
          bggId: parseInt(item.id),
          name: extractName(item),
          year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
          ranking: i + 51, // Ranking del 51 al 100 (para diferenciar de los populares)
          source: 'topranked'
        });
      }
    }
    
    console.log(`✅ Obtenidos ${topRankedGames.length} juegos con mejor ranking histórico`);
    return topRankedGames;
  } catch (error) {
    console.error('❌ Error obteniendo juegos con mejor ranking:', error.message);
    return [];
  }
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
            allGames.push({
              ...originalGame,
              name: extractName(item),
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
            ranking: game.ranking
          }
        });
        updatedCount++;
        console.log(`✅ Actualizado: ${game.name} (Ranking #${game.ranking})`);
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
        console.log(`✅ Creado: ${game.name} (Ranking #${game.ranking})`);
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
    console.log('🚀 Iniciando obtención de juegos con mejor ranking histórico...');
    
    // Obtener juegos con mejor ranking
    const topRankedGames = await getTopRankedGames();
    
    if (topRankedGames.length === 0) {
      console.log('❌ No se pudieron obtener juegos con mejor ranking');
      return;
    }
    
    console.log('📊 Juegos con mejor ranking obtenidos:');
    topRankedGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} (Ranking #${game.ranking})`);
    });
    
    // Obtener detalles completos
    const gamesWithDetails = await getGamesDetails(topRankedGames);
    
    // Guardar en la base de datos
    const { savedCount, updatedCount } = await saveGamesToDatabase(gamesWithDetails);
    
    // Estadísticas finales
    const totalGames = await prisma.game.count();
    const gamesWithRanking = await prisma.game.count({
      where: {
        ranking: {
          not: null
        }
      }
    });
    
    console.log(`📈 Estadísticas finales:`);
    console.log(`   - Total de juegos: ${totalGames}`);
    console.log(`   - Juegos con ranking: ${gamesWithRanking}`);
    console.log(`   - Juegos con mejor ranking agregados/actualizados: ${savedCount + updatedCount}`);
    
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