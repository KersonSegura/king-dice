const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkGames() {
  try {
    console.log('🔍 Checking games in database...');
    
    // Check total games
    const totalGames = await prisma.game.count();
    console.log(`📊 Total games in database: ${totalGames}`);
    
    // Check games with hotness category
    const hotnessGames = await prisma.game.findMany({
      where: { category: 'hotness' },
      select: { id: true, name: true, bggId: true, bggRating: true, bggRanking: true }
    });
    console.log(`🔥 Hotness games: ${hotnessGames.length}`);
    hotnessGames.forEach(game => {
      console.log(`  - ${game.name} (BGG ID: ${game.bggId}, Rating: ${game.bggRating}, Rank: ${game.bggRanking})`);
    });
    
    // Check games with most-played category
    const mostPlayedGames = await prisma.game.findMany({
      where: { category: 'most-played' },
      select: { id: true, name: true, bggId: true, bggRating: true, bggRanking: true }
    });
    console.log(`🎯 Most-played games: ${mostPlayedGames.length}`);
    mostPlayedGames.forEach(game => {
      console.log(`  - ${game.name} (BGG ID: ${game.bggId}, Rating: ${game.bggRating}, Rank: ${game.bggRanking})`);
    });
    
    // Check games with images (fallback)
    const gamesWithImages = await prisma.game.findMany({
      where: {
        OR: [
          { image: { not: null } },
          { imageUrl: { not: null } }
        ]
      },
      select: { id: true, name: true, bggId: true, bggRating: true, bggRanking: true },
      take: 5
    });
    console.log(`🖼️ Games with images (first 5): ${gamesWithImages.length}`);
    gamesWithImages.forEach(game => {
      console.log(`  - ${game.name} (BGG ID: ${game.bggId}, Rating: ${game.bggRating}, Rank: ${game.bggRanking})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGames();
