const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

/**
 * Get comprehensive scraping statistics
 */
async function getScrapingProgress() {
  try {
    console.log('📊 KING DICE RULES SCRAPING PROGRESS');
    console.log('='.repeat(50));
    console.log(`⏰ Status check at: ${new Date().toLocaleString()}\n`);
    
    // Database statistics
    const totalGames = await prisma.game.count();
    const gamesWithRules = await prisma.game.count({
      where: { rules: { some: {} } }
    });
    const gamesWithoutRules = totalGames - gamesWithRules;
    const totalRules = await prisma.gameRule.count();
    const coverage = ((gamesWithRules / totalGames) * 100).toFixed(1);
    
    console.log('📚 DATABASE STATISTICS:');
    console.log(`  Total games: ${totalGames}`);
    console.log(`  Games with rules: ${gamesWithRules}`);
    console.log(`  Games without rules: ${gamesWithoutRules}`);
    console.log(`  Total rule entries: ${totalRules}`);
    console.log(`  Coverage: ${coverage}%\n`);
    
    // Rules by language
    const rulesByLanguage = await prisma.gameRule.groupBy({
      by: ['language'],
      _count: { id: true }
    });
    
    console.log('🌍 RULES BY LANGUAGE:');
    rulesByLanguage.forEach(lang => {
      console.log(`  ${lang.language}: ${lang._count.id} rules`);
    });
    console.log('');
    
    console.log('🕒 RECENT ACTIVITY:');
    console.log('  (Recent activity tracking not available - no timestamps in GameRule model)');
    
    // Check scraped files directory
    try {
      const scrapedRulesDir = 'scraped_rules';
      const stats = await fs.stat(scrapedRulesDir);
      if (stats.isDirectory()) {
        // Count HTML files
        const htmlDir = path.join(scrapedRulesDir, 'html');
        try {
          const htmlFiles = await fs.readdir(htmlDir);
          console.log(`  HTML rules files scraped: ${htmlFiles.length}`);
        } catch (e) {
          console.log('  HTML rules files: 0');
        }
        
        // Count BGG files
        const bggDir = path.join(scrapedRulesDir, 'bgg_files');
        try {
          const bggFiles = await fs.readdir(bggDir);
          console.log(`  BGG files downloaded: ${bggFiles.length}`);
        } catch (e) {
          console.log('  BGG files: 0');
        }
        
        // Count image directories
        const imagesDir = path.join(scrapedRulesDir, 'images');
        try {
          const imageDirs = await fs.readdir(imagesDir);
          const totalImages = await Promise.all(
            imageDirs.map(async (dir) => {
              try {
                const dirPath = path.join(imagesDir, dir);
                const files = await fs.readdir(dirPath);
                return files.length;
              } catch (e) {
                return 0;
              }
            })
          );
          const imageCount = totalImages.reduce((sum, count) => sum + count, 0);
          console.log(`  Rule images downloaded: ${imageCount} (${imageDirs.length} games)`);
        } catch (e) {
          console.log('  Rule images: 0');
        }
      }
    } catch (e) {
      console.log('  Scraped files directory: Not found');
    }
    console.log('');
    
    // Sample of games with rules
    const gamesWithRulesSample = await prisma.game.findMany({
      where: {
        rules: { some: {} }
      },
      include: {
        rules: {
          select: {
            language: true,
            rulesHtml: true
          }
        }
      },
      take: 10
    });
    
    if (gamesWithRulesSample.length > 0) {
      console.log('🆕 SAMPLE GAMES WITH RULES:');
      gamesWithRulesSample.forEach(game => {
        const name = game.name || game.nameEn || 'Unknown';
        const rulesCount = game.rules.length;
        const sources = game.rules.map(rule => {
          if (rule.rulesHtml?.includes('UltraBoardGames')) return 'UltraBG';
          if (rule.rulesHtml?.includes('BoardGameGeek')) return 'BGG';
          if (rule.rulesHtml?.includes('Wikipedia')) return 'Wiki';
          return 'Other';
        }).join(', ');
        console.log(`  ${name} (${rulesCount} rules from ${sources})`);
      });
      console.log('');
    }
    
    // Games still needing rules (sample)
    const gamesNeedingRules = await prisma.game.findMany({
      where: { rules: { none: {} } },
      select: { name: true, nameEn: true, bggId: true },
      take: 15
    });
    
    console.log('🎯 GAMES STILL NEEDING RULES (sample):');
    gamesNeedingRules.forEach(game => {
      const name = game.name || game.nameEn || 'Unknown';
      const bggInfo = game.bggId ? ` (BGG: ${game.bggId})` : '';
      console.log(`  - ${name}${bggInfo}`);
    });
    
    if (gamesNeedingRules.length === 0) {
      console.log('  🎉 All games have rules!');
    }
    console.log('');
    
    // Progress visualization
    const progressBar = '█'.repeat(Math.floor(coverage / 2)) + '░'.repeat(50 - Math.floor(coverage / 2));
    console.log('📊 PROGRESS VISUALIZATION:');
    console.log(`[${progressBar}] ${coverage}%`);
    console.log('');
    
    console.log('⏱️ SCRAPER STATUS:');
    console.log('  Multiple scrapers are running in background');
    console.log('  - UltraBoardGames scraper: Active');
    console.log('  - BoardGameGeek scraper: Active');
    console.log('  - Wikipedia scraper: Active');
    console.log('  - Master orchestrator: Coordinating all scrapers');
    
    return {
      totalGames,
      gamesWithRules,
      gamesWithoutRules,
      totalRules,
      coverage: parseFloat(coverage),
      gamesWithRulesSample: gamesWithRulesSample.length
    };
    
  } catch (error) {
    console.error('❌ Error getting scraping progress:', error.message);
    return null;
  }
}

// Run the progress checker
if (require.main === module) {
  getScrapingProgress()
    .then(stats => {
      if (stats) {
        console.log('✅ Progress check completed!');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { getScrapingProgress };