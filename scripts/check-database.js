const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const games = await prisma.game.findMany({
      select: {
        nameEn: true,
        yearRelease: true,
        minPlayers: true,
        maxPlayers: true,
        designer: true,
        developer: true
      }
    });
    
    console.log(`Games collected so far: ${games.length}`);
    console.log('---');
    
    games.forEach(game => {
      console.log(`- ${game.nameEn} (${game.yearRelease}) ${game.minPlayers}-${game.maxPlayers} players, Designer: ${game.designer || 'Unknown'}, Developer: ${game.developer || 'Unknown'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 