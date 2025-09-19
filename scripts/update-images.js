const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config({ path: '.env.local' });

// Configuración
const BGG_API_BASE_URL = process.env.BGG_API_BASE_URL || 'https://boardgamegeek.com/xmlapi2';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 10;
const DELAY_BETWEEN_REQUESTS = parseInt(process.env.DELAY_BETWEEN_REQUESTS) || 1000;
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
 * Obtener imágenes de juegos en lotes
 */
async function updateImagesInBatches(games, batchSize = BATCH_SIZE) {
  console.log(`🔄 Actualizando imágenes de ${games.length} juegos en lotes de ${batchSize}...`);
  
  let updatedCount = 0;
  
  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    const batchIds = batch.map(game => game.bggId).join(',');
    
    try {
      const response = await makeRequestWithRetry(`${BGG_API_BASE_URL}/thing?id=${batchIds}&stats=1`);
      const data = await parser.parseStringPromise(response);
      
      if (data.items && data.items.item) {
        const items = Array.isArray(data.items.item) ? data.items.item : [data.items.item];
        
        for (const item of items) {
          const game = batch.find(g => g.bggId === parseInt(item.id));
          
          if (game) {
            const image = item.image?.value || item.thumbnail?.value || null;
            
            if (image) {
              try {
                await prisma.game.update({
                  where: { bggId: game.bggId },
                  data: { image: image }
                });
                updatedCount++;
                console.log(`✅ Imagen actualizada para: ${game.name}`);
              } catch (error) {
                console.error(`❌ Error actualizando imagen para ${game.name}:`, error.message);
              }
            }
          }
        }
      }
      
      console.log(`✅ Procesado lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(games.length / batchSize)}`);
      await delay(DELAY_BETWEEN_REQUESTS);
    } catch (error) {
      console.error(`❌ Error procesando lote ${Math.floor(i / batchSize) + 1}:`, error.message);
    }
  }
  
  return updatedCount;
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando actualización de imágenes...');
    
    // Obtener juegos sin imágenes, ordenados por ranking (los más populares primero)
    const gamesWithoutImages = await prisma.game.findMany({
      where: {
        OR: [
          { image: null },
          { image: '' }
        ]
      },
      orderBy: [
        { ranking: 'asc' },
        { bggId: 'asc' }
      ],
      take: 1000 // Solo los primeros 1000 para no sobrecargar la API
    });
    
    console.log(`📊 Encontrados ${gamesWithoutImages.length} juegos sin imágenes`);
    
    if (gamesWithoutImages.length === 0) {
      console.log('✅ Todos los juegos ya tienen imágenes');
      return;
    }
    
    // Actualizar imágenes
    const updatedCount = await updateImagesInBatches(gamesWithoutImages);
    
    // Estadísticas finales
    const totalGames = await prisma.game.count();
    const gamesWithImages = await prisma.game.count({
      where: {
        image: {
          not: null
        }
      }
    });
    
    console.log(`📈 Estadísticas finales:`);
    console.log(`   - Total de juegos: ${totalGames}`);
    console.log(`   - Juegos con imágenes: ${gamesWithImages}`);
    console.log(`   - Juegos sin imágenes: ${totalGames - gamesWithImages}`);
    console.log(`   - Imágenes actualizadas en esta sesión: ${updatedCount}`);
    
    console.log('✅ Proceso de actualización de imágenes completado!');
    
  } catch (error) {
    console.error('❌ Error en el proceso de actualización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  main();
}

module.exports = { main }; 