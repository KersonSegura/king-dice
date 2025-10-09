const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importGamesToProduction() {
  try {
    console.log('📂 Reading export file...\n');

    const exportPath = path.join(__dirname, 'games-export.json');
    
    if (!fs.existsSync(exportPath)) {
      console.error('❌ Export file not found! Please run export-all-games.js first.');
      process.exit(1);
    }

    const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

    console.log(`✅ Loaded export from ${exportData.exportDate}`);
    console.log(`📊 Games to import: ${exportData.totalGames}`);
    console.log(`📋 Categories: ${exportData.totalCategories}`);
    console.log(`⚙️  Mechanics: ${exportData.totalMechanics}\n`);

    console.log('⚠️  WARNING: This will DELETE all existing games in the production database!');
    console.log('⚠️  Make sure you are connected to the PRODUCTION database.\n');
    
    // Simple confirmation - in production you might want to require manual confirmation
    console.log('Starting import in 3 seconds... (Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  Deleting all existing games...\n');

    // Delete all existing data in the correct order (respecting foreign keys)
    await prisma.$transaction(async (tx) => {
      console.log('  Deleting game categories...');
      await tx.gameCategory.deleteMany({});
      
      console.log('  Deleting game mechanics...');
      await tx.gameMechanic.deleteMany({});
      
      console.log('  Deleting expansions...');
      await tx.expansion.deleteMany({});
      
      console.log('  Deleting game descriptions...');
      await tx.gameDescription.deleteMany({});
      
      console.log('  Deleting game rules...');
      await tx.gameRule.deleteMany({});
      
      console.log('  Deleting games...');
      await tx.game.deleteMany({});
      
      console.log('  Deleting categories...');
      await tx.category.deleteMany({});
      
      console.log('  Deleting mechanics...');
      await tx.mechanic.deleteMany({});
    });

    console.log('✅ Old data deleted\n');

    console.log('📥 Importing categories and mechanics...\n');

    // Create maps to track created categories and mechanics
    const categoryMap = new Map();
    const mechanicMap = new Map();

    // Import categories
    for (const category of exportData.categories) {
      const created = await prisma.category.create({
        data: {
          nameEn: category.nameEn,
          nameEs: category.nameEs,
          descriptionEn: category.descriptionEn,
          descriptionEs: category.descriptionEs,
        }
      });
      categoryMap.set(category.nameEn, created.id);
    }

    // Import mechanics
    for (const mechanic of exportData.mechanics) {
      const created = await prisma.mechanic.create({
        data: {
          nameEn: mechanic.nameEn,
          nameEs: mechanic.nameEs,
          descriptionEn: mechanic.descriptionEn,
          descriptionEs: mechanic.descriptionEs,
        }
      });
      mechanicMap.set(mechanic.nameEn, created.id);
    }

    console.log(`✅ Imported ${categoryMap.size} categories`);
    console.log(`✅ Imported ${mechanicMap.size} mechanics\n`);

    console.log('📥 Importing games...\n');

    let importedCount = 0;
    let errorCount = 0;

    for (const gameData of exportData.games) {
      try {
        await prisma.$transaction(async (tx) => {
          // Create the game
          const game = await tx.game.create({
            data: {
              bggId: gameData.bggId,
              nameEn: gameData.nameEn,
              nameEs: gameData.nameEs,
              yearRelease: gameData.yearRelease,
              designer: gameData.designer,
              developer: gameData.developer,
              minPlayers: gameData.minPlayers,
              maxPlayers: gameData.maxPlayers,
              durationMinutes: gameData.durationMinutes,
              imageUrl: gameData.imageUrl,
              thumbnailUrl: gameData.thumbnailUrl,
              name: gameData.name,
              year: gameData.year,
              minPlayTime: gameData.minPlayTime,
              maxPlayTime: gameData.maxPlayTime,
              image: gameData.image,
              expansions: gameData.expansions,
              category: gameData.category,
              userRating: gameData.userRating,
              userVotes: gameData.userVotes,
            }
          });

          // Create descriptions
          for (const desc of gameData.descriptions) {
            await tx.gameDescription.create({
              data: {
                gameId: game.id,
                language: desc.language,
                shortDescription: desc.shortDescription,
                fullDescription: desc.fullDescription,
              }
            });
          }

          // Create rules
          for (const rule of gameData.rules) {
            await tx.gameRule.create({
              data: {
                gameId: game.id,
                language: rule.language,
                rulesText: rule.rulesText,
                rulesHtml: rule.rulesHtml,
                setupInstructions: rule.setupInstructions,
                victoryConditions: rule.victoryConditions,
              }
            });
          }

          // Link categories
          for (const cat of gameData.categories) {
            const categoryId = categoryMap.get(cat.nameEn);
            if (categoryId) {
              await tx.gameCategory.create({
                data: {
                  gameId: game.id,
                  categoryId: categoryId,
                }
              });
            }
          }

          // Link mechanics
          for (const mech of gameData.mechanics) {
            const mechanicId = mechanicMap.get(mech.nameEn);
            if (mechanicId) {
              await tx.gameMechanic.create({
                data: {
                  gameId: game.id,
                  mechanicId: mechanicId,
                }
              });
            }
          }

          // Create expansions
          for (const expansion of gameData.expansionsList) {
            await tx.expansion.create({
              data: {
                baseGameId: game.id,
                expansionNameEn: expansion.expansionNameEn,
                expansionNameEs: expansion.expansionNameEs,
                yearRelease: expansion.yearRelease,
                descriptionEn: expansion.descriptionEn,
                descriptionEs: expansion.descriptionEs,
                imageUrl: expansion.imageUrl,
                bggId: expansion.bggId,
              }
            });
          }
        });

        importedCount++;
        if (importedCount % 50 === 0) {
          console.log(`  ✅ Imported ${importedCount}/${exportData.totalGames} games...`);
        }

      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error importing game "${gameData.nameEn}":`, error.message);
      }
    }

    console.log('\n✨ Import completed!\n');
    console.log('📊 Final Summary:');
    console.log(`   • Successfully imported: ${importedCount} games`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Categories: ${categoryMap.size}`);
    console.log(`   • Mechanics: ${mechanicMap.size}\n`);

    if (errorCount > 0) {
      console.log('⚠️  Some games failed to import. Check the errors above.\n');
    } else {
      console.log('🎉 All games imported successfully!\n');
    }

  } catch (error) {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importGamesToProduction();

