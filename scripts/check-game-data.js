const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGame() {
  try {
    const game = await prisma.game.findUnique({
      where: { id: 10730 },
      select: { id: true, nameEn: true, name: true, nameEs: true }
    });
    
    console.log('Game 10730:', game);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGame();


