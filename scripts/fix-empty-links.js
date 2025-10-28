const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixEmptyLinks() {
  try {
    console.log('🔍 Finding games with empty markdown links in rules...\n');
    
    // Find total count
    const totalGames = await prisma.game.count({
      where: {
        rules: {
          some: {}
        }
      }
    });

    console.log(`📋 Found ${totalGames} games with rules to check\n`);

    // Process in batches
    const batchSize = 100;
    let totalProcessed = 0;
    let skip = 0;

    let fixedCount = 0;
    let totalFixes = 0;

    while (totalProcessed < totalGames) {
      const gamesWithRules = await prisma.game.findMany({
        where: {
          rules: {
            some: {}
          }
        },
        select: {
          id: true,
          nameEn: true
        },
        skip: skip,
        take: batchSize
      });

      for (const game of gamesWithRules) {
      // Get rules for this game
      const rules = await prisma.gameRule.findMany({
        where: {
          gameId: game.id
        }
      });

      if (!rules || rules.length === 0) continue;

      let needsUpdate = false;

      for (const rule of rules) {
        let updatedRulesHtml = rule.rulesHtml;
        let updatedRulesText = rule.rulesText;
        let hasChanges = false;

        // Check if rulesHtml has empty markdown links
        if (rule.rulesHtml) {
          const beforeHtml = rule.rulesHtml;
          // Remove empty markdown links like [](link) or [#anchor](link)
          updatedRulesHtml = rule.rulesHtml.replace(/\[\]\([^\)]+\)/g, '');
          // Also handle markdown links with anchors
          updatedRulesHtml = updatedRulesHtml.replace(/\[\([^\)]+\)\]\([^\)]+\)/g, '');
          
          if (beforeHtml !== updatedRulesHtml) {
            console.log(`   📄 Found empty links in rules for: ${game.nameEn}`);
            hasChanges = true;
            needsUpdate = true;
            totalFixes++;
          }
        }

        // Check if rulesText has empty markdown links
        if (rule.rulesText) {
          const beforeText = rule.rulesText;
          // Remove empty markdown links
          updatedRulesText = rule.rulesText.replace(/\[\]\([^\)]+\)/g, '');
          updatedRulesText = updatedRulesText.replace(/\[\([^\)]+\)\]\([^\)]+\)/g, '');
          
          if (beforeText !== updatedRulesText) {
            hasChanges = true;
            needsUpdate = true;
          }
        }

        if (hasChanges) {
          await prisma.gameRule.update({
            where: { id: rule.id },
            data: {
              rulesHtml: updatedRulesHtml,
              rulesText: updatedRulesText
            }
          });
        }
      }

      if (needsUpdate) {
        console.log(`✅ Fixed rules for: ${game.nameEn}`);
        fixedCount++;
      }
      }

      totalProcessed += gamesWithRules.length;
      skip += batchSize;
      console.log(`📊 Processed ${totalProcessed}/${totalGames} games...`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully fixed ${fixedCount} games`);
    console.log(`📄 Total empty links removed: ${totalFixes}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmptyLinks();

