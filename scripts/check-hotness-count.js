const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHotness() {
  try {
    const games = await prisma.game.findMany({
      where: { category: 'hotness' },
      select: { id: true, nameEn: true },
      orderBy: { id: 'asc' }
    });

    console.log(`📊 Total hotness games: ${games.length}\n`);
    
    games.forEach((game, i) => {
      console.log(`${i + 1}. ${game.nameEn} (ID: ${game.id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHotness();


