const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

const BGG_API_BASE_URL = 'https://boardgamegeek.com/xmlapi2';

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
 * Buscar el juego con ranking #2 usando IDs conocidos
 */
async function findRanking2() {
  console.log('🔍 Buscando el juego con ranking #2...');
  
  // IDs de juegos populares conocidos (top 100 de BGG)
  const popularGameIds = [
    224517, 342942, 167791, 266192, 244521, 199792, 68448, 237182, 13, 167791,
    224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942,
    266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942, 266192, 244521,
    199792, 68448, 237182, 167791, 224517, 342942, 266192, 244521, 199792, 68448,
    237182, 167791, 224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791,
    224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942,
    266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942, 266192, 244521,
    199792, 68448, 237182, 167791, 224517, 342942, 266192, 244521, 199792, 68448,
    237182, 167791, 224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791,
    224517, 342942, 266192, 244521, 199792, 68448, 237182, 167791, 224517, 342942
  ];
  
  // Eliminar duplicados
  const uniqueIds = [...new Set(popularGameIds)];
  
  console.log(`🔍 Probando ${uniqueIds.length} IDs únicos...`);
  
  // Procesar en lotes de 10
  for (let i = 0; i < uniqueIds.length; i += 10) {
    const batch = uniqueIds.slice(i, i + 10);
    const batchNumber = Math.floor(i / 10) + 1;
    
    console.log(`🔄 Procesando lote ${batchNumber}...`);
    
    try {
      const idsParam = batch.join(',');
      const url = `${BGG_API_BASE_URL}/thing?id=${idsParam}&stats=1`;
      const response = await makeRequestWithRetry(url);
      
      // Buscar juegos con ranking #2
      const rank2Matches = response.match(/<rank[^>]*value="2"[^>]*>/g);
      if (rank2Matches) {
        console.log(`✅ Encontrados ${rank2Matches.length} juegos con ranking #2 en el lote ${batchNumber}`);
        
        // Parsear el XML para obtener detalles
        const itemMatches = response.match(/<item[^>]*>[\s\S]*?<\/item>/g);
        if (itemMatches) {
          for (const item of itemMatches) {
            const idMatch = item.match(/id="(\d+)"/);
            const nameMatch = item.match(/<name[^>]*value="([^"]+)"/);
            const rankMatch = item.match(/<rank[^>]*value="2"[^>]*>/);
            
            if (idMatch && nameMatch && rankMatch) {
              const bggId = parseInt(idMatch[1]);
              const name = nameMatch[1];
              console.log(`🎯 ¡ENCONTRADO! Juego con ranking #2: ${name} (ID: ${bggId})`);
              return { bggId, name };
            }
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error procesando lote ${batchNumber}:`, error.message);
    }
  }
  
  console.log('❌ No se encontró el juego con ranking #2 en los IDs probados');
  return null;
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando búsqueda del juego con ranking #2...');
    
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Buscar el juego con ranking #2
    const ranking2Game = await findRanking2();
    
    if (ranking2Game) {
      console.log(`\n🎯 RESULTADO:`);
      console.log(`Juego con ranking #2: ${ranking2Game.name} (ID: ${ranking2Game.bggId})`);
      
      // Verificar si ya está en la base de datos
      const existingGame = await prisma.game.findUnique({
        where: { bggId: ranking2Game.bggId }
      });
      
      if (existingGame) {
        console.log(`✅ Ya existe en la base de datos`);
      } else {
        console.log(`❌ No está en la base de datos`);
      }
    }
    
    // Mostrar estadísticas de rankings en la base de datos
    const rankings = await prisma.game.findMany({
      where: { 
        ranking: { not: null },
        ranking: { gte: 1, lte: 10 }
      },
      orderBy: { ranking: 'asc' },
      select: { name: true, ranking: true, bggId: true }
    });
    
    console.log('\n📊 Rankings del 1 al 10 en la base de datos:');
    rankings.forEach(game => {
      console.log(`#${game.ranking}: ${game.name} (ID: ${game.bggId})`);
    });
    
    // Mostrar qué rankings faltan
    const existingRankings = rankings.map(g => g.ranking);
    const missingRankings = [];
    for (let i = 1; i <= 10; i++) {
      if (!existingRankings.includes(i)) {
        missingRankings.push(i);
      }
    }
    
    if (missingRankings.length > 0) {
      console.log(`\n❌ Rankings faltantes: ${missingRankings.join(', ')}`);
    } else {
      console.log(`\n✅ Todos los rankings del 1 al 10 están presentes`);
    }
    
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