const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMostPlayed() {
  try {
    const games = await prisma.game.findMany({
      where: { category: 'most-played' },
      select: { id: true, name: true, nameEn: true, hotnessRank: true },
      orderBy: { hotnessRank: 'asc' }
    });
    
    console.log(`📊 Total most-played games: ${games.length}\n`);
    
    games.forEach((g, i) => {
      console.log(`${i + 1}. ${g.name || g.nameEn} (ID: ${g.id}, rank: ${g.hotnessRank})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMostPlayed();

