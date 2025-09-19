const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config({ path: '.env.local' });

// Configuración
const BGG_API_BASE_URL = process.env.BGG_API_BASE_URL || 'https://boardgamegeek.com/xmlapi2';
const MAX_GAMES_TO_FETCH = parseInt(process.env.MAX_GAMES_TO_FETCH) || 1000;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 10;
const DELAY_BETWEEN_REQUESTS = parseInt(process.env.DELAY_BETWEEN_REQUESTS) || 1000;
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
 * Obtener juegos populares de BGG
 */
async function getHotGames() {
  console.log('🔄 Obteniendo juegos populares de BGG...');
  
  const hotGames = [];
  let currentRank = 1;
  
  try {
    // Obtener juegos populares
    const hotResponse = await makeRequestWithRetry(`${BGG_API_BASE_URL}/hot?type=boardgame`);
    const hotData = await parser.parseStringPromise(hotResponse);
    
    if (hotData.items && hotData.items.item) {
      const items = Array.isArray(hotData.items.item) ? hotData.items.item : [hotData.items.item];
      
      for (const item of items) {
        if (hotGames.length >= MAX_GAMES_TO_FETCH) break;
        
        hotGames.push({
          bggId: parseInt(item.id),
          name: item.name?.value || item.name,
          year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
          ranking: currentRank,
          thumbnail: item.thumbnail?.value || null
        });
        
        currentRank++;
      }
    }
    
    console.log(`✅ Obtenidos ${hotGames.length} juegos populares`);
    return hotGames;
  } catch (error) {
    console.error('❌ Error obteniendo juegos populares:', error.message);
    throw error;
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
        ranking: null // Se mantendrá el ranking del hot games
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
            allGames.push({
              ...originalGame,
              name: item.name?.find(n => n.type === 'primary')?.value || item.name?.value || item.name,
              year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : originalGame.year,
              minPlayers: item.minplayers?.value ? parseInt(item.minplayers.value) : null,
              maxPlayers: item.maxplayers?.value ? parseInt(item.maxplayers.value) : null,
              minPlayTime: item.minplaytime?.value ? parseInt(item.minplaytime.value) : null,
              maxPlayTime: item.maxplaytime?.value ? parseInt(item.maxplaytime.value) : null,
              image: item.image?.value || item.thumbnail?.value || originalGame.thumbnail
            });
          }
        }
      }
      
      console.log(`✅ Procesado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(gameIds.length / batchSize)}`);
      
      // Delay entre requests para no sobrecargar la API
      if (i + batchSize < gameIds.length) {
        await delay(DELAY_BETWEEN_REQUESTS);
      }
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
  console.log(`🔄 Guardando ${games.length} juegos en la base de datos...`);
  
  let savedCount = 0;
  let updatedCount = 0;
  
  for (const game of games) {
    try {
      const existingGame = await prisma.game.findUnique({
        where: { bggId: game.bggId }
      });
      
      if (existingGame) {
        // Actualizar juego existente
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
        // Crear nuevo juego
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
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando script de población de base de datos...');
  console.log(`📊 Configuración: Máximo ${MAX_GAMES_TO_FETCH} juegos, Lotes de ${BATCH_SIZE}, Delay ${DELAY_BETWEEN_REQUESTS}ms`);
  
  try {
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Paso 1: Obtener juegos populares
    const hotGames = await getHotGames();
    
    if (hotGames.length === 0) {
      console.log('❌ No se encontraron juegos populares');
      return;
    }
    
    // Paso 2: Obtener detalles completos de los juegos
    const gamesWithDetails = await getGamesDetailsInBatches(hotGames);
    
    if (gamesWithDetails.length === 0) {
      console.log('❌ No se pudieron obtener detalles de los juegos');
      return;
    }
    
    // Paso 3: Guardar en la base de datos
    await saveGamesToDatabase(gamesWithDetails);
    
    // Paso 4: Mostrar estadísticas finales
    const totalGames = await prisma.game.count();
    console.log(`📈 Total de juegos en la base de datos: ${totalGames}`);
    
    const gamesWithRanking = await prisma.game.count({
      where: { ranking: { not: null } }
    });
    console.log(`🏆 Juegos con ranking: ${gamesWithRanking}`);
    
    const gamesWithImage = await prisma.game.count({
      where: { image: { not: null } }
    });
    console.log(`🖼️ Juegos con imagen: ${gamesWithImage}`);
    
    console.log('🎉 Script completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Script terminado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { main, getHotGames, getGameDetails, saveGamesToDatabase }; 