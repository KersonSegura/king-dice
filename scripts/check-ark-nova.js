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
 * Verificar el ranking de Ark Nova
 */
async function checkArkNova() {
  console.log('🔍 Verificando el ranking de Ark Nova...');
  
  const arkNovaId = 342942;
  const url = `${BGG_API_BASE_URL}/thing?id=${arkNovaId}&stats=1`;
  
  try {
    console.log(`🔗 URL: ${url}`);
    const response = await makeRequestWithRetry(url);
    
    // Buscar todos los rankings de Ark Nova
    const rankMatches = response.match(/<rank[^>]*value="(\d+)"[^>]*>/g);
    if (rankMatches) {
      console.log(`📊 Encontrados ${rankMatches.length} rankings para Ark Nova:`);
      rankMatches.forEach((match, index) => {
        const valueMatch = match.match(/value="(\d+)"/);
        const bayesMatch = match.match(/bayesaverage="([^"]+)"/);
        const typeMatch = match.match(/type="([^"]+)"/);
        
        if (valueMatch) {
          const rank = valueMatch[1];
          const bayes = bayesMatch ? bayesMatch[1] : 'N/A';
          const type = typeMatch ? typeMatch[1] : 'N/A';
          console.log(`  Ranking ${index + 1}: #${rank} (Bayes: ${bayes}, Type: ${type})`);
        }
      });
    }
    
    // Buscar el nombre
    const nameMatch = response.match(/<name[^>]*value="([^"]+)"/);
    if (nameMatch) {
      console.log(`📝 Nombre: ${nameMatch[1]}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Verificar el ranking en la base de datos
 */
async function checkDatabaseRanking() {
  console.log('\n📊 Verificando ranking en la base de datos...');
  
  const arkNova = await prisma.game.findUnique({
    where: { bggId: 342942 }
  });
  
  if (arkNova) {
    console.log(`✅ Encontrado en la base de datos:`);
    console.log(`   Nombre: ${arkNova.name}`);
    console.log(`   Ranking: ${arkNova.ranking}`);
    console.log(`   BGG ID: ${arkNova.bggId}`);
    console.log(`   Año: ${arkNova.year}`);
    console.log(`   Rating promedio: ${arkNova.averageRating}`);
    console.log(`   Número de votos: ${arkNova.numVotes}`);
  } else {
    console.log('❌ No encontrado en la base de datos');
  }
}

/**
 * Verificar todos los rankings del 1 al 10
 */
async function checkAllRankings() {
  console.log('\n📊 Verificando todos los rankings del 1 al 10...');
  
  const rankings = await prisma.game.findMany({
    where: { 
      ranking: { not: null },
      ranking: { gte: 1, lte: 10 }
    },
    orderBy: { ranking: 'asc' },
    select: { name: true, ranking: true, bggId: true }
  });
  
  console.log('Rankings actuales en la base de datos:');
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
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando verificación de Ark Nova...');
    
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Verificar el ranking de Ark Nova en BGG
    await checkArkNova();
    
    // Verificar el ranking en la base de datos
    await checkDatabaseRanking();
    
    // Verificar todos los rankings
    await checkAllRankings();
    
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