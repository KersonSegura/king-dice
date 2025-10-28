const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Missing games based on ranks that are not in the list
const missingGames = {
  12: 'SETI: Search for Extraterrestrial Intelligence',
  15: 'The Lord of the Rings: Fate of the Fellowship',
  19: 'Vantage',
  24: 'Ark Nova',
  32: 'Lost Ruins of Arnak',
  42: 'Bomb Busters',
  43: 'Terraforming Mars',
  45: 'Castle Combo',
  49: 'Harmonies'
};

async function fixMissingGames() {
  try {
    console.log('🔧 Adding missing games to hotness category...\n');
    
    let addedCount = 0;
    const notFound = [];
    
    for (const [rank, gameName] of Object.entries(missingGames)) {
      const rankNum = parseInt(rank);
      
      // Find the game
      const game = await prisma.game.findFirst({
        where: {
          OR: [
            { nameEn: { equals: gameName, mode: 'insensitive' } },
            { name: { equals: gameName, mode: 'insensitive' } }
          ]
        }
      });
      
      if (game) {
        // Update to hotness with correct rank
        await prisma.game.update({
          where: { id: game.id },
          data: { 
            category: 'hotness',
            hotnessRank: rankNum
          }
        });
        
        console.log(`${rankNum}. ✅ ${gameName} (ID: ${game.id})`);
        addedCount++;
      } else {
        console.log(`${rankNum}. ❌ NOT FOUND: ${gameName}`);
        notFound.push(gameName);
      }
    }
    
    console.log(`\n✅ Updated ${addedCount} missing games`);
    
    if (notFound.length > 0) {
      console.log(`\n❌ Could not find these games:`);
      notFound.forEach(name => console.log(`  - ${name}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingGames();

