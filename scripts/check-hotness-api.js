const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkHotness() {
  try {
    const count = await prisma.game.count({
      where: { category: 'hotness' }
    });
    
    console.log(`📊 Hotness games count: ${count}`);
    
    const games = await prisma.game.findMany({
      where: { category: 'hotness' },
      select: { id: true, name: true, nameEn: true, hotnessRank: true },
      orderBy: { hotnessRank: 'asc' },
      take: 10
    });
    
    console.log('\n📋 First 10 games:');
    games.forEach(g => {
      console.log(`${g.hotnessRank}. ${g.name || g.nameEn} (ID: ${g.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHotness();


