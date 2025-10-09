#!/usr/bin/env node

/**
 * Update UltraBoardGames Credits Script
 * 
 * This script finds all games with UltraBoardGames.com credits in their rules
 * and replaces them with the new standardized format.
 * 
 * Usage: node scripts/update-ultraboardgames-credits.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateCredits() {
  console.log('🔍 Finding games with UltraBoardGames.com credits...\n');

  try {
    // Find all game rules that contain "UltraBoardGames"
    const rulesWithCredits = await prisma.gameRule.findMany({
      where: {
        OR: [
          { rulesText: { contains: 'UltraBoardGames', mode: 'insensitive' } },
          { rulesText: { contains: 'Ultra BoardGames', mode: 'insensitive' } },
        ]
      },
      include: {
        game: {
          select: {
            id: true,
            nameEn: true,
            nameEs: true
          }
        }
      }
    });

    if (rulesWithCredits.length === 0) {
      console.log('✅ No games found with UltraBoardGames.com credits.');
      return;
    }

    console.log(`📋 Found ${rulesWithCredits.length} game(s) with UltraBoardGames.com credits:\n`);

    let updatedCount = 0;

    for (const rule of rulesWithCredits) {
      console.log(`\n📝 Processing: ${rule.game.nameEn} (ID: ${rule.game.id})`);
      
      let updatedRules = rule.rulesText;
      
      // Remove various formats of credits that might exist
      const creditsPatterns = [
        // Old format variations
        /\n*Credits to UltraBoardGames\.com\s*/gi,
        /\n*Credits: UltraBoardGames\.com\s*/gi,
        /\n*Source: UltraBoardGames\.com\s*/gi,
        /\n*Rules from UltraBoardGames\.com\s*/gi,
        /\n*UltraBoardGames\.com\s*/gi,
        /\n*Ultra BoardGames\.com\s*/gi,
        // New format (in case it's already there)
        /\n*---\n*\n*<em>Rules source: UltraBoardGames\.com<\/em>\s*/gi,
        // HTML variations
        /\n*<p>Credits to UltraBoardGames\.com<\/p>\s*/gi,
        /\n*<p>Source: UltraBoardGames\.com<\/p>\s*/gi,
      ];

      // Remove all credit patterns
      for (const pattern of creditsPatterns) {
        updatedRules = updatedRules.replace(pattern, '');
      }

      // Clean up any trailing whitespace and multiple line breaks
      updatedRules = updatedRules.trim();
      
      // Add the new standardized format at the end
      const newCredits = '\n\n---\n\n<em>Rules source: UltraBoardGames.com</em>';
      updatedRules += newCredits;

      // Update the database
      await prisma.gameRule.update({
        where: { id: rule.id },
        data: {
          rulesText: updatedRules,
          rulesHtml: `<div class="game-rules">${updatedRules.replace(/\n/g, '<br>')}</div>`
        }
      });

      console.log(`   ✅ Updated credits for "${rule.game.nameEn}"`);
      updatedCount++;
    }

    console.log(`\n\n✨ Successfully updated ${updatedCount} game(s)!\n`);
    console.log('📋 Summary:');
    console.log(`   • Total games processed: ${rulesWithCredits.length}`);
    console.log(`   • Successfully updated: ${updatedCount}`);
    console.log('\n✅ All credits have been standardized!\n');

  } catch (error) {
    console.error('❌ Error updating credits:', error);
    console.error('\nDetails:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateCredits();

