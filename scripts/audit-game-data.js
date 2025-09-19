const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function auditGameData() {
  try {
    console.log('🔍 Auditing game data completeness...\n');
    
    const games = await prisma.game.findMany({
      include: {
        descriptions: true,
        gameCategories: {
          include: {
            category: true
          }
        },
        gameMechanics: {
          include: {
            mechanic: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`📊 Total games: ${games.length}\n`);
    
    // Track missing data
    let missingDesigner = 0;
    let missingDeveloper = 0;
    let missingDuration = 0;
    let missingCategories = 0;
    let missingMechanics = 0;
    let missingDescriptions = 0;
    let missingThumbnail = 0;
    
    games.forEach((game, index) => {
      console.log(`${index + 1}. ${game.nameEn}`);
      
      // Check Designer
      if (!game.designer || game.designer === 'Unknown') {
        missingDesigner++;
        console.log(`   ❌ Designer: Missing`);
      } else {
        console.log(`   ✅ Designer: ${game.designer}`);
      }
      
      // Check Developer
      if (!game.developer || game.developer === 'Unknown') {
        missingDeveloper++;
        console.log(`   ❌ Developer: Missing`);
      } else {
        console.log(`   ✅ Developer: ${game.developer}`);
      }
      
      // Check Duration
      if (!game.durationMinutes) {
        missingDuration++;
        console.log(`   ❌ Duration: Missing`);
      } else {
        console.log(`   ✅ Duration: ${game.durationMinutes} min`);
      }
      
      // Check Thumbnail
      if (!game.thumbnailUrl) {
        missingThumbnail++;
        console.log(`   ❌ Thumbnail: Missing`);
      } else {
        console.log(`   ✅ Thumbnail: ${game.thumbnailUrl.substring(0, 50)}...`);
      }
      
      // Check Categories
      if (!game.gameCategories || game.gameCategories.length === 0) {
        missingCategories++;
        console.log(`   ❌ Categories: Missing`);
      } else {
        const categoryNames = game.gameCategories.map(gc => gc.category.nameEn).join(', ');
        console.log(`   ✅ Categories: ${categoryNames}`);
      }
      
      // Check Mechanics
      if (!game.gameMechanics || game.gameMechanics.length === 0) {
        missingMechanics++;
        console.log(`   ❌ Mechanics: Missing`);
      } else {
        const mechanicNames = game.gameMechanics.map(gm => gm.mechanic.nameEn).join(', ');
        console.log(`   ✅ Mechanics: ${mechanicNames}`);
      }
      
      // Check Descriptions
      if (!game.descriptions || game.descriptions.length === 0) {
        missingDescriptions++;
        console.log(`   ❌ Descriptions: Missing`);
      } else {
        const descCount = game.descriptions.length;
        const languages = game.descriptions.map(d => d.language).join(', ');
        console.log(`   ✅ Descriptions: ${descCount} (${languages})`);
      }
      
      console.log(''); // Empty line for readability
    });
    
    // Summary
    console.log('🎯 DATA COMPLETENESS SUMMARY:');
    console.log('================================');
    console.log(`✅ Games with Designer: ${games.length - missingDesigner}/${games.length}`);
    console.log(`✅ Games with Developer: ${games.length - missingDeveloper}/${games.length}`);
    console.log(`✅ Games with Duration: ${games.length - missingDuration}/${games.length}`);
    console.log(`✅ Games with Thumbnail: ${games.length - missingThumbnail}/${games.length}`);
    console.log(`✅ Games with Categories: ${games.length - missingCategories}/${games.length}`);
    console.log(`✅ Games with Mechanics: ${games.length - missingMechanics}/${games.length}`);
    console.log(`✅ Games with Descriptions: ${games.length - missingDescriptions}/${games.length}`);
    
    console.log('\n🎯 PRIORITY MISSING DATA:');
    if (missingDesigner > 0) console.log(`   🔴 Designer: ${missingDesigner} games missing`);
    if (missingDeveloper > 0) console.log(`   🔴 Developer: ${missingDeveloper} games missing`);
    if (missingCategories > 0) console.log(`   🟡 Categories: ${missingCategories} games missing`);
    if (missingMechanics > 0) console.log(`   🟡 Mechanics: ${missingMechanics} games missing`);
    if (missingDuration > 0) console.log(`   🟡 Duration: ${missingDuration} games missing`);
    if (missingThumbnail > 0) console.log(`   🟡 Thumbnail: ${missingThumbnail} games missing`);
    
  } catch (error) {
    console.error('Error auditing game data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditGameData();
