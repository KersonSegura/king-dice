const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listAllHotness() {
  try {
    const games = await prisma.game.findMany({
      where: { category: 'hotness' },
      select: { id: true, name: true, nameEn: true, hotnessRank: true },
      orderBy: { hotnessRank: 'asc' }
    });
    
    console.log(`📊 Total hotness games: ${games.length}\n`);
    
    games.forEach((g, i) => {
      console.log(`${i + 1}. ${g.nameEn || g.name} (ID: ${g.id}, rank: ${g.hotnessRank})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllHotness();

