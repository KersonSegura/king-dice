const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config({ path: '.env.local' });

// Configuración
const BGG_API_BASE_URL = process.env.BGG_API_BASE_URL || 'https://boardgamegeek.com/xmlapi2';
const BGG_API_TIMEOUT = parseInt(process.env.BGG_API_TIMEOUT) || 30000;
const BGG_API_RETRY_ATTEMPTS = parseInt(process.env.BGG_API_RETRY_ATTEMPTS) || 3;
const BGG_API_RETRY_DELAY = parseInt(process.env.BGG_API_RETRY_DELAY) || 2000;

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
        name: item.name?.value || item.name || 'Unknown',
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
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Verificando ratings reales de BGG...');
    
    // Lista de juegos importantes para verificar
    const gameIds = [
      13,      // Catan
      237182,  // Root
      167791,  // Terraforming Mars
      224517,  // Spirit Island
      342942,  // Wingspan
      266192,  // Dune: Imperium
      244521,  // Quacks of Quedlinburg
      199792,  // Everdell
      68448,   // 7 Wonders
      3076,    // Puerto Rico
      70323,   // King of Tokyo
      172225,  // Exploding Kittens
      174430,  // Gloomhaven
      12333,   // Twilight Struggle
      124742,  // Android: Netrunner
      180263   // The 7th Continent
    ];
    
    console.log('\n📊 Ratings reales de BGG:');
    console.log('Juego | BGG ID | Rating | Votos | Ranking BGG');
    console.log('------|--------|--------|-------|------------');
    
    for (let i = 0; i < gameIds.length; i++) {
      const bggId = gameIds[i];
      console.log(`\n🔄 Verificando BGG ID: ${bggId}...`);
      
      const gameDetails = await getGameDetails(bggId);
      
      if (gameDetails) {
        console.log(`${gameDetails.name} | ${bggId} | ${gameDetails.averageRating?.toFixed(2) || 'N/A'} | ${gameDetails.numVotes?.toLocaleString() || 'N/A'} | #${gameDetails.rank || 'N/A'}`);
      }
      
      // Delay entre requests
      if (i < gameIds.length - 1) {
        await delay(2000);
      }
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  main();
}

module.exports = { main }; 