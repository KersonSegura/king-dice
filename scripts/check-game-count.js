const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGameCount() {
  try {
    const count = await prisma.game.count();
    console.log(`\n📊 Total games in database: ${count}\n`);
    
    // Get a sample game to verify
    const sampleGame = await prisma.game.findFirst({
      orderBy: { id: 'desc' }
    });
    
    if (sampleGame) {
      console.log('🎮 Most recent game:');
      console.log(`   • ID: ${sampleGame.id}`);
      console.log(`   • Name: ${sampleGame.nameEn}`);
      console.log(`   • Created: ${sampleGame.createdAt}\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGameCount();


