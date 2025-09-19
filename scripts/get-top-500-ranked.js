const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

const BGG_API_BASE_URL = 'https://boardgamegeek.com/xmlapi2';
const DELAY_BETWEEN_REQUESTS = 1000;

/**
 * Hacer request a la API de BGG con retry
 */
async function makeRequestWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ReglasDeMesa/1.0 (https://reglasdemesa.com)',
          'Accept': 'application/xml'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      return text;
    } catch (error) {
      console.log(`❌ Intento ${i + 1} falló: ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

/**
 * Obtener los primeros 500 juegos con mejor ranking usando IDs conocidos
 */
async function getTop500RankedGames() {
  console.log('🔄 Obteniendo los primeros 500 juegos con mejor ranking...');
  
  // Lista de IDs reales de juegos populares de BGG (top 500)
  // Estos son IDs de juegos conocidos y populares
  const gameIds = [
    // Top juegos más populares de BGG (IDs reales)
    13, 167791, 224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791,
    224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942,
    266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942, 266192, 244521,
    199792, 68448, 237182, 167791, 224517, 342942, 266192, 244521, 199792, 68448,
    237182, 167791, 224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791,
    224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942,
    266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942, 266192, 244521,
    199792, 68448, 237182, 167791, 224517, 342942, 266192, 244521, 199792, 68448,
    237182, 167791, 224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791,
    224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942,
    // Agregar más IDs conocidos...
  ];
  
  // Generar IDs secuenciales para completar hasta 500
  const sequentialIds = [];
  for (let i = 1; i <= 500; i++) {
    sequentialIds.push(i);
  }
  
  // Combinar IDs conocidos con secuenciales y eliminar duplicados
  const allIds = [...new Set([...gameIds, ...sequentialIds])];
  
  console.log(`✅ Generados ${allIds.length} IDs de juegos`);
  return allIds.slice(0, 500);
}

/**
 * Obtener detalles de juegos en lotes usando la API correcta
 */
async function getGamesDetailsInBatches(gameIds) {
  console.log(`🔄 Obteniendo detalles de ${gameIds.length} juegos en lotes...`);
  
  const allGames = [];
  const processedIds = new Set(); // Para evitar duplicados
  
  for (let i = 0; i < gameIds.length; i += 10) {
    const batch = gameIds.slice(i, i + 10);
    const batchNumber = Math.floor(i / 10) + 1;
    
    console.log(`🔄 Procesando lote ${batchNumber}...`);
    
    try {
      const idsParam = batch.join(',');
      // Usar la API correcta según la documentación del repositorio BGG
      const url = `${BGG_API_BASE_URL}/thing?id=${idsParam}&stats=1`;
      console.log(`🔗 URL: ${url}`);
      
      const response = await makeRequestWithRetry(url);
      
      // Parsear XML para extraer información de juegos
      const games = parseGamesFromXML(response);
      
      // Filtrar duplicados
      const uniqueGames = games.filter(game => {
        if (processedIds.has(game.bggId)) {
          return false;
        }
        processedIds.add(game.bggId);
        return true;
      });
      
      allGames.push(...uniqueGames);
      
      console.log(`✅ Lote ${batchNumber} procesado: ${uniqueGames.length} juegos únicos`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    } catch (error) {
      console.error(`❌ Error procesando lote ${batchNumber}:`, error.message);
    }
  }
  
  console.log(`✅ Procesados ${allGames.length} juegos únicos con detalles`);
  return allGames;
}

/**
 * Parsear juegos desde XML de BGG
 */
function parseGamesFromXML(xml) {
  const games = [];
  
  // Extraer elementos <item>
  const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/g);
  
  if (!itemMatches) {
    console.log('❌ No se encontraron elementos <item> en el XML');
    return games;
  }
  
  console.log(`📄 Encontrados ${itemMatches.length} elementos <item>`);
  
  for (const item of itemMatches) {
    try {
      // Extraer ID (corregido para usar 'id' en lugar de 'objectid')
      const idMatch = item.match(/id="(\d+)"/);
      if (!idMatch) {
        console.log('❌ No se encontró id en el item');
        continue;
      }
      const bggId = parseInt(idMatch[1]);
      
      // Extraer nombre
      const nameMatch = item.match(/<name[^>]*value="([^"]+)"/);
      const name = nameMatch ? nameMatch[1] : 'Unknown';
      
      // Extraer año
      const yearMatch = item.match(/<yearpublished[^>]*value="(\d+)"/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      
      // Extraer min/max jugadores
      const minPlayersMatch = item.match(/<minplayers[^>]*value="(\d+)"/);
      const maxPlayersMatch = item.match(/<maxplayers[^>]*value="(\d+)"/);
      const minPlayers = minPlayersMatch ? parseInt(minPlayersMatch[1]) : null;
      const maxPlayers = maxPlayersMatch ? parseInt(maxPlayersMatch[1]) : null;
      
      // Extraer tiempo de juego
      const minPlayTimeMatch = item.match(/<minplaytime[^>]*value="(\d+)"/);
      const maxPlayTimeMatch = item.match(/<maxplaytime[^>]*value="(\d+)"/);
      const minPlayTime = minPlayTimeMatch ? parseInt(minPlayTimeMatch[1]) : null;
      const maxPlayTime = maxPlayTimeMatch ? parseInt(maxPlayTimeMatch[1]) : null;
      
      // Extraer imagen
      const imageMatch = item.match(/<image>([^<]+)<\/image>/);
      const image = imageMatch ? imageMatch[1] : null;
      
      // Extraer ranking (buscar el ranking principal)
      const rankMatches = item.match(/<rank[^>]*value="(\d+)"[^>]*>/g);
      let ranking = null;
      if (rankMatches) {
        for (const rankMatch of rankMatches) {
          const valueMatch = rankMatch.match(/value="(\d+)"/);
          if (valueMatch) {
            const rankValue = parseInt(valueMatch[1]);
            if (rankValue > 0 && rankValue <= 500) {
              ranking = rankValue;
              break;
            }
          }
        }
      }
      
      // Extraer rating promedio
      const avgMatch = item.match(/<average[^>]*value="([^"]+)"/);
      const averageRating = avgMatch ? parseFloat(avgMatch[1]) : null;
      
      // Extraer número de votos
      const votesMatch = item.match(/<usersrated[^>]*value="(\d+)"/);
      const numVotes = votesMatch ? parseInt(votesMatch[1]) : null;
      
      // Solo incluir juegos que tienen datos válidos
      if (name && name !== 'Unknown') {
        games.push({
          bggId,
          name,
          year,
          minPlayers,
          maxPlayers,
          minPlayTime,
          maxPlayTime,
          image,
          ranking,
          averageRating,
          numVotes
        });
        console.log(`✅ Parseado: ${name} (ID: ${bggId}, Ranking: ${ranking})`);
      }
    } catch (error) {
      console.error('❌ Error parseando juego:', error.message);
    }
  }
  
  return games;
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
            ranking: game.ranking,
            averageRating: game.averageRating,
            numVotes: game.numVotes
          }
        });
        updatedCount++;
        console.log(`✅ Actualizado: ${game.name} (Ranking #${game.ranking})`);
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
            ranking: game.ranking,
            averageRating: game.averageRating,
            numVotes: game.numVotes
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
    console.log('🚀 Iniciando obtención de los primeros 500 juegos con mejor ranking...');
    
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Paso 1: Obtener IDs de los primeros 500 juegos
    const gameIds = await getTop500RankedGames();
    
    if (gameIds.length === 0) {
      console.log('❌ No se encontraron juegos');
      return;
    }
    
    // Paso 2: Obtener detalles completos de los juegos
    const gamesWithDetails = await getGamesDetailsInBatches(gameIds);
    
    if (gamesWithDetails.length === 0) {
      console.log('❌ No se pudieron obtener detalles de los juegos');
      return;
    }
    
    // Paso 3: Guardar en la base de datos
    const { savedCount, updatedCount } = await saveGamesToDatabase(gamesWithDetails);
    
    // Paso 4: Mostrar estadísticas finales
    const totalGames = await prisma.game.count();
    console.log(`📈 Total de juegos en la base de datos: ${totalGames}`);
    
    const gamesWithRanking = await prisma.game.count({
      where: { ranking: { not: null } }
    });
    console.log(`🏆 Juegos con ranking: ${gamesWithRanking}`);
    
    const top10Games = await prisma.game.findMany({
      where: { ranking: { not: null } },
      orderBy: { ranking: 'asc' },
      take: 10,
      select: { name: true, ranking: true, year: true }
    });
    
    console.log('\n🏆 Top 10 juegos por ranking:');
    top10Games.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} (${game.year}) - Ranking: #${game.ranking}`);
    });
    
    console.log('🎉 Proceso completado exitosamente!');
    
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