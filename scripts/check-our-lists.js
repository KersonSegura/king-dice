const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOurLists() {
  try {
    // Check our hotness games
    const hotness = await prisma.game.findMany({
      where: { category: 'hotness' },
      select: { id: true, bggId: true, nameEn: true },
      orderBy: { id: 'asc' }
    });

    console.log(`🔥 Hotness games: ${hotness.length}`);
    console.log('Games:');
    hotness.forEach((game, index) => {
      console.log(`${index + 1}. ${game.nameEn} (BGG: ${game.bggId})`);
    });

    // Check our most-played games
    const mostPlayed = await prisma.game.findMany({
      where: { category: 'most-played' },
      select: { id: true, bggId: true, nameEn: true },
      orderBy: { id: 'asc' }
    });

    console.log(`\n🎮 Most-played games: ${mostPlayed.length}`);
    console.log('Games:');
    mostPlayed.forEach((game, index) => {
      console.log(`${index + 1}. ${game.nameEn} (BGG: ${game.bggId})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOurLists();


