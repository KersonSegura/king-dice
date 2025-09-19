const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 Verificando datos en la base de datos...');
  
  try {
    await prisma.$connect();
    console.log('✅ Conexión establecida');
    
    // Estadísticas generales
    const totalGames = await prisma.game.count();
    console.log(`📊 Total de juegos: ${totalGames}`);
    
    const gamesWithRanking = await prisma.game.count({
      where: { ranking: { not: null } }
    });
    console.log(`🏆 Juegos con ranking: ${gamesWithRanking}`);
    
    const gamesWithImage = await prisma.game.count({
      where: { image: { not: null } }
    });
    console.log(`🖼️ Juegos con imagen: ${gamesWithImage}`);
    
    const gamesWithYear = await prisma.game.count({
      where: { year: { not: null } }
    });
    console.log(`📅 Juegos con año: ${gamesWithYear}`);
    
    const gamesWithPlayers = await prisma.game.count({
      where: { 
        AND: [
          { minPlayers: { not: null } },
          { maxPlayers: { not: null } }
        ]
      }
    });
    console.log(`👥 Juegos con información de jugadores: ${gamesWithPlayers}`);
    
    // Top 10 juegos por ranking
    console.log('\n🏆 Top 10 juegos por ranking:');
    const topGames = await prisma.game.findMany({
      where: { ranking: { not: null } },
      orderBy: { ranking: 'asc' },
      take: 10,
      select: {
        id: true,
        bggId: true,
        name: true,
        year: true,
        ranking: true,
        image: true
      }
    });
    
    topGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} (${game.year || 'N/A'}) - Ranking: #${game.ranking} - BGG ID: ${game.bggId}`);
    });
    
    // Juegos más recientes
    console.log('\n🆕 Juegos más recientes:');
    const recentGames = await prisma.game.findMany({
      where: { year: { not: null } },
      orderBy: { year: 'desc' },
      take: 10,
      select: {
        id: true,
        bggId: true,
        name: true,
        year: true,
        ranking: true
      }
    });
    
    recentGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.name} (${game.year}) - Ranking: ${game.ranking ? `#${game.ranking}` : 'N/A'} - BGG ID: ${game.bggId}`);
    });
    
    // Juegos sin imagen
    const gamesWithoutImage = await prisma.game.count({
      where: { image: null }
    });
    console.log(`\n❌ Juegos sin imagen: ${gamesWithoutImage}`);
    
    // Juegos sin año
    const gamesWithoutYear = await prisma.game.count({
      where: { year: null }
    });
    console.log(`❌ Juegos sin año: ${gamesWithoutYear}`);
    
    // Juegos sin información de jugadores
    const gamesWithoutPlayers = await prisma.game.count({
      where: { 
        OR: [
          { minPlayers: null },
          { maxPlayers: null }
        ]
      }
    });
    console.log(`❌ Juegos sin información de jugadores: ${gamesWithoutPlayers}`);
    
    // Verificar duplicados
    const duplicateBggIds = await prisma.$queryRaw`
      SELECT "bggId", COUNT(*) as count
      FROM games
      GROUP BY "bggId"
      HAVING COUNT(*) > 1
    `;
    
    if (duplicateBggIds.length > 0) {
      console.log('\n⚠️ ADVERTENCIA: Se encontraron BGG IDs duplicados:');
      duplicateBggIds.forEach(dup => {
        console.log(`  - BGG ID ${dup.bggId}: ${dup.count} veces`);
      });
    } else {
      console.log('\n✅ No se encontraron BGG IDs duplicados');
    }
    
  } catch (error) {
    console.error('❌ Error verificando datos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  verifyData()
    .then(() => {
      console.log('\n✅ Verificación completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en la verificación:', error);
      process.exit(1);
    });
}

module.exports = { verifyData }; 