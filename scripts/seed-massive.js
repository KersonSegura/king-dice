const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config({ path: '.env.local' });

// Configuración
const BGG_API_BASE_URL = process.env.BGG_API_BASE_URL || 'https://boardgamegeek.com/xmlapi2';
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

// Términos de búsqueda populares para obtener muchos juegos
const SEARCH_TERMS = [
  'catan', 'monopoly', 'chess', 'poker', 'risk', 'clue', 'scrabble', 'battleship',
  'connect', 'checkers', 'backgammon', 'mahjong', 'go', 'shogi', 'dominoes',
  'card', 'dice', 'board', 'strategy', 'family', 'party', 'cooperative',
  'adventure', 'fantasy', 'sci-fi', 'horror', 'mystery', 'detective', 'puzzle',
  'word', 'number', 'color', 'shape', 'animal', 'food', 'travel', 'history',
  'war', 'battle', 'castle', 'kingdom', 'empire', 'civilization', 'trade',
  'economy', 'politics', 'diplomacy', 'exploration', 'discovery', 'invention',
  'science', 'technology', 'medicine', 'art', 'music', 'literature', 'sports',
  'racing', 'competition', 'tournament', 'championship', 'olympics', 'olympic'
];

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
 * Buscar juegos por término
 */
async function searchGamesByTerm(term, maxResults = 100) {
  console.log(`🔍 Buscando juegos con término: "${term}"`);
  
  const games = [];
  
  try {
    const response = await makeRequestWithRetry(`${BGG_API_BASE_URL}/search?query=${encodeURIComponent(term)}&type=boardgame&numitems=${maxResults}`);
    const data = await parser.parseStringPromise(response);
    
    if (data.items && data.items.item) {
      const items = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
      
      for (const item of items) {
        games.push({
          bggId: parseInt(item.id),
          name: extractName(item),
          year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
          ranking: null,
          source: `search:${term}`
        });
      }
    }
    
    console.log(`✅ Encontrados ${games.length} juegos para "${term}"`);
    return games;
  } catch (error) {
    console.error(`❌ Error buscando juegos con término "${term}":`, error.message);
    return [];
  }
}

/**
 * Obtener detalles completos de juegos en lotes
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
    console.log('🚀 Iniciando proceso de seeding masivo...');
    
    const allGames = [];
    
    // Buscar juegos por cada término
    for (const term of SEARCH_TERMS) {
      const games = await searchGamesByTerm(term, 50);
      allGames.push(...games);
      
      // Eliminar duplicados después de cada búsqueda
      const uniqueGames = allGames.filter((game, index, self) => 
        index === self.findIndex(g => g.bggId === game.bggId)
      );
      
      console.log(`📊 Total de juegos únicos hasta ahora: ${uniqueGames.length}`);
      
      // Pausa entre búsquedas
      await delay(DELAY_BETWEEN_REQUESTS);
    }
    
    // Eliminar duplicados finales
    const uniqueGames = allGames.filter((game, index, self) => 
      index === self.findIndex(g => g.bggId === game.bggId)
    );
    
    console.log(`📊 Total de juegos únicos obtenidos: ${uniqueGames.length}`);
    
    // Obtener detalles completos
    const gamesWithDetails = await getGamesDetailsInBatches(uniqueGames);
    
    // Guardar en la base de datos
    const { savedCount, updatedCount } = await saveGamesToDatabase(gamesWithDetails);
    
    // Estadísticas finales
    const totalGames = await prisma.game.count();
    console.log(`📈 Total de juegos en la base de datos: ${totalGames}`);
    
    console.log('✅ Proceso de seeding masivo completado exitosamente!');
    
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