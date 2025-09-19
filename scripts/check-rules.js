const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRules() {
  try {
    console.log('🔍 Checking stored game rules...\n');
    
    const rules = await prisma.gameRule.findMany({
      include: {
        game: true
      }
    });

    if (rules.length === 0) {
      console.log('❌ No rules found in database');
      return;
    }

    console.log(`✅ Found ${rules.length} rule entries:\n`);

    rules.forEach((rule, index) => {
      console.log(`${index + 1}. Game: ${rule.game.nameEn}`);
      console.log(`   Language: ${rule.language}`);
      console.log(`   Rules length: ${rule.rulesText ? rule.rulesText.length : 0} characters`);
      if (rule.rulesText) {
        console.log(`   Preview: ${rule.rulesText.substring(0, 200)}...`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error checking rules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRules();
