const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixRankings() {
  console.log('🚀 Arreglando rankings duplicados...');
  
  try {
    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos establecida');
    
    // Obtener todos los juegos con ranking, ordenados por ranking real
    const gamesWithRanking = await prisma.$queryRaw`
      SELECT id, "bggId", name, ranking, "averageRating", "numVotes"
      FROM games 
      WHERE ranking IS NOT NULL 
      ORDER BY ranking ASC, "averageRating" DESC, "numVotes" DESC
    `;
    
    console.log(`📊 Encontrados ${gamesWithRanking.length} juegos con ranking`);
    
    // Asignar rankings únicos secuenciales
    let updatedCount = 0;
    for (let i = 0; i < gamesWithRanking.length; i++) {
      const game = gamesWithRanking[i];
      const newRanking = i + 1;
      
      try {
        await prisma.$executeRaw`
          UPDATE games 
          SET ranking = ${newRanking}
          WHERE id = ${game.id}
        `;
        
        console.log(`✅ ${game.name}: Ranking #${game.ranking} → #${newRanking}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error actualizando ${game.name}:`, error.message);
      }
    }
    
    console.log(`📈 Rankings arreglados: ${updatedCount} juegos actualizados`);
    
    // Mostrar los nuevos top 10
    const newTop10 = await prisma.$queryRaw`
      SELECT name, ranking, "averageRating", "numVotes"
      FROM games 
      WHERE ranking IS NOT NULL 
      ORDER BY ranking ASC 
      LIMIT 10
    `;
    
    console.log('\n🏆 Nuevos Top 10 juegos por ranking:');
    newTop10.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} - Ranking: #${game.ranking} (Rating: ${game.averageRating?.toFixed(2) || 'N/A'})`);
    });
    
  } catch (error) {
    console.error('❌ Error arreglando rankings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixRankings()
    .then(() => {
      console.log('✅ Rankings arreglados exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { fixRankings }; 