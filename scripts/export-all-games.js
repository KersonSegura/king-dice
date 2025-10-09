const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportAllGames() {
  try {
    console.log('🔍 Fetching all games from local database...\n');

    // Fetch all games with all related data
    const games = await prisma.game.findMany({
      include: {
        descriptions: true,
        rules: true,
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
        baseGameExpansions: true,
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`✅ Found ${games.length} games in local database\n`);

    // Also fetch all categories and mechanics to ensure they exist in production
    const categories = await prisma.category.findMany();
    const mechanics = await prisma.mechanic.findMany();

    console.log(`📋 Found ${categories.length} categories`);
    console.log(`⚙️  Found ${mechanics.length} mechanics\n`);

    // Create export data structure
    const exportData = {
      exportDate: new Date().toISOString(),
      totalGames: games.length,
      totalCategories: categories.length,
      totalMechanics: mechanics.length,
      categories,
      mechanics,
      games: games.map(game => ({
        // Game data
        bggId: game.bggId,
        nameEn: game.nameEn,
        nameEs: game.nameEs,
        yearRelease: game.yearRelease,
        designer: game.designer,
        developer: game.developer,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        durationMinutes: game.durationMinutes,
        imageUrl: game.imageUrl,
        thumbnailUrl: game.thumbnailUrl,
        name: game.name,
        year: game.year,
        minPlayTime: game.minPlayTime,
        maxPlayTime: game.maxPlayTime,
        image: game.image,
        expansions: game.expansions,
        category: game.category,
        userRating: game.userRating,
        userVotes: game.userVotes,
        
        // Related data
        descriptions: game.descriptions,
        rules: game.rules,
        categories: game.gameCategories.map(gc => ({
          nameEn: gc.category.nameEn,
          nameEs: gc.category.nameEs,
          descriptionEn: gc.category.descriptionEn,
          descriptionEs: gc.category.descriptionEs,
        })),
        mechanics: game.gameMechanics.map(gm => ({
          nameEn: gm.mechanic.nameEn,
          nameEs: gm.mechanic.nameEs,
          descriptionEn: gm.mechanic.descriptionEn,
          descriptionEs: gm.mechanic.descriptionEs,
        })),
        expansionsList: game.baseGameExpansions,
      }))
    };

    // Save to JSON file
    const exportPath = path.join(__dirname, 'games-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`✅ Export completed successfully!`);
    console.log(`📁 File saved to: ${exportPath}`);
    console.log(`📊 File size: ${(fs.statSync(exportPath).size / 1024 / 1024).toFixed(2)} MB\n`);
    
    console.log('📋 Summary:');
    console.log(`   • Total games: ${games.length}`);
    console.log(`   • Games with descriptions: ${games.filter(g => g.descriptions.length > 0).length}`);
    console.log(`   • Games with rules: ${games.filter(g => g.rules.length > 0).length}`);
    console.log(`   • Games with categories: ${games.filter(g => g.gameCategories.length > 0).length}`);
    console.log(`   • Games with mechanics: ${games.filter(g => g.gameMechanics.length > 0).length}\n`);
    
    console.log('✨ Ready to import to production!\n');

  } catch (error) {
    console.error('❌ Error exporting games:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportAllGames();

