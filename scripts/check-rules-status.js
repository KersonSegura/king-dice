const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRulesStatus() {
  try {
    const games = await prisma.game.findMany({
      include: {
        rules: true,
        descriptions: true
      }
    });

    console.log('📊 Rules Status Overview:');
    console.log('========================');
    console.log(`Total games: ${games.length}`);
    console.log(`Games with rules: ${games.filter(g => g.rules.length > 0).length}`);
    console.log(`Games without rules: ${games.filter(g => g.rules.length === 0).length}`);
    
    const rulesCoverage = Math.round((games.filter(g => g.rules.length > 0).length / games.length) * 100);
    console.log(`Rules coverage: ${rulesCoverage}%`);
    
    console.log('\n🎯 Games that need rules:');
    console.log('==========================');
    games.filter(g => g.rules.length === 0).forEach(g => {
      console.log(`- ${g.nameEn} (ID: ${g.id}, BGG ID: ${g.bggId})`);
    });

    console.log('\n✅ Games with rules:');
    console.log('=====================');
    games.filter(g => g.rules.length > 0).forEach(g => {
      const rules = g.rules.find(r => r.language === 'en');
      if (rules) {
        console.log(`- ${g.nameEn}: ${rules.rulesText.length} characters`);
      }
    });

  } catch (error) {
    console.error('Error checking rules status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRulesStatus();
