const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAPIQuery() {
  try {
    console.log('🔍 Testing the exact API query...\n');
    
    // Use the exact same query as the API
    const games = await prisma.game.findMany({
      include: {
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
        descriptions: true,
        rules: true,
        baseGameExpansions: true,
      },
      orderBy: [
        { yearRelease: 'desc' },
        { nameEn: 'asc' }
      ],
      take: 3
    });
    
    console.log(`📊 Found ${games.length} games\n`);
    
    games.forEach((game, index) => {
      console.log(`--- Game ${index + 1}: ${game.nameEn} ---`);
      console.log(`ID: ${game.id}`);
      console.log(`Year: ${game.yearRelease}`);
      console.log(`Designer: ${game.designer || 'null'}`);
      console.log(`Developer: ${game.developer || 'null'}`);
      
      // Check descriptions
      if (game.descriptions && game.descriptions.length > 0) {
        console.log(`✅ Descriptions: ${game.descriptions.length}`);
        game.descriptions.forEach((desc, descIndex) => {
          console.log(`  Description ${descIndex + 1}:`);
          console.log(`    Language: ${desc.language || 'unknown'}`);
          console.log(`    Short: ${desc.shortDescription ? `"${desc.shortDescription.substring(0, 50)}..."` : 'NULL'}`);
          console.log(`    Full: ${desc.fullDescription ? `"${desc.fullDescription.substring(0, 50)}..."` : 'NULL'}`);
        });
      } else {
        console.log('❌ No descriptions array or empty');
      }
      
      // Check rules
      if (game.rules && game.rules.length > 0) {
        console.log(`✅ Rules: ${game.rules.length}`);
        game.rules.forEach((rule, ruleIndex) => {
          console.log(`  Rule ${ruleIndex + 1}:`);
          console.log(`    Language: ${rule.language}`);
          console.log(`    Text length: ${rule.rulesText ? rule.rulesText.length : 'null'}`);
        });
      } else {
        console.log('❌ No rules array or empty');
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error testing API query:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugAPIQuery();
