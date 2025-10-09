const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGame() {
  try {
    console.log('🔍 Checking for game ID 8974 (Cyrano)...');
    
    const game = await prisma.game.findUnique({
      where: { id: 8974 },
      include: {
        descriptions: true,
        rules: true
      }
    });
    
    if (game) {
      console.log('✅ Game found!');
      console.log('📝 Name (EN):', game.nameEn);
      console.log('📝 Name (ES):', game.nameEs);
      console.log('📝 Name (fallback):', game.name);
      console.log('📄 Descriptions:', game.descriptions.length);
      console.log('📋 Rules:', game.rules.length);
      
      if (game.descriptions.length > 0) {
        console.log('📄 First description:', game.descriptions[0].content?.substring(0, 100) + '...');
      }
      
      if (game.rules.length > 0) {
        console.log('📋 First rule length:', game.rules[0].content?.length || 0, 'characters');
      }
    } else {
      console.log('❌ Game not found in database');
    }
    
    // Also check if there are any games with "Cyrano" in the name
    console.log('\n🔍 Searching for games with "Cyrano" in name...');
    const cyranoGames = await prisma.game.findMany({
      where: {
        OR: [
          { nameEn: { contains: 'Cyrano', mode: 'insensitive' } },
          { nameEs: { contains: 'Cyrano', mode: 'insensitive' } },
          { name: { contains: 'Cyrano', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        nameEn: true,
        nameEs: true,
        name: true
      }
    });
    
    if (cyranoGames.length > 0) {
      console.log('✅ Found Cyrano games:');
      cyranoGames.forEach(game => {
        console.log(`  - ID: ${game.id}, EN: ${game.nameEn}, ES: ${game.nameEs}, Name: ${game.name}`);
      });
    } else {
      console.log('❌ No games found with "Cyrano" in name');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkGame();
