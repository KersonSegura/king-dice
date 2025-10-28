const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixHtmlEntities() {
  try {
    console.log('🔍 Finding games with HTML entities in names...\n');
    
    // Find all games
    const games = await prisma.game.findMany({
      select: {
        id: true,
        nameEn: true,
        nameEs: true,
        designer: true,
        developer: true
      }
    });

    let fixedCount = 0;

    for (const game of games) {
      let needsUpdate = false;
      const updateData = {};

      // Check and fix nameEn
      if (game.nameEn && game.nameEn.includes('&#039;')) {
        updateData.nameEn = game.nameEn.replace(/&#039;/g, "'");
        needsUpdate = true;
        console.log(`   Fixing nameEn: "${game.nameEn}" → "${updateData.nameEn}"`);
      }

      // Check and fix nameEs
      if (game.nameEs && game.nameEs.includes('&#039;')) {
        updateData.nameEs = game.nameEs.replace(/&#039;/g, "'");
        needsUpdate = true;
        console.log(`   Fixing nameEs: "${game.nameEs}" → "${updateData.nameEs}"`);
      }

      // Check and fix designer
      if (game.designer && game.designer.includes('&#039;')) {
        updateData.designer = game.designer.replace(/&#039;/g, "'");
        needsUpdate = true;
        console.log(`   Fixing designer: "${game.designer}" → "${updateData.designer}"`);
      }

      // Check and fix developer
      if (game.developer && game.developer.includes('&#039;')) {
        updateData.developer = game.developer.replace(/&#039;/g, "'");
        needsUpdate = true;
        console.log(`   Fixing developer: "${game.developer}" → "${updateData.developer}"`);
      }

      if (needsUpdate) {
        await prisma.game.update({
          where: { id: game.id },
          data: updateData
        });

        console.log(`✅ Fixed game ID: ${game.id}`);
        fixedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully fixed ${fixedCount} games`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHtmlEntities();

