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
 * Obtener detalles de un juego específico
 */
async function getGameDetails(bggId) {
  try {
    const response = await makeRequestWithRetry(`${BGG_API_BASE_URL}/thing?id=${bggId}&stats=1`);
    const data = await parser.parseStringPromise(response);
    
    if (data.items && data.items.item) {
      const item = Array.isArray(data.items.item) ? data.items.item[0] : data.items.item;
      
      // Extraer estadísticas de rating
      const stats = item.statistics?.ratings || {};
      const averageRating = stats.average?.value ? parseFloat(stats.average.value) : null;
      const numVotes = stats.usersrated?.value ? parseInt(stats.usersrated.value) : null;
      
      // Extraer ranking
      let rank = null;
      if (stats.ranks && stats.ranks.rank) {
        const ranks = Array.isArray(stats.ranks.rank) ? stats.ranks.rank : [stats.ranks.rank];
        const boardgameRank = ranks.find(r => r.name === 'boardgame');
        if (boardgameRank && boardgameRank.value) {
          rank = parseInt(boardgameRank.value);
        }
      }
      
      return {
        bggId: parseInt(item.id),
        name: extractName(item),
        year: item.yearpublished?.value ? parseInt(item.yearpublished.value) : null,
        minPlayers: item.minplayers?.value ? parseInt(item.minplayers.value) : null,
        maxPlayers: item.maxplayers?.value ? parseInt(item.maxplayers.value) : null,
        minPlayTime: item.minplaytime?.value ? parseInt(item.minplaytime.value) : null,
        maxPlayTime: item.maxplaytime?.value ? parseInt(item.maxplaytime.value) : null,
        image: item.image?.value || item.thumbnail?.value || null,
        averageRating: averageRating,
        numVotes: numVotes,
        rank: rank
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error obteniendo detalles para BGG ID ${bggId}:`, error.message);
    return null;
  }
}

/**
 * Actualizar juego en la base de datos usando SQL directo
 */
async function updateGameInDatabase(game) {
  try {
    await prisma.$executeRaw`
      UPDATE games 
      SET 
        name = ${game.name},
        year = ${game.year},
        "minPlayers" = ${game.minPlayers},
        "maxPlayers" = ${game.maxPlayers},
        "minPlayTime" = ${game.minPlayTime},
        "maxPlayTime" = ${game.maxPlayTime},
        image = ${game.image},
        ranking = ${game.rank},
        "averageRating" = ${game.averageRating},
        "numVotes" = ${game.numVotes},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "bggId" = ${game.bggId}
    `;
    
    console.log(`✅ Actualizado: ${game.name} (Rating: ${game.averageRating?.toFixed(2) || 'N/A'})`);
    return true;
  } catch (error) {
    console.error(`❌ Error actualizando ${game.name}:`, error.message);
    return false;
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando actualización de juegos populares...');
    
    // Lista de juegos populares y clásicos con IDs correctos
    const popularGameIds = [
      // Juegos clásicos
      13,      // Catan
      31260,   // Agricola
      237182,  // Root
      167791,  // Terraforming Mars
      224517,  // Spirit Island
      342942,  // Wingspan
      266192,  // Dune: Imperium
      244521,  // Quacks of Quedlinburg
      199792,  // Everdell
      
      // Juegos populares adicionales
      68448,   // 7 Wonders
      3076,    // Puerto Rico (correcto)
      70323,   // King of Tokyo (correcto)
      172225,  // Exploding Kittens (correcto)
      174430,  // Gloomhaven (correcto)
      12333,   // Twilight Struggle (correcto)
      124742,  // Android: Netrunner (correcto)
      180263,  // The 7th Continent (correcto)
      
      // Juegos adicionales populares
      9209,    // Ticket to Ride
      70323,   // Carcassonne
      162886,  // Spirit Island
      342942,  // Wingspan
      266192,  // Dune: Imperium
      244521,  // Quacks of Quedlinburg
      199792   // Everdell
    ];
    
    // Eliminar duplicados
    const uniqueGameIds = [...new Set(popularGameIds)];
    
    let updatedCount = 0;
    
    for (let i = 0; i < uniqueGameIds.length; i++) {
      const bggId = uniqueGameIds[i];
      console.log(`🔄 Procesando juego ${i + 1}/${uniqueGameIds.length} (BGG ID: ${bggId})...`);
      
      const gameDetails = await getGameDetails(bggId);
      
      if (gameDetails) {
        const success = await updateGameInDatabase(gameDetails);
        if (success) {
          updatedCount++;
        }
      }
      
      // Delay entre requests
      if (i < uniqueGameIds.length - 1) {
        await delay(2000);
      }
    }
    
    console.log(`📈 Actualización completada: ${updatedCount} juegos actualizados`);
    
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