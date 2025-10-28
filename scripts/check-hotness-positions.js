const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPositions() {
  try {
    const games = await prisma.game.findMany({
      where: { category: 'hotness' },
      select: { id: true, name: true, nameEn: true, hotnessRank: true },
      orderBy: { hotnessRank: 'asc' }
    });
    
    console.log(`📊 Total hotness games: ${games.length}\n`);
    
    // Show positions 28-32 to verify ANTS
    games.slice(27, 32).forEach(g => {
      console.log(`${g.hotnessRank}. ${g.name || g.nameEn} (ID: ${g.id})`);
    });
    
    console.log('\n---\n');
    
    // Show positions 36-40 to verify Nature
    games.slice(35, 40).forEach(g => {
      console.log(`${g.hotnessRank}. ${g.name || g.nameEn} (ID: ${g.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPositions();

