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
 * Buscar juego por nombre
 */
async function searchGameByName(gameName) {
  try {
    const encodedName = encodeURIComponent(gameName);
    const response = await makeRequestWithRetry(`${BGG_API_BASE_URL}/search?query=${encodedName}&type=boardgame`);
    const data = await parser.parseStringPromise(response);
    
    if (data.items && data.items.item) {
      const items = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
      
      console.log(`\n🔍 Resultados para "${gameName}":`);
      items.slice(0, 5).forEach((item, index) => {
        const name = item.name?.value || item.name || 'Unknown';
        const year = item.yearpublished?.value || 'N/A';
        console.log(`  ${index + 1}. ${name} (${year}) - BGG ID: ${item.id}`);
      });
      
      return items[0]?.id ? parseInt(items[0].id) : null;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error buscando "${gameName}":`, error.message);
    return null;
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Buscando BGG IDs de juegos populares...');
    
    const gamesToSearch = [
      'Exploding Kittens',
      'Ticket to Ride',
      '7 Wonders',
      'Carcassonne',
      'King of Tokyo',
      'Puerto Rico',
      'Gloomhaven',
      'Twilight Struggle',
      'Android Netrunner',
      'The 7th Continent'
    ];
    
    const results = {};
    
    for (let i = 0; i < gamesToSearch.length; i++) {
      const gameName = gamesToSearch[i];
      console.log(`\n🔄 Buscando: ${gameName}`);
      
      const bggId = await searchGameByName(gameName);
      if (bggId) {
        results[gameName] = bggId;
      }
      
      // Delay entre requests
      if (i < gamesToSearch.length - 1) {
        await delay(1000);
      }
    }
    
    console.log('\n📋 Resumen de BGG IDs encontrados:');
    Object.entries(results).forEach(([name, id]) => {
      console.log(`  ${name}: ${id}`);
    });
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  }
}

// Ejecutar el script
if (require.main === module) {
  main();
}

module.exports = { main }; 