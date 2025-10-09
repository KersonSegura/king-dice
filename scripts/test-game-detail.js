const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testGameDetail() {
  try {
    // Get a sample game to test
    const game = await prisma.game.findFirst({
      where: { nameEn: 'Cyrano' },
      include: {
        gameCategories: {
          include: {
            category: true
          }
        },
        gameMechanics: {
          include: {
            mechanic: true
          }
        },
        descriptions: true,
        rules: true,
        baseGameExpansions: true,
      }
    });

    if (!game) {
      console.log('❌ Game not found');
      return;
    }

    console.log('\n✅ Game found!\n');
    console.log('📊 Game Details:');
    console.log(`   • ID: ${game.id}`);
    console.log(`   • Name (EN): ${game.nameEn}`);
    console.log(`   • Name (ES): ${game.nameEs}`);
    console.log(`   • Image URL: ${game.imageUrl || 'None'}`);
    console.log(`   • Thumbnail URL: ${game.thumbnailUrl || 'None'}`);
    console.log(`\n📝 Descriptions: ${game.descriptions.length}`);
    game.descriptions.forEach(desc => {
      console.log(`   • Language: ${desc.language}`);
      console.log(`   • Full Description: ${desc.fullDescription ? 'Yes (' + desc.fullDescription.length + ' chars)' : 'No'}`);
    });
    
    console.log(`\n📜 Rules: ${game.rules.length}`);
    game.rules.forEach(rule => {
      console.log(`   • Language: ${rule.language}`);
      console.log(`   • Rules Text: ${rule.rulesText ? 'Yes (' + rule.rulesText.length + ' chars)' : 'No'}`);
    });
    
    console.log(`\n📋 Categories: ${game.gameCategories.length}`);
    game.gameCategories.forEach(gc => {
      console.log(`   • ${gc.category.nameEn}`);
    });
    
    console.log(`\n⚙️  Mechanics: ${game.gameMechanics.length}`);
    game.gameMechanics.forEach(gm => {
      console.log(`   • ${gm.mechanic.nameEn}`);
    });

    console.log(`\n🌐 URL to test: https://kingdice.gg/game/${game.id}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testGameDetail();


