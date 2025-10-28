const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// These are the top-ranked games from BGG that we might be missing
const topRankedGames = [
  { nameEn: 'Food Chain Magnate', bggId: 175914 },
  { nameEn: 'Star Wars: Rebellion', bggId: 187645 },
  { nameEn: 'The Castles of Burgundy', bggId: 84876 },
  { nameEn: 'The Great Zimbabwe', bggId: 101265 },
  { nameEn: 'Pax Pamir: Second Edition', bggId: 256960 },
  { nameEn: 'High Frontier 4 All', bggId: 328473 },
  { nameEn: 'Madeira', bggId: 147308 },
  { nameEn: 'Ora et Labora', bggId: 102784 },
  { nameEn: 'Historia', bggId: 143695 },
  { nameEn: 'Crokinole', bggId: 521 },
];

async function checkAndAdd() {
  try {
    console.log('🔍 Checking for missing top-ranked games...\n');

    const existingIds = new Set();
    for (const game of topRankedGames) {
      const existing = await prisma.game.findUnique({
        where: { bggId: game.bggId }
      });
      
      if (existing) {
        existingIds.add(game.bggId);
        console.log(`✓ Have: ${game.nameEn} (${game.bggId})`);
      } else {
        console.log(`❌ Missing: ${game.nameEn} (${game.bggId})`);
      }
    }

    console.log(`\n📊 Summary: Have ${existingIds.size}/${topRankedGames.length} games`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndAdd();


