const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExistingGames() {
  try {
    console.log('🔍 Checking existing games in database...\n');
    
    const games = await prisma.game.findMany({
      take: 10,
      select: {
        id: true,
        nameEn: true,
        bggId: true
      }
    });
    
    console.log('📋 Existing games:');
    games.forEach((game, index) => {
      console.log(`${index + 1}. ID: ${game.id}, BGG ID: ${game.bggId}, Name: ${game.nameEn}`);
    });
    
    console.log(`\n📊 Total games in database: ${await prisma.game.count()}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingGames();
