const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  try {
    console.log('🔍 Checking database status...\n');
    
    // Count total games
    const totalGames = await prisma.game.count();
    console.log(`🎯 Total Games in Database: ${totalGames}\n`);
    
    // Check descriptions
    const gamesWithDescriptions = await prisma.gameDescription.count();
    const descriptionPercentage = Math.round((gamesWithDescriptions / totalGames) * 100);
    console.log(`📝 Games with Descriptions: ${gamesWithDescriptions}/${totalGames} (${descriptionPercentage}%)`);
    
    // Check rules
    const gamesWithRules = await prisma.gameRule.count();
    const rulesPercentage = Math.round((gamesWithRules / totalGames) * 100);
    console.log(`📚 Games with Rules: ${gamesWithRules}/${totalGames} (${rulesPercentage}%)`);
    
    // Check categories
    const gamesWithCategories = await prisma.gameCategory.count();
    const categoriesPercentage = Math.round((gamesWithCategories / totalGames) * 100);
    console.log(`🏷️ Games with Categories: ${gamesWithCategories}/${totalGames} (${categoriesPercentage}%)`);
    
    // Check mechanics
    const gamesWithMechanics = await prisma.gameMechanic.count();
    const mechanicsPercentage = Math.round((gamesWithMechanics / totalGames) * 100);
    console.log(`⚙️ Games with Mechanics: ${gamesWithMechanics}/${totalGames} (${mechanicsPercentage}%)`);
    
    // Check images
    const gamesWithImages = await prisma.game.count({
      where: { thumbnailUrl: { not: null } }
    });
    const imagesPercentage = Math.round((gamesWithImages / totalGames) * 100);
    console.log(`🖼️ Games with Images: ${gamesWithImages}/${totalGames} (${imagesPercentage}%)`);
    
    // Check designer
    const gamesWithDesigner = await prisma.game.count({
      where: { designer: { not: null } }
    });
    const designerPercentage = Math.round((gamesWithDesigner / totalGames) * 100);
    console.log(`👨‍🎨 Games with Designer: ${gamesWithDesigner}/${totalGames} (${designerPercentage}%)`);
    
    // Check developer
    const gamesWithDeveloper = await prisma.game.count({
      where: { developer: { not: null } }
    });
    const developerPercentage = Math.round((gamesWithDeveloper / totalGames) * 100);
    console.log(`🏢 Games with Developer: ${gamesWithDeveloper}/${totalGames} (${developerPercentage}%)`);
    
    // Check year
    const gamesWithYear = await prisma.game.count({
      where: { yearRelease: { not: null } }
    });
    const yearPercentage = Math.round((gamesWithYear / totalGames) * 100);
    console.log(`📅 Games with Year: ${gamesWithYear}/${totalGames} (${yearPercentage}%)`);
    
    // Check player count
    const gamesWithPlayers = await prisma.game.count({
      where: {
        AND: [
          { minPlayers: { not: null } },
          { maxPlayers: { not: null } }
        ]
      }
    });
    const playersPercentage = Math.round((gamesWithPlayers / totalGames) * 100);
    console.log(`👥 Games with Player Count: ${gamesWithPlayers}/${totalGames} (${playersPercentage}%)`);
    
    // Check duration
    const gamesWithDuration = await prisma.game.count({
      where: { durationMinutes: { not: null } }
    });
    const durationPercentage = Math.round((gamesWithDuration / totalGames) * 100);
    console.log(`⏱️ Games with Duration: ${gamesWithDuration}/${totalGames} (${durationPercentage}%)`);
    
    console.log('\n📊 SUMMARY:');
    console.log('===========');
    
    if (descriptionPercentage >= 90) console.log('✅ Descriptions: EXCELLENT');
    else if (descriptionPercentage >= 70) console.log('⚠️ Descriptions: GOOD');
    else console.log('❌ Descriptions: NEEDS WORK');
    
    if (rulesPercentage >= 90) console.log('✅ Rules: EXCELLENT');
    else if (rulesPercentage >= 50) console.log('⚠️ Rules: PARTIAL');
    else console.log('❌ Rules: MISSING - This is our main focus!');
    
    if (categoriesPercentage >= 90) console.log('✅ Categories: EXCELLENT');
    else if (categoriesPercentage >= 70) console.log('⚠️ Categories: GOOD');
    else console.log('❌ Categories: NEEDS WORK');
    
    if (mechanicsPercentage >= 90) console.log('✅ Mechanics: EXCELLENT');
    else if (mechanicsPercentage >= 70) console.log('⚠️ Mechanics: GOOD');
    else console.log('❌ Mechanics: NEEDS WORK');
    
    if (imagesPercentage >= 90) console.log('✅ Images: EXCELLENT');
    else if (imagesPercentage >= 70) console.log('⚠️ Images: GOOD');
    else console.log('❌ Images: NEEDS WORK');
    
    if (designerPercentage >= 90) console.log('✅ Designer: EXCELLENT');
    else if (designerPercentage >= 70) console.log('⚠️ Designer: GOOD');
    else console.log('❌ Designer: NEEDS WORK');
    
    if (developerPercentage >= 90) console.log('✅ Developer: EXCELLENT');
    else if (developerPercentage >= 70) console.log('⚠️ Developer: GOOD');
    else console.log('❌ Developer: NEEDS WORK');
    
    if (yearPercentage >= 90) console.log('✅ Year: EXCELLENT');
    else if (yearPercentage >= 70) console.log('⚠️ Year: GOOD');
    else console.log('❌ Year: NEEDS WORK');
    
    if (playersPercentage >= 90) console.log('✅ Player Count: EXCELLENT');
    else if (playersPercentage >= 70) console.log('⚠️ Player Count: GOOD');
    else console.log('❌ Player Count: NEEDS WORK');
    
    if (durationPercentage >= 90) console.log('✅ Duration: EXCELLENT');
    else if (durationPercentage >= 70) console.log('⚠️ Duration: GOOD');
    else console.log('❌ Duration: NEEDS WORK');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('==============');
    
    if (rulesPercentage < 50) {
      console.log('🚨 PRIORITY 1: Collect game rules - This is our main value proposition!');
      console.log('   - Use Ultra BoardGames scraper');
      console.log('   - Scrape official publisher websites');
      console.log('   - Use AI to generate rules for missing games');
    }
    
    if (mechanicsPercentage < 70) {
      console.log('🔧 PRIORITY 2: Add missing game mechanics');
    }
    
    if (categoriesPercentage < 70) {
      console.log('🏷️ PRIORITY 3: Improve game categorization');
    }
    
    if (imagesPercentage < 70) {
      console.log('🖼️ PRIORITY 4: Add missing game images');
    }
    
  } catch (error) {
    console.error('❌ Error checking database status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();
