const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testGame() {
  try {
    console.log('🔍 Testing game ID 8816...\n');
    
    const game = await prisma.game.findUnique({
      where: { id: 8816 },
      include: {
        descriptions: true,
        rules: true,
      }
    });
    
    if (game) {
      console.log('✅ GAME FOUND!');
      console.log('Name EN:', game.nameEn);
      console.log('Name ES:', game.nameEs);
      console.log('Year:', game.yearRelease);
      console.log('Has descriptions:', game.descriptions?.length || 0);
      console.log('Has rules:', game.rules?.length || 0);
    } else {
      console.log('❌ GAME NOT FOUND IN DATABASE');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGame();

