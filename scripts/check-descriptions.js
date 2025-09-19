const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDescriptions() {
  try {
    console.log('Checking which games have descriptions...\n');
    
    const games = await prisma.game.findMany({
      include: {
        descriptions: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    let gamesWithDescriptions = 0;
    let gamesWithoutDescriptions = 0;
    
    games.forEach((game, index) => {
      const hasDescription = game.descriptions && game.descriptions.length > 0;
      const descCount = hasDescription ? game.descriptions.length : 0;
      
      if (hasDescription) {
        gamesWithDescriptions++;
        console.log(`${index + 1}. ✅ ${game.nameEn} - ${descCount} description(s)`);
      } else {
        gamesWithoutDescriptions++;
        console.log(`${index + 1}. ❌ ${game.nameEn} - No description`);
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Games with descriptions: ${gamesWithDescriptions}`);
    console.log(`❌ Games without descriptions: ${gamesWithoutDescriptions}`);
    console.log(`📊 Total games: ${games.length}`);
    
    if (gamesWithoutDescriptions > 0) {
      console.log(`\n🎯 Games that need descriptions: ${gamesWithoutDescriptions}`);
    }
    
  } catch (error) {
    console.error('Error checking descriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDescriptions();
