const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugDBDescriptions() {
  try {
    console.log('🔍 Checking database descriptions directly...\n');
    
    // Get first 3 games with their descriptions
    const games = await prisma.game.findMany({
      include: {
        descriptions: true
      },
      take: 3,
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`📊 Found ${games.length} games\n`);
    
    games.forEach((game, index) => {
      console.log(`--- Game ${index + 1}: ${game.nameEn} ---`);
      console.log(`ID: ${game.id}`);
      
      if (game.descriptions && game.descriptions.length > 0) {
        console.log(`✅ Descriptions: ${game.descriptions.length}`);
        game.descriptions.forEach((desc, descIndex) => {
          console.log(`  Description ${descIndex + 1}:`);
          console.log(`    Language: ${desc.language}`);
          console.log(`    Short EN: ${desc.shortDescriptionEn ? `"${desc.shortDescriptionEn.substring(0, 100)}..."` : 'NULL'}`);
          console.log(`    Full EN: ${desc.fullDescriptionEn ? `"${desc.fullDescriptionEn.substring(0, 100)}..."` : 'NULL'}`);
          console.log(`    Short ES: ${desc.shortDescriptionEs ? `"${desc.shortDescriptionEs.substring(0, 100)}..."` : 'NULL'}`);
          console.log(`    Full ES: ${desc.fullDescriptionEs ? `"${desc.fullDescriptionEs.substring(0, 100)}..."` : 'NULL'}`);
        });
      } else {
        console.log('❌ No descriptions');
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDBDescriptions();
